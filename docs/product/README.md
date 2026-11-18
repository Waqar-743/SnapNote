# Real desktop product screenshots

Refreshed on 2026-11-18 for v1.6.0, when the workspace header brand was doubled (the glossy SnapNote icon joined the app name at the top left). These are screenshots of the real app — the production web build the desktop app ships — rendered in headless Microsoft Edge on Windows at the standard window sizes, not UI mockups or claims about other users' data. Clipboard content is deliberately illustrative: the same demo clips the native staging flow uses, created through the app's own workspace backup import in an isolated browser profile, with the capture control enabled and the window answering native UI queries so the header, status bar, and controls match the desktop app.

- [Light workspace](workspace-light.png)
- [Dark workspace](workspace-dark.png)
- [Alt+X quick access](quick-access.png)

To reproduce the staged data from the desktop binary instead:

```bash
SNAPNOTE_PRODUCT_SHOTS=1 SNAPNOTE_TEST_ARTIFACTS=/tmp/snapnote-product-shots xvfb-run -a dbus-run-session -- python3 scripts/native-smoke.py
```

Run from `snapnote/`. The existing native suite runs first, then creates example clips in its isolated profile and captures the product views. Windows CI uses a separate application identifier; those Linux images do not establish Windows runtime validation, and the current committed shots come from the Windows web-build capture described above.
