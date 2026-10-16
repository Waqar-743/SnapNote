# Windows validation evidence

MSI/EXE packaging succeeds. [startup.png](startup.png) is a real capture of the running native app on the Windows CI desktop, from [run 38854172242](https://github.com/Waqar-743/SnapNote/actions/runs/38854172242). The app and WebView2 processes were responding, and the workspace rendered with capture paused.

This is startup evidence, not a completed Windows feature-test result. The automation connection did not open with the environment-only debugging option. The next test configuration sets its debugging port explicitly in `scripts/tauri.test.conf.json`, which uses the separate `come.codespace.snapnote.tests` identifier. Normal production configuration has no debugging port.

The test workflow installs WebView2, matches EdgeDriver to the installed runtime, uses Microsoft's attach mode, and saves process/startup diagnostics on failure. Generated CI evidence lives in a fresh runner-temporary directory, separate from these committed snapshots.

[Run 38854782395](https://github.com/Waqar-743/SnapNote/actions/runs/38854782395) attached successfully and passed startup, text capture/deduplication, pause/copy-back, image round-trip/OCR, and OCR search. Its next assertion exposed a test-input issue: EdgeDriver's clear command changed an input's DOM value without updating React's search state. The harness now clears fields through real key events. Full native feature validation remains pending.
