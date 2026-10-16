# SnapNote recovery and delivery status

Last checked: 2026-10-16. Desktop branch: `desktop/smart-workspace`; existing review: [PR #3](https://github.com/Waqar-743/SnapNote/pull/3).

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
| Windows release gate | Repair and rerun underway | Previous [run](https://github.com/Waqar-743/SnapNote/actions/runs/38806741719) failed before compilation because Windows did not expand `tests/*.test.ts` |
| Website from scratch | Not started | Start on a separate branch after the desktop release gate; use A and verified features/screenshots |
| Optional sync | Deferred; no backend | Do not advertise cloud sync as available |

## Current recovery changes

- Replace shell-dependent test glob with explicit files through Node's test runner and the existing tsx loader. All ten assertions pass locally.
- Preserve LF source line endings on Windows so formatting checks are consistent.
- Align the JavaScript Tauri API with the locked Rust core; the Tauri CLI desktop build now passes. Windows native helper compilation passed, then exposed this packaging version check in [run 38851439605](https://github.com/Waqar-743/SnapNote/actions/runs/38851439605). The corrected workflow is running on [35e866b](https://github.com/Waqar-743/SnapNote/actions/runs/38851950555).
- Put Windows native artifacts in `docs/testing/windows/` so stale committed Linux evidence cannot be uploaded as a Windows result.
- Reject over-capacity backup merges before changing state, close private image pins on lock, and include image dimensions in duplicate identity. Regression checks pass.
- Rebuilt and ran the actual desktop suite successfully. Check the Windows workflow and record the exact result before beginning website implementation.
- Prepared the selected Mentor's transparent teaching cutout and a desktop user guide.
- Captured [clean real desktop screenshots](product/README.md) after rebuilding with the aligned Tauri API. Expanded the suite to 24 passing native checks, including note lifecycle, task lists, image persistence across relaunch and invalid-import recovery.
- Fixed pasted note images that arrived only in the parsed editor slice with a temporary blob URL. They now persist as self-contained image data, verified after encrypted relaunch.
- Restore missing folder/session/OCR metadata when an imported clip matches an existing one, preserving newer local metadata.

## Product limits to keep visible

Tesseract and language data must be installed locally for OCR. No sync provider or automatic paste injection ships. Windows installers are unsigned unless separately configured. macOS runtime checks are not complete. Tray behavior, per-app capture exclusions, automatic lock and richer annotation tools remain later enhancements.

## Resume procedure

Read this file, `git status`, the current branch and latest commit. Follow the remaining stage above; preserve user data, the application identifier and the existing mascot selection. Update this record after each delivery checkpoint, including test results, CI links and website location when available.
