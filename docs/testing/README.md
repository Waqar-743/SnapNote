# Desktop validation

The native suite passed **24 checks on Linux**, rerun on 2026-10-16 with the rebuilt Tauri executable, WebKitGTK, a virtual X11 desktop, the system clipboard, and Tesseract. It covers text/image round-trips, deduplication, pause, search/OCR, annotation/crop/pin, rich formatting and image paste, note creation/rename/search/close and task lists, global shortcuts, folders/tags/templates, multi-item copying/sessions, encryption, manual lock/pin closure, relaunch including embedded note images, clear-history protection, encrypted import recovery and malformed-backup recovery. The generated result list is in [native-smoke-results.json](native-smoke-results.json).

- [Light workspace screenshot](native-workspace.png)
- [Dark workspace screenshot](native-workspace-dark.png)
- [Native test script](../../snapnote/scripts/native-smoke.py)
- [Clean product screenshots and reproduction](../product/README.md)

The Tauri CLI debug build also passes after aligning `@tauri-apps/api` 2.10.x with the locked Rust core 2.10.2. The final rebuilt binary passed all 24 native checks. Clean product screenshots were captured in a separate successful run with illustrative clipboard fixtures.

Screenshots contain deliberate test fixtures, including literal HTML-looking text used to check that capture does not execute or interpret markup. They are actual screenshots of the running app, not UI mockups.

Ten TypeScript tests cover legacy migration, transactional persistence and encryption, interrupted writes and save recovery, exact text identity, protected retention, search, malformed imports, conflicting note/group merges, restoration of missing organization/OCR metadata, capacity-safe import rejection, encrypted backup round-trips, wrong passwords and tampering. Four Rust tests cover whitespace-sensitive identity, dimension-sensitive image identity, bounded/validated image decoding, and PNG pixels/dimensions.

Windows is the primary target. **All 24 native Windows checks pass** in [run 38856921850](https://github.com/Waqar-743/SnapNote/actions/runs/38856921850), commit `20a3214`. See the [separate Windows evidence](windows/README.md). The Windows workflow validates an isolated WebView2 app before building the normal MSI/EXE installers. macOS runtime testing is not part of this validation pass.

The intermediary driver intermittently closed a connection in earlier Linux attempts. The harness now uses tauri-driver for capability translation and sends subsequent standard commands directly to the native driver. The updated harness completed all 24 Linux checks. Mutating UI actions and IPC commands are never automatically retried.

Windows recovery fixed portable test invocation, LF source checkout, Tauri API/core compatibility, runtime/driver matching, and automation attachment. Actual runtime tests then exposed a synchronous pinned-window deadlock; making the native command async fixes it. Pinned WebViews also inherit the main window's browser options, required when sharing a WebView2 profile. All image and pin checks now pass on Windows and Linux. Final production MSI and EXE packaging also passed for that validated commit in the linked run.

## Test data isolation

Linux uses a fresh temporary app profile, a private virtual display, and its own clipboard. The normal application identity remains `come.codespace.snapnote` for real user upgrades.

Windows CI builds `scripts/tauri.test.conf.json` with identifier `come.codespace.snapnote.tests`. The script requires `SNAPNOTE_WINDOWS_CI=1` and checks the identifier before exercising the clipboard. Native test passwords are test fixtures and must never be used for real data.

## Remaining product work

Optional sync needs a real provider, authentication, encrypted transport/storage policy, and conflict handling; there is no sync backend or misleading enabled toggle. Tesseract is a runtime dependency and is not bundled. Platform installers are unsigned unless signing is separately configured. A tray/lifecycle policy, per-app exclusions, automatic locking, and richer annotation tools can be added in later iterations without changing the offline core.

Website implementation follows desktop validation and will be on its own branch, using the selected A mascot and verified desktop behavior.
