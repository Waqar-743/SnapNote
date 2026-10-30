<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="SnapNote-logo-white.png">
    <img src="SnapNote-logo-Dark.png" alt="SnapNote" width="80">
  </picture>
</p>

<p align="center">A quiet place for everything you copy — clipboard, notes and ideas, remembered only on your own device.</p>

<br>

## The day you stop losing things

You find the perfect sentence while reading. A command that took twenty minutes to get right. The address a friend sent last week. You copy it, you keep moving — and the clipboard quietly lets go.

SnapNote was built because that felt wrong. Those little pieces of your day deserve to stay with you, somewhere private, somewhere only you can reach. Not on someone's server. Not behind an account. Just on your own device, sorted well enough to hand things back the exact moment you need them.

So this is SnapNote: a smart clipboard and visual workspace for Windows, made to remember the useful bits — and to keep them yours.

## Meet the guide inside

Every good workspace needs a calm presence. Ours is **The Mentor** — a snow-white wolf with dark glasses and a steady teaching smile, drawn to feel like the colleague who has seen every mess before and never looks worried about yours. He shows up in the brand and on the website; the app itself stays out of your way. You can meet him in the [brand story](docs/brand/README.md).

## What stays with you

Everything you copy lands in a searchable local history — text, links, and images alike. From there:

- **Quick access, always one keystroke away.** Press `Alt + X` and a small floating window appears above whatever you were doing, ready to search and copy. The app always opens into Quick access first; the full workspace is there whenever you choose to step into it.
- **A clip library that organizes itself around your projects** — favorites, folders, tags, and sessions that group a moment of research together.
- **Reusable snippets** with `{{variables}}`, for the replies and templates you write twice too often.
- **Notes with a real editor** — headings, lists, task lists, code blocks, undo/redo, and image paste.
- **Image tools built in** — crop, annotate, pin an image above other windows, and pull the text back out with local OCR.
- **A vault if you want one** — optional AES-256 workspace encryption, lock/unlock, and password-protected backups.

Sync is not connected, and that is the point. The app makes no account, cloud, or telemetry requests. OCR needs Tesseract installed on your machine; it is not bundled. Nothing is ever pasted into another app without you.

## Download

Windows 10/11, x64 — installers are built and validated by the [Windows build pipeline](https://github.com/Waqar-743/SnapNote/actions):

| File | Type |
| --- | --- |
| [`SnapNote_1.4.1_x64_en-US.msi`](https://github.com/Waqar-743/SnapNote/releases/download/v1.4.1/SnapNote_1.4.1_x64_en-US.msi) | MSI installer (recommended) |
| [`SnapNote_1.4.1_x64-setup.exe`](https://github.com/Waqar-743/SnapNote/releases/download/v1.4.1/SnapNote_1.4.1_x64-setup.exe) | NSIS setup executable |

SHA-256 checksums are in [`SnapNote_1.4.1_SHA256SUMS.txt`](https://github.com/Waqar-743/SnapNote/releases/download/v1.4.1/SnapNote_1.4.1_SHA256SUMS.txt) on the [v1.4.1 release](https://github.com/Waqar-743/SnapNote/releases/tag/v1.4.1). Builds are unsigned, so SmartScreen may show a prompt — verify the checksum if that helps you sleep at night.

## Shortcuts

| Shortcut | Action |
| --- | --- |
| Alt+X | Show / hide floating quick access |
| Ctrl+Alt+C | Capture clipboard into the active rich note |
| Ctrl+Alt+O | Show/focus SnapNote |
| Ctrl+K | Search clips |
| Ctrl+B / I / U | Bold / italic / underline in notes |
| Ctrl+Shift+X / H | Strikethrough / highlight in notes |
| Ctrl+Z / Ctrl+Shift+Z | Undo / redo in notes |
| Escape | Close the current detail, dialog, or quick panel |

On macOS paths, use Command instead of Ctrl. A reserved global shortcut is reported in the UI without preventing startup.

## Privacy, in plain words

Your workspace lives in transactional IndexedDB storage inside the app's own device profile. The identifier stays `come.codespace.snapnote`, so your original notes migrate over on first launch and a recovery copy of the old records is kept during normal use. Nothing is backported or silently discarded — failures are shown, not buried.

Enabling live encryption rewrites stored entities with AES-256-GCM and PBKDF2-SHA256, then removes the old plaintext copies after explicit confirmation. That password cannot be recovered — which is exactly why backup exports exist. Clearing history always preserves your notes, favorites, snippets, and organized clips.

## Build it yourself

Run commands from `snapnote/`:

```bash
npm ci
npm run tauri dev
```

You'll want Node 20.19+ (or a current Node 22/24), stable Rust, and the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/). On Windows, installer builds need Visual Studio C++ Build Tools and WebView2; OCR needs Tesseract on your `PATH`.

```bash
npm test
npm run format:check
npm run build
cargo test --manifest-path src-tauri/Cargo.toml --locked
npm run tauri build
```

The Windows workflow builds installers and runs storage and native helper checks, then exercises a real clipboard, image, shortcut, and persistence pass on a fresh runner. Release publishing stays restricted to version tags.

## Where the story continues

- [Product website](https://waqar-743.github.io/SnapNote/) — the public home of SnapNote ([source and preview](website/README.md), [delivery record](docs/WEBSITE-DELIVERY.md))
- [Desktop user guide](docs/DESKTOP-GUIDE.md) — how everything works, step by step
- [Project status](docs/PROJECT-STATUS.md) — recovered progress and what remains
- [Architecture strategy](docs/DESKTOP-STRATEGY.md) — the decisions behind the build
- [Brand and The Mentor](docs/brand/README.md) — the wolf, the glasses, the pointer
- [Validation evidence](docs/testing/README.md) — proof the desktop checks really ran
