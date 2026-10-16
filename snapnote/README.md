# SnapNote desktop development

See the [project README](../README.md) for capabilities, data compatibility, privacy behavior, and the architecture audit.

All commands below run from this directory.

```bash
npm ci
npm run tauri dev
```

A browser preview (`npm run dev`) can display the interface and local storage. Native clipboard, OCR, global shortcuts, pinning, and file export require the desktop app.

```bash
npm test
npm run format:check
npm run build
cargo test --manifest-path src-tauri/Cargo.toml --locked
npm run tauri build
```

On Linux, build an embedded-assets debug binary and run the real native suite in an isolated virtual desktop:

```bash
cargo build --manifest-path src-tauri/Cargo.toml --features tauri/custom-protocol
xvfb-run -a dbus-run-session -- python3 scripts/native-smoke.py
```

The suite needs `tauri-driver`, WebKitWebDriver, Xvfb, xauth, xclip, xdotool, and Tesseract. Install the driver with `cargo install tauri-driver --locked`. It uses a temporary Linux profile and virtual clipboard. Windows CI uses `scripts/tauri.test.conf.json` to create the separate application identifier `come.codespace.snapnote.tests`; the normal application identifier is unchanged.

Do not run the Windows smoke script against a normal user profile. It requires the dedicated CI opt-in and checks the application identifier before using the clipboard.

If OCR is unavailable, install Tesseract and its English language data, add its directory to `PATH`, and restart the app. OCR runs in a background task and shows its error in the app.

Build outputs live under `src-tauri/target/release/bundle/`. Headless development also remains available through `npm run tauri:dev:headless`.
