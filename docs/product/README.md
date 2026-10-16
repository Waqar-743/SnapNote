# Real desktop product screenshots

Captured from the rebuilt Tauri desktop app on Linux/WebKitGTK on 2026-10-16. Clipboard content is deliberately illustrative, created through the actual system clipboard and app controls in an isolated test profile. These are screenshots of the real app, not UI mockups or claims about other users' data.

- [Light workspace](workspace-light.png)
- [Dark workspace](workspace-dark.png)
- [Alt+X quick access](quick-access.png)

To reproduce after building the desktop binary:

```bash
SNAPNOTE_PRODUCT_SHOTS=1 SNAPNOTE_TEST_ARTIFACTS=/tmp/snapnote-product-shots xvfb-run -a dbus-run-session -- python3 scripts/native-smoke.py
```

Run from `snapnote/`. The existing native suite runs first, then creates example clips in its isolated profile and captures the product views. Windows CI uses a separate application identifier; these Linux images do not establish Windows runtime validation.
