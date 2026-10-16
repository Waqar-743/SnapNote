"""Run the real desktop Tauri window through tauri-driver, with an isolated profile.

Usage: xvfb-run -a dbus-run-session -- python3 scripts/native-smoke.py
Requires tauri-driver, WebKitWebDriver, xclip, xdotool, Tesseract and a built app.
Linux uses a temporary profile and virtual clipboard. Windows runs only in CI with the separate test application identifier.
"""
import base64
import http.client
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

WINDOWS = os.name == 'nt'
if WINDOWS and os.environ.get('SNAPNOTE_WINDOWS_CI') != '1':
    raise SystemExit('Windows native smoke tests require the isolated CI test build.')
ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = Path(os.environ.get('SNAPNOTE_TEST_ARTIFACTS', ROOT.parent / 'docs' / 'testing'))
PROFILE = Path(tempfile.mkdtemp(prefix='snapnote-native-'))
ENV = dict(os.environ, XDG_DATA_HOME=str(PROFILE / 'data'), XDG_CONFIG_HOME=str(PROFILE / 'config'), WEBKIT_DISABLE_COMPOSITING_MODE='1')
(PROFILE / 'config').mkdir()
(PROFILE / 'downloads').mkdir()
(PROFILE / 'config' / 'user-dirs.dirs').write_text(f'XDG_DOWNLOAD_DIR="{PROFILE / "downloads"}"\n')
DRIVER = os.environ.get('TAURI_DRIVER') or shutil.which('tauri-driver') or '/tmp/snapnote-cargo/bin/tauri-driver'
BASE = 'http://127.0.0.1:4444'
SESSION = None
RESULTS = []

