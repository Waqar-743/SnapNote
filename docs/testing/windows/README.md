# Windows validation evidence

**24 of 24 native checks pass**, 2026-10-16, in [run 38856921850](https://github.com/Waqar-743/SnapNote/actions/runs/38856921850), commit `20a3214`.

- [Complete result list](native-smoke-results.json)
- [Actual light workspace](native-workspace.png)
- [Actual dark workspace](native-workspace-dark.png)
- [Native driver log](native-driver.log)

The suite exercises the real Windows clipboard, image round-trips, duplicate suppression, OCR/search, crop/draw, pinned native windows, global shortcuts, retained rich notes and image paste, folders/tags/templates, sessions and combined copying, local encryption, manual lock, encrypted relaunch and backup recovery. The same 24 checks pass on Linux. Screenshots use deliberate test fixtures rather than personal data.

The workflow installs Evergreen WebView2 and matches EdgeDriver to the installed runtime (155.0.4283.60 in this run). Microsoft's attach mode connects to the actual app. Only the isolated `come.codespace.snapnote.tests` configuration enables the automation port; production retains `come.codespace.snapnote` and has no debugging port. CI evidence is generated in a fresh runner-temporary directory, separate from committed snapshots.

Testing found a real Windows deadlock in synchronous pinned-window creation. The command is now async. Pinned WebViews inherit the main window's browser options so shared profiles initialize correctly. The harness clears inputs with real key events because EdgeDriver's clear command did not update React's state reliably.

The final production MSI and EXE builds for this validated commit also **passed** in the linked workflow; both are available as workflow artifacts. Installers are unsigned previews. The older [startup capture](startup.png) is retained as recovery history, not used as the feature-test evidence.
