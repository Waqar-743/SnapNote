# SnapNote recovery and delivery status

Last checked: 2026-10-16. Desktop branch: `desktop/smart-workspace`, [PR #3](https://github.com/Waqar-743/SnapNote/pull/3). Website branch: `website/product-site`, [PR #4](https://github.com/Waqar-743/SnapNote/pull/4). Both reviews are saved as drafts; neither was merged.

## Recovered work

The previous implementation is preserved in commit `692f14e`, not lost. Use this file and the linked evidence to resume instead of rebuilding the app.

| Stage | Recovered state | Evidence / next step |
| --- | --- | --- |
| Mascot concepts | Complete; three consistent six-pose options | [Brand record](brand/README.md); owner selection recorded as **A — The Mentor**, 2026-10-15 |
| Architecture audit and strategy | Complete | [Audit and phased plan](DESKTOP-STRATEGY.md) |
| Desktop redesign and offline core | Implemented | Existing Tauri/React app and legacy note migration retained |
| Clipboard and organization | Implemented | Text/images, deduplication, search/OCR text, favorites, folders, tags, sessions, snippets, combined text copying |
| Images and shortcuts | Implemented | Crop/draw, original preservation, image pins, local OCR, Alt+S, retained note capture/show shortcuts |
| Privacy and recovery | Implemented | Opt-in capture, pause, protected retention, transactional storage, optional local encryption, encrypted export/merge import |
| Linux validation | Complete: 24 native, 10 TypeScript and 4 Rust checks pass | [Validation evidence](testing/README.md), rerun 2026-10-16 |
| Windows release gate | Complete: all 24 native checks and MSI/EXE builds pass | [Final Windows run](https://github.com/Waqar-743/SnapNote/actions/runs/38858824546), commit `224687e`; [saved evidence](testing/windows/README.md); v1.2.0 installers and SHA-256 checksums published on the [v1.2.0 release](https://github.com/Waqar-743/SnapNote/releases/tag/v1.2.0) |
| Website from scratch | Complete, redesigned and public on GitHub Pages from `main` | [Public website](https://waqar-743.github.io/SnapNote/); [source and validation](../website/README.md); [deployment record](WEBSITE-DELIVERY.md) |
| Optional sync | Deferred; no backend | Do not advertise cloud sync as available |

## Current recovery changes

- Replace shell-dependent test glob with explicit files through Node's test runner and the existing tsx loader. All ten assertions pass locally.
- Preserve LF source line endings on Windows so formatting checks are consistent.
- Align the JavaScript Tauri API with the locked Rust core; the Tauri CLI desktop build now passes. Windows native helper compilation passed, then exposed this packaging version check in [run 38851439605](https://github.com/Waqar-743/SnapNote/actions/runs/38851439605). After correction, MSI and EXE installers were produced in [run 38851950555](https://github.com/Waqar-743/SnapNote/actions/runs/38851950555).
- Install Evergreen WebView2, match EdgeDriver to its browser build, and attach to the actual isolated Windows test app. All 24 native Windows feature checks now pass.
- Generate Windows CI evidence in a fresh runner-temporary directory; copy successful evidence into `docs/testing/windows/` separately from Linux results.
- Reject over-capacity backup merges before changing state, close private image pins on lock, and include image dimensions in duplicate identity. Regression checks pass.
- Rebuilt and ran the actual desktop suite successfully on Linux and Windows. Final production MSI and EXE packaging passed for the same validated source commit `20a3214`.
- Prepared the selected Mentor's transparent teaching cutout and a desktop user guide.
- Captured [clean real desktop screenshots](product/README.md) after rebuilding with the aligned Tauri API. Expanded the suite to 24 passing native checks, including note lifecycle, task lists, image persistence across relaunch and invalid-import recovery.
- Fixed pasted note images that arrived only in the parsed editor slice with a temporary blob URL. They now persist as self-contained image data, verified after encrypted relaunch.
- Restore missing folder/session/OCR metadata when an imported clip matches an existing one, preserving newer local metadata.
- Fix a real Windows deadlock by creating pinned WebView windows in an async Tauri command. Match the main window's additional browser arguments for WebViews sharing its profile; this also fixes blank pins in the isolated automation build.
- Use real keyboard events to clear Windows search fields so the test drives React state as well as the DOM.
- Website: selected Mentor cutout, real app screenshots, light/dark gallery, quick-access walkthrough, privacy details, FAQs, responsive navigation and exact validated Windows preview downloads. Eight Chromium workflow checks and seven supplementary WebKit checks passed initially; the site is now public and has additional anonymous live-browser verification below.
- A later documentation-only Windows run exposed a test race while observing pin teardown. The harness now waits for window creation and removal with fixed deadlines; the app and preview installers are unchanged. All 24 native checks pass again on Linux and in Windows [follow-up run 38858824546](https://github.com/Waqar-743/SnapNote/actions/runs/38858824546).

## Public access and release update, 2026-10-16

The owner reported a website 404 and explicitly chose public access. Site publication moved to GitHub Pages at [https://waqar-743.github.io/SnapNote/](https://waqar-743.github.io/SnapNote/), deployed from `main` by the Deploy product website workflow; the previous external host was retired after returning 404s. [Live verification evidence](testing/public-website/results.json).

The `v1.2.0` tag was released with the CI-built EXE, MSI and checksum file from run `38879682636`, published to the [v1.2.0 release](https://github.com/Waqar-743/SnapNote/releases/tag/v1.2.0), marked latest. The v0.1.0 release remains available. [Release receipt](releases/windows-1.2.0.json). Website download buttons link directly to those verified release assets.

## Product limits to keep visible

Tesseract and language data must be installed locally for OCR. No sync provider or automatic paste injection ships. Windows installers are unsigned unless separately configured. macOS runtime checks are not complete. Tray behavior, per-app capture exclusions, automatic lock and richer annotation tools remain later enhancements.

## Resume procedure

Read this file, `git status`, the current branch and latest commit. Follow the remaining stage above; preserve user data, the application identifier and the existing mascot selection. Update this record after each delivery checkpoint, including test results, CI links and website location when available.
