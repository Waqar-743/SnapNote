# Desktop validation

The native suite passed **20 checks on Linux** with the actual Tauri executable, WebKitGTK, a virtual X11 desktop, the system clipboard, and Tesseract. It covers text/image round-trips, deduplication, pause, search/OCR, annotation/crop/pin, rich formatting and image paste, global shortcuts, folders/tags/templates, multi-item copying/sessions, encryption, relaunch, clear-history protection, and encrypted import recovery. The generated result list is in [native-smoke-results.json](native-smoke-results.json).

- [Light workspace screenshot](native-workspace.png)
- [Dark workspace screenshot](native-workspace-dark.png)
- [Native test script](../../snapnote/scripts/native-smoke.py)

Screenshots contain deliberate test fixtures, including literal HTML-looking text used to check that capture does not execute or interpret markup. They are actual screenshots of the running app, not UI mockups.

Eight TypeScript tests cover legacy migration, transactional persistence and encryption, exact text identity, protected retention, search, malformed imports, conflicting note/group merges, encrypted backup round-trips, wrong passwords and tampering. Three Rust tests cover whitespace-sensitive identity, bounded/validated image decoding, and PNG pixels/dimensions.

Windows is the primary target. The Windows workflow now builds MSI/EXE installers and has a native WebView2 test stage using a separate app identifier. Windows results are pending until that workflow runs. Linux evidence does not by itself establish Windows behavior. macOS runtime testing is not part of this validation pass.

## Test data isolation

Linux uses a fresh temporary app profile, a private virtual display, and its own clipboard. The normal application identity remains `come.codespace.snapnote` for real user upgrades.

Windows CI builds `scripts/tauri.test.conf.json` with identifier `come.codespace.snapnote.tests`. The script requires `SNAPNOTE_WINDOWS_CI=1` and checks the identifier before exercising the clipboard. Native test passwords are test fixtures and must never be used for real data.

## Remaining product work

Optional sync needs a real provider, authentication, encrypted transport/storage policy, and conflict handling; there is no sync backend or misleading enabled toggle. Tesseract is a runtime dependency and is not bundled. Platform installers are unsigned unless signing is separately configured. A tray/lifecycle policy, per-app exclusions, automatic locking, and richer annotation tools can be added in later iterations without changing the offline core.

Website implementation follows desktop validation and will be on its own branch, using the selected A mascot and verified desktop behavior.