def request(method, path, body=None):
    req = urllib.request.Request(BASE + path, data=json.dumps(body).encode() if body is not None else None, method=method, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            value = json.load(response).get('value')
    except urllib.error.HTTPError as error:
        raise RuntimeError(error.read().decode()) from error
    if isinstance(value, dict) and 'error' in value:
        raise RuntimeError(value)
    return value

def command(path, body=None, method='POST'):
    return request(method, f'/session/{SESSION}/{path}', body)

def js(script, *args):
    return command('execute/sync', {'script': script, 'args': list(args)})

def invoke(name, args=None):
    result = command('execute/async', {'script': 'const done=arguments[arguments.length-1]; window.__TAURI_INTERNALS__.invoke(arguments[0],arguments[1]).then(value=>done({ok:true,value})).catch(error=>done({ok:false,error:String(error)}));', 'args': [name, args or {}]})
    if not result['ok']:
        raise RuntimeError(result['error'])
    return result.get('value')

def wait(script, expected=True, timeout=15):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        try:
            if js(script) == expected:
                return
        except (http.client.RemoteDisconnected, ConnectionResetError):
            # Retry read-only polling after a transient native-driver disconnect.
            # Never repeat a mutating UI action or an IPC command automatically.
            pass
        time.sleep(.15)
    raise AssertionError(f'Timed out: {script}; page: {js("return document.body.innerText")[:1500]}')

def click(selector):
    element = command('element', {'using': 'css selector', 'value': selector})
    key = element['element-6066-11e4-a52e-4f735466cecf']
    command(f'element/{key}/click', {})

def powershell(code):
    encoded = base64.b64encode(code.encode('utf-16le')).decode()
    return subprocess.check_output(['powershell.exe', '-NoProfile', '-STA', '-EncodedCommand', encoded], timeout=20)

def hotkey(linux, windows):
    if WINDOWS:
        powershell('Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(' + repr(windows) + ')')
    else:
        subprocess.run(['xdotool', 'key', '--clearmodifiers', linux], check=True)

def fill(selector, text):
    element = command('element', {'using': 'css selector', 'value': selector})
    key = element['element-6066-11e4-a52e-4f735466cecf']
    if not WINDOWS:
        windows = subprocess.check_output(['xdotool', 'search', '--onlyvisible', '--name', '^SnapNote$']).decode().splitlines()
        subprocess.run(['xdotool', 'windowfocus', windows[0]], check=True)
    command(f'element/{key}/click', {})
    if WINDOWS:
        command(f'element/{key}/clear', {})
        if text:
            command(f'element/{key}/value', {'text': text})
    else:
        subprocess.run(['xdotool', 'key', '--clearmodifiers', 'ctrl+a', 'BackSpace'], check=True)
        if text:
            subprocess.run(['xdotool', 'type', '--clearmodifiers', '--delay', '10', '--', text], check=True)
    wait(f'return document.querySelector({json.dumps(selector)}).value', text, timeout=5)

def type_text(text):
    if WINDOWS:
        # Use an encoded PowerShell command so no text is interpreted by the shell.
        escaped = ''.join('{' + c + '}' if c in '+^%~(){}' else c for c in text)
        powershell('Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(' + repr(escaped) + ')')
    else:
        subprocess.run(['xdotool', 'type', '--clearmodifiers', '--delay', '10', '--', text], check=True)

def drag_canvas(start, end):
    rect = js('const r=document.querySelector("canvas").getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};')
    command('actions', {'actions': [{'type': 'pointer', 'id': 'mouse', 'parameters': {'pointerType': 'mouse'}, 'actions': [
        {'type': 'pointerMove', 'duration': 0, 'origin': 'viewport', 'x': int(rect['x'] + rect['width'] * start[0]), 'y': int(rect['y'] + rect['height'] * start[1])},
        {'type': 'pointerDown', 'button': 0},
        {'type': 'pointerMove', 'duration': 250, 'origin': 'viewport', 'x': int(rect['x'] + rect['width'] * end[0]), 'y': int(rect['y'] + rect['height'] * end[1])},
        {'type': 'pointerUp', 'button': 0},
    ]}]})

def clipboard(data, image=False):
    if WINDOWS:
        fixture = PROFILE / ('clipboard.png' if image else 'clipboard.txt')
        fixture.write_bytes(data if isinstance(data, bytes) else data.encode())
        path_literal = "'" + str(fixture).replace("'", "''") + "'"
        setup = 'Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $bytes=[IO.File]::ReadAllBytes(' + path_literal + '); '
        if image:
            powershell(setup + '$stream=[IO.MemoryStream]::new($bytes); $image=[Drawing.Image]::FromStream($stream); [Windows.Forms.Clipboard]::SetImage($image); $image.Dispose(); $stream.Dispose();')
        else:
            powershell(setup + '[Windows.Forms.Clipboard]::SetText([Text.Encoding]::UTF8.GetString($bytes));')
    else:
        args = ['xclip', '-selection', 'clipboard']
        if image:
            args += ['-t', 'image/png']
        subprocess.run(args, input=data if isinstance(data, bytes) else data.encode(), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True, timeout=5)

def clipboard_text():
    if WINDOWS:
        return powershell('Add-Type -AssemblyName System.Windows.Forms; [Console]::OutputEncoding=[Text.Encoding]::UTF8; [Console]::Write([Windows.Forms.Clipboard]::GetText());').decode('utf-8-sig')
    return subprocess.check_output(['xclip', '-selection', 'clipboard', '-o']).decode()

def wait_clipboard(expected):
    end = time.monotonic() + 8
    while time.monotonic() < end:
        if clipboard_text() == expected:
            return
        time.sleep(.1)
    raise AssertionError('System clipboard did not reach the expected content')

def record(name):
    RESULTS.append(name)
    print('PASS:', name, flush=True)

def new_session():
    global SESSION
    value = request('POST', '/session', {'capabilities': {'alwaysMatch': {'tauri:options': {'application': str(ROOT / 'src-tauri' / 'target' / 'debug' / ('snapnote.exe' if WINDOWS else 'snapnote'))}}}})
    SESSION = value['sessionId']
    command('timeouts', {'script': 30000, 'pageLoad': 30000})
    if WINDOWS:
        assert invoke('plugin:app|identifier') == 'come.codespace.snapnote.tests', 'Refusing to test the normal Windows data profile'
    wait('return Boolean(document.querySelector(".workspace-shell, .unlock-input"))', timeout=25)

def end_session():
    global SESSION
    if SESSION:
        request('DELETE', f'/session/{SESSION}')
        SESSION = None

log = open(PROFILE / 'driver.log', 'w')
driver_args = [DRIVER, '--port', '4444']
if WINDOWS and os.environ.get('EDGEWEBDRIVER'):
    driver_args += ['--native-driver', str(Path(os.environ['EDGEWEBDRIVER']) / 'msedgedriver.exe')]
driver = subprocess.Popen(driver_args, env=ENV, stdout=log, stderr=log, start_new_session=not WINDOWS)
try:
    for _ in range(100):
        try:
            request('GET', '/status')
            break
        except Exception:
            time.sleep(.1)
    new_session()
    assert js('return document.querySelector("h1").textContent') == 'Clipboard'
    record('Native app opens with capture paused and no sample data')

    exact = '  <b>Literal clipboard text</b>\n    keep indentation\n'
    clipboard(exact)
    assert invoke('read_clipboard') == {'type': 'text', 'data': exact}
    click('[aria-label="Enable capture"]')
    wait('return document.querySelectorAll(".clip-card").length', 1)
    assert js('return document.querySelector(".clip-preview pre").textContent') == exact
    time.sleep(1.2)
    assert js('return document.querySelectorAll(".clip-card").length') == 1
    record('Real text clipboard capture, whitespace preservation, and duplicate suppression')

    click('[aria-label="Pause capture"]')
    clipboard('Must remain private while paused')
    time.sleep(1.3)
    assert js('return document.querySelectorAll(".clip-card").length') == 1
    invoke('write_clipboard', {'payload': {'type': 'text', 'data': exact}})
    copied = clipboard_text()
    assert copied == exact
    record('Pause stops automatic capture; native copy-back preserves exact text')

    image = js('const c=document.createElement("canvas");c.width=1200;c.height=240;const x=c.getContext("2d");x.fillStyle="white";x.fillRect(0,0,c.width,c.height);x.fillStyle="black";x.font="bold 54px sans-serif";x.fillText("SNAPNOTE TEST CLIPBOARD",35,135);return c.toDataURL("image/png");')
    clipboard(base64.b64decode(image.split(',')[1]), image=True)
    payload = invoke('read_clipboard')
    assert payload['type'] == 'image'
    invoke('write_clipboard', {'payload': payload})
    assert invoke('read_clipboard') == payload
    text = invoke('extract_text_from_image', {'base64Data': image})
    assert 'SNAPNOTE' in text.upper() and 'CLIPBOARD' in text.upper(), text
    record('Real image clipboard round-trip and offline OCR')

    click('.button.primary')
    wait('return document.querySelectorAll(".clip-card").length', 2)
    click('.clip-card .clip-preview')
    click('.image-action-grid .button')
    wait('return Boolean(document.querySelector(`[aria-label="Extracted text"]`))')
    fill('[aria-label="Search clips"]', 'SNAPNOTE')
    wait('return document.querySelectorAll(".clip-card").length', 1)
    record('OCR results persist as searchable clip metadata')
    fill('[aria-label="Search clips"]', '')
    click('.clip-card .clip-preview')
    js('Array.from(document.querySelectorAll(".image-action-grid button")).find(b=>b.textContent.includes("Edit image")).click();')
    wait('return Boolean(document.querySelector("canvas"))')
    wait('return Boolean(document.querySelector(".image-tools > button:not([disabled])"))')
    # WebDriver pointer actions exercise actual pointer capture, not synthetic DOM events.
    rect = js('const r=document.querySelector("canvas").getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};')
    before = js('return document.querySelector("canvas").toDataURL();')
    command('actions', {'actions': [{'type': 'pointer', 'id': 'mouse', 'parameters': {'pointerType': 'mouse'}, 'actions': [
        {'type': 'pointerMove', 'duration': 0, 'origin': 'viewport', 'x': int(rect['x'] + 20), 'y': int(rect['y'] + 20)},
        {'type': 'pointerDown', 'button': 0},
        {'type': 'pointerMove', 'duration': 250, 'origin': 'viewport', 'x': int(rect['x'] + 80), 'y': int(rect['y'] + 50)},
        {'type': 'pointerUp', 'button': 0},
    ]}]})
    assert js('return document.querySelector("canvas").toDataURL();') != before
    click('.image-tools > .button')
    wait('return document.querySelectorAll(".clip-card").length', 3)
    record('Image annotation creates a new clip while preserving the original')
    js('Array.from(document.querySelectorAll(".image-action-grid button")).find(b=>b.textContent.includes("Edit image")).click();')
    wait('return Boolean(document.querySelector(".image-tools > button:not([disabled])"))')
    js('Array.from(document.querySelectorAll(".image-tools-bar button")).find(b=>b.textContent.includes("Crop")).click();')
    drag_canvas((.1, .1), (.65, .8))
    js('Array.from(document.querySelectorAll(".image-tools-bar button")).find(b=>b.textContent.includes("Apply crop")).click();')
    assert js('return document.querySelector("canvas").width') < 1200
    click('.image-tools > .button')
    wait('return document.querySelectorAll(".clip-card").length', 4)
    record('Crop uses the selected image region and keeps the original clip')

    main_window = command('window', method='GET')
    invoke('pin_image', {'data': image})
    end = time.monotonic() + 10
    while time.monotonic() < end:
        handles = command('window/handles', method='GET')
        if len(handles) > 1:
            break
        time.sleep(.2)
    assert len(handles) > 1, 'Pinned native window was not created'
    pinned_window = next(handle for handle in handles if handle != main_window)
    command('window', {'handle': pinned_window})
    wait('return Boolean(document.querySelector(".pinned-image img"))')
    hotkey('ctrl+alt+o', '^%o')
    command('window', {'handle': main_window})
    wait('return document.hasFocus()')
    command('window', {'handle': pinned_window})
    command('window', method='DELETE')
    command('window', {'handle': main_window})
    record('Pin creates an image-only native window; show-app shortcut returns focus')


    # Exercise the global capture shortcut and literal insertion in the retained editor.
    literal = '  <script>literal only</script>\n  second line\n'
    clipboard(literal)
    hotkey('ctrl+alt+c', '^%c')
    wait('return Boolean(document.querySelector(".tiptap-editor"))')
    wait('return document.querySelector(".tiptap-editor").textContent.includes("literal only")')
    assert js('return document.querySelector(".tiptap-editor script") === null')
    record('Global capture shortcut inserts literal text into the active rich note')
    js('Array.from(document.querySelectorAll(".nav-item")).find(b=>b.textContent.includes("Clipboard")).click();')
    js('Array.from(document.querySelectorAll(".nav-item")).find(b=>b.textContent.includes("Notes")).click();')
    wait('return Boolean(document.querySelector(".tiptap-editor"))')
    assert js('return document.querySelector(".tiptap-editor").textContent.split("literal only").length - 1') == 1
    record('Switching views does not reinsert an already consumed capture')
    click('.tiptap-editor')
    hotkey('ctrl+End', '^{END}')
    click('[aria-label="Bold"]')
    type_text(' BOLD')
    wait('return document.querySelector(".tiptap-editor").textContent.includes("BOLD")')
    wait('return Boolean(document.querySelector(".tiptap-editor strong"))')
    click('[aria-label="Undo"]')
    wait('return !document.querySelector(".tiptap-editor").textContent.includes("BOLD")')
    click('[aria-label="Redo"]')
    wait('return document.querySelector(".tiptap-editor").textContent.includes("BOLD")')
    record('Retained rich editor supports formatting, undo, and redo')
    clipboard(base64.b64decode(image.split(',')[1]), image=True)
    click('.tiptap-editor')
    hotkey('ctrl+End', '^{END}')
    hotkey('ctrl+v', '^v')
    wait('return Boolean(document.querySelector(".tiptap-editor img"))')
    wait('return document.querySelector(".tiptap-editor img").getAttribute("src").startsWith("data:image/")')
    click('.ocr-button')
    wait('return document.querySelector(".tiptap-editor").textContent.includes("SNAPNOTE")', timeout=20)
    record('Original image paste and inline OCR still work in notes')

    click('[aria-label="New note"]')
    wait('return document.querySelectorAll(".note-tab").length', 2)
    click('.note-tab.active [title="Rename note"]')
    fill('[aria-label="Note name"]', 'Project brief')
    hotkey('Return', '{ENTER}')
    wait('return document.querySelector(".note-tab.active").textContent.includes("Project brief")')
    click('.tiptap-editor')
    type_text('A clear place for the next idea')
    wait('return document.querySelector(".tiptap-editor").textContent.includes("A clear place for the next idea")')
    click('.tiptap-editor')
    hotkey('ctrl+End', '^{END}')
    click('[aria-label="Heading 1"]')
    wait('return Boolean(document.querySelector(".tiptap-editor h1"))')
    click('.tiptap-editor')
    hotkey('ctrl+End', '^{END}')
    hotkey('Return', '{ENTER}')
    click('[aria-label="Task list"]')
    type_text('Collect the useful details')
    wait('return document.querySelector(".tiptap-editor").textContent.includes("Collect the useful details")')
    wait('return Boolean(document.querySelector(".tiptap-editor [data-type=taskList] input"))')
    click('.tiptap-editor [data-type=taskList] input')
    wait('return document.querySelector(".tiptap-editor [data-type=taskList] input").checked')
    fill('[aria-label="Search notes"]', 'SNAPNOTE')
    wait('return document.querySelectorAll(".note-tab").length', 1)
    click('.note-tab [role="tab"]')
    wait('return document.querySelector(".tiptap-editor").textContent.includes("SNAPNOTE")')
    fill('[aria-label="Search notes"]', 'Project brief')
    wait('return document.querySelectorAll(".note-tab").length', 1)
    click('.note-tab [role="tab"]')
    wait('return document.querySelector(".tiptap-editor").textContent.includes("Collect the useful details")')
    click('[aria-label="Close Project brief"]')
    command('alert/accept', {})
    fill('[aria-label="Search notes"]', '')
    wait('return document.querySelectorAll(".note-tab").length', 1)
    wait('return document.querySelector(".tiptap-editor").textContent.includes("SNAPNOTE")')
    record('Notes can be created, renamed, formatted with headings and tasks, searched and safely closed')


    hotkey('alt+s', '%s')
    wait('return document.querySelector(".workspace-shell").classList.contains("quick-mode")')
    assert js('return window.innerWidth') <= 600
    js('Array.from(document.querySelectorAll("button")).find(b=>b.textContent.includes("Open workspace")).click();')
    wait('return !document.querySelector(".workspace-shell").classList.contains("quick-mode")')
    record('Alt+S opens the real floating quick-access window and restores workspace size')


    click('[aria-label="New folder"]')
    command('alert/text', {'text': 'Research'})
    command('alert/accept', {})
    wait('return document.querySelector("h1").textContent', 'Research')
    js('Array.from(document.querySelectorAll(".nav-item")).find(b=>b.textContent.includes("Clipboard")).click();')
    fill('[aria-label="Search clips"]', 'literal only')
    wait('return document.querySelectorAll(".clip-card").length', 1)
    click('.clip-preview')
    fill('input[placeholder="work, research, useful"]', 'research, guide')
    click('.detail-heading')
    js('const select=document.querySelector(".detail-pane select"); select.value=Array.from(select.options).find(o=>o.textContent==="Research").value; select.dispatchEvent(new Event("change",{bubbles:true}));')
    click('.detail-pane .check-label input')
    fill('[aria-label="Clip text"]', 'Hello {{name}}, your workspace is ready.')
    click('.detail-pane .button.primary')
    command('alert/text', {'text': 'Alex'})
    command('alert/accept', {})
    wait('return document.body.textContent.includes("Copied. Paste it into any app.")')
    wait_clipboard('Hello Alex, your workspace is ready.')
    assert js('return document.querySelector(".detail-text").value') == 'Hello {{name}}, your workspace is ready.'
    record('Folder assignment, tags, and reusable template substitution')
    fill('[aria-label="Search clips"]', 'guide')
    wait('return document.querySelectorAll(".clip-card").length', 1)
    click('[aria-label="Add favorite"]')
    click('[aria-label="Close details"]')
    fill('[aria-label="Search clips"]', '')
    wait('return document.querySelectorAll(".clip-card").length', 5)
    js('Array.from(document.querySelectorAll(".clip-card")).filter(c=>c.querySelector("pre")).forEach(c=>c.querySelector("input[type=checkbox]").click());')
    wait('return document.querySelector(".selection-bar strong").textContent', '2 selected')
    expected_combined = js('return Array.from(document.querySelectorAll(".clip-preview pre")).map(p=>p.textContent).join("\\n\\n");')
    js('Array.from(document.querySelectorAll(".selection-bar button")).find(b=>b.textContent.includes("Copy text together")).click();')
    wait('return document.body.textContent.includes("Copied. Paste it into any app.")')
    wait_clipboard(expected_combined)
    js('Array.from(document.querySelectorAll(".selection-bar button")).find(b=>b.textContent.includes("Group in session")).click();')
    command('alert/text', {'text': 'Research session'})
    command('alert/accept', {})
    wait('return document.querySelector("h1").textContent', 'Research session')
    wait('return document.querySelectorAll(".clip-card").length', 2)
    record('Multi-item copying and grouping selected content in a session')
    js('Array.from(document.querySelectorAll(".nav-item")).find(b=>b.textContent.includes("Clipboard")).click();')
    wait('return document.body.textContent.includes("Saved on this device")')

    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    (ARTIFACTS / 'native-workspace.png').write_bytes(base64.b64decode(command('screenshot', method='GET')))
    click('[aria-label="Toggle theme"]')
    assert js('return document.documentElement.classList.contains("dark")')
    wait('return document.body.textContent.includes("Saved on this device")')
    (ARTIFACTS / 'native-workspace-dark.png').write_bytes(base64.b64decode(command('screenshot', method='GET')))
    record('Light and dark native workspace screenshots captured')

    js('Array.from(document.querySelectorAll(".nav-item")).find(b=>b.textContent.includes("Settings")).click();')
    fill('input[placeholder="At least 10 characters"]', 'native test password 12345')
    fill('input[placeholder="Repeat the workspace password"]', 'native test password 12345')
    js('Array.from(document.querySelectorAll(".modal button")).find(b=>b.textContent.includes("Enable workspace encryption")).click();')
    command('alert/accept', {})
    wait('return document.body.textContent.includes("Your local workspace is now password encrypted.")', timeout=25)
    fill('input[placeholder*="10+ characters"]', 'backup test password 12345')
    js('Array.from(document.querySelectorAll(".modal button")).find(b=>b.textContent.includes("Export backup")).click();')
    wait('return document.body.textContent.includes("Backup saved:")', timeout=20)
    backup_path = Path(js('return (document.querySelector(".dialog-notice") || document.querySelector(".notice-banner span")).textContent').removeprefix('Backup saved: '))
    assert backup_path.exists()
    assert json.loads(backup_path.read_text())['format'] == 'snapnote-encrypted-v1'
    record('Live workspace encryption and encrypted native backup export')
    invoke('pin_image', {'data': image})
    wait('return document.body.textContent.includes("Saved on this device")')
    js('Array.from(document.querySelectorAll(".modal button")).find(b=>b.textContent.includes("Lock workspace now")).click();')
    wait('return Boolean(document.querySelector(".unlock-input"))')
    assert len(command('window/handles', method='GET')) == 1, 'Locked workspace left a private image visible'
    clipboard('PRIVATE WHILE LOCKED')
    hotkey('ctrl+alt+c', '^%c')
    time.sleep(.5)
    assert js('return Boolean(document.querySelector(".unlock-input"))')
    fill('[aria-label="Workspace password"]', 'native test password 12345')
    click('button[type="submit"]')
    wait('return Boolean(document.querySelector(".workspace-shell"))')
    assert 'PRIVATE WHILE LOCKED' not in js('return document.body.textContent')
    record('Manual lock closes private image pins and ignores capture shortcuts until unlock')
    wait('return document.body.textContent.includes("Saved on this device")')
    end_session()
    new_session()
    assert js('return Boolean(document.querySelector(".unlock-input"))')
    fill('[aria-label="Workspace password"]', 'wrong password')
    click('button[type="submit"]')
    wait('return document.body.textContent.includes("Could not unlock")')
    fill('[aria-label="Workspace password"]', 'native test password 12345')
    click('button[type="submit"]')
    wait('return Boolean(document.querySelector(".workspace-shell"))')
    assert js('return document.querySelectorAll(".clip-card").length') >= 3
    assert js('return document.documentElement.classList.contains("dark")')
    record('Native relaunch stays locked; wrong password fails; correct password restores clips and theme')
    js('Array.from(document.querySelectorAll(".nav-item")).find(b=>b.textContent.includes("Notes")).click();')
    wait('return Boolean(document.querySelector(".tiptap-editor"))')
    content = js('return document.querySelector(".tiptap-editor").textContent')
    assert all(value in content for value in ['literal only', 'BOLD', 'SNAPNOTE'])
    assert js('return document.querySelector(".tiptap-editor img").getAttribute("src").startsWith("data:image/")')
    js('Array.from(document.querySelectorAll(".nav-item")).find(b=>b.textContent.includes("Clipboard")).click();')
    record('Rich note text, formatting and embedded images survive encrypted desktop relaunch')
    js('Array.from(document.querySelectorAll(".nav-item")).find(b=>b.textContent.includes("Settings")).click();')
    js('Array.from(document.querySelectorAll(".modal button")).find(b=>b.textContent.includes("Clear recent history")).click();')
    command('alert/accept', {})
    click('[aria-label="Close dialog"]')
    wait('return document.querySelectorAll(".clip-card").length', 2)
    record('Clear history preserves favorites, snippets, grouped clips, and notes')
    js('Array.from(document.querySelectorAll(".nav-item")).find(b=>b.textContent.includes("Settings")).click();')
    fill('input[placeholder*="10+ characters"]', 'backup test password 12345')
    file_input = command('element', {'using': 'css selector', 'value': 'input[type=file]'})['element-6066-11e4-a52e-4f735466cecf']
    command(f'element/{file_input}/value', {'text': str(backup_path)})
    wait('return document.body.textContent.includes("Backup merged. Existing notes were preserved.")', timeout=20)
    click('[aria-label="Close dialog"]')
    wait('return document.querySelectorAll(".clip-card").length', 5)
    record('Encrypted import restores cleared clips without duplicating organized content')

    invalid_backup = PROFILE / 'invalid-backup.json'
    invalid_backup.write_text('{ not valid JSON')
    js('Array.from(document.querySelectorAll(".nav-item")).find(b=>b.textContent.includes("Settings")).click();')
    file_input = command('element', {'using': 'css selector', 'value': 'input[type=file]'})['element-6066-11e4-a52e-4f735466cecf']
    command(f'element/{file_input}/value', {'text': str(invalid_backup)})
    wait('return document.body.textContent.includes("This file is not valid JSON.")')
    click('[aria-label="Close dialog"]')
    assert js('return document.querySelectorAll(".clip-card").length') == 5
    click('[aria-label="Dismiss error"]')
    record('Malformed backup reports a recoverable error and preserves the current workspace')

    if os.environ.get('SNAPNOTE_PRODUCT_SHOTS') == '1':
        # Deliberate demonstration data, created through the real clipboard/UI in
        # this isolated test profile only. Never substitute a drawn app mockup.
        js('Array.from(document.querySelectorAll(".nav-item")).find(b=>b.textContent.includes("Clipboard")).click();')
        fill('[aria-label="Search clips"]', '')
        remaining = js('return document.querySelectorAll(".clip-card").length')
        while remaining:
            click('.clip-card .clip-preview')
            js('Array.from(document.querySelectorAll(".detail-pane button")).find(b=>b.textContent.includes("Delete clip")).click();')
            command('alert/accept', {})
            remaining -= 1
            wait('return document.querySelectorAll(".clip-card").length', remaining)
        if js('return document.documentElement.classList.contains("dark")'):
            click('[aria-label="Toggle theme"]')

        def product_clip(data, title, tags, favorite=False, snippet=False):
            count = js('return document.querySelectorAll(".clip-card").length')
            clipboard(base64.b64decode(data.split(',')[1]) if data.startswith('data:image/') else data,
                      image=data.startswith('data:image/'))
            click('.heading-actions .button.primary')
            wait('return document.querySelectorAll(".clip-card").length', count + 1)
            if favorite:
                click('.clip-card [aria-label="Add favorite"]')
            click('.clip-card .clip-preview')
            fill('.detail-pane .field-label input', title)
            fill('input[placeholder="work, research, useful"]', tags)
            click('.detail-heading')
            if snippet:
                click('.detail-pane .check-label input')
            click('[aria-label="Close details"]')

        product_clip('A few things worth keeping\n\nCollect references for the new project.\nKeep useful details close.\nMake room for the next idea.',
                     'A few things worth keeping', 'ideas, this week', favorite=True)
        product_clip('https://v2.tauri.app/start/\n\nA useful reference for the next build.',
                     'A reference for later', 'development, reference')
        product_clip('Hi {{name}},\n\nHere are the notes from our {{project}} review.\nLet me know what you think.\n\nThanks!',
                     'A thoughtful follow-up', 'writing, reusable', snippet=True)
        palette = js('''const c=document.createElement("canvas");c.width=960;c.height=520;
            const x=c.getContext("2d");x.fillStyle="#f2f4fa";x.fillRect(0,0,960,520);
            x.fillStyle="#26334b";x.font="500 28px sans-serif";x.fillText("A little direction",52,72);
            const colors=["#4264e7","#99aaf0","#e0e6fa","#26334b","#f9fafc"];
            colors.forEach((color,i)=>{x.fillStyle=color;x.fillRect(52+i*173,120,156,245);
              x.fillStyle="#68748b";x.font="18px monospace";x.fillText(color,55+i*173,410);});
            return c.toDataURL("image/png");''')
        product_clip(palette, 'Palette exploration', 'design, inspiration', favorite=True)
        product_clip('function keepWhatMatters(clips) {\n  return clips.filter(clip => clip.favorite);\n}\n\n// Small tools. A clearer workspace.',
                     'Keep what matters', 'code, useful')
        agenda = js('''const c=document.createElement("canvas");c.width=960;c.height=520;
            const x=c.getContext("2d");x.fillStyle="#fffdf6";x.fillRect(0,0,960,520);
            x.fillStyle="#cbbf9d";for(let y=135;y<500;y+=55){x.fillRect(52,y,856,1);}
            x.fillStyle="#303c50";x.font="500 30px sans-serif";x.fillText("MONDAY / PROJECT NOTES",60,84);
            x.font="25px sans-serif";["01   Gather the useful bits.","02   Give them a place.","03   Come back with a clear mind."].forEach((s,i)=>x.fillText(s,62,190+i*110));
            return c.toDataURL("image/png");''')
        product_clip(agenda, 'From the project notebook', 'research, notes')
        # Remove the capture status notice without changing any product state.
        time.sleep(5.2)
        wait('return document.body.textContent.includes("Saved on this device")')
        (ARTIFACTS / 'product-workspace-light.png').write_bytes(base64.b64decode(command('screenshot', method='GET')))
        click('[aria-label="Toggle theme"]')
        wait('return document.body.textContent.includes("Saved on this device")')
        time.sleep(.3)
        (ARTIFACTS / 'product-workspace-dark.png').write_bytes(base64.b64decode(command('screenshot', method='GET')))
        hotkey('alt+s', '%s')
        wait('return document.querySelector(".workspace-shell").classList.contains("quick-mode")')
        time.sleep(.3)
        (ARTIFACTS / 'product-quick-access.png').write_bytes(base64.b64decode(command('screenshot', method='GET')))
        js('Array.from(document.querySelectorAll("button")).find(b=>b.textContent.includes("Open workspace")).click();')
        wait('return !document.querySelector(".workspace-shell").classList.contains("quick-mode")')
        print('Captured real desktop product screenshots with illustrative clipboard data.', flush=True)

    (ARTIFACTS / 'native-smoke-results.json').write_text(json.dumps({'platform': 'Windows / WebView2' if WINDOWS else 'Linux / WebKitGTK', 'profile': str(PROFILE), 'passed': RESULTS}, indent=2) + '\n')
    print(f'Artifacts: {ARTIFACTS}', flush=True)
except Exception:
    try:
        ARTIFACTS.mkdir(parents=True, exist_ok=True)
        (ARTIFACTS / 'native-failure.png').write_bytes(base64.b64decode(command('screenshot', method='GET')))
        print(js('return document.body.innerText'), flush=True)
    except Exception:
        pass
    raise
finally:
    try:
        end_session()
    except Exception:
        pass
    if driver.poll() is None:
        if WINDOWS:
            subprocess.run(['taskkill', '/PID', str(driver.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            os.killpg(driver.pid, signal.SIGTERM)
    try:
        driver.wait(timeout=5)
    except subprocess.TimeoutExpired:
        driver.kill()
    log.close()
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(PROFILE / 'driver.log', ARTIFACTS / 'native-driver.log')
    print(f'Isolated native test profile and driver log: {PROFILE}', flush=True)
