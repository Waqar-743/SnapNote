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
| Images and shortcuts | Implemented | Crop/draw, original preservation, image pins, local OCR, Alt+X, retained note capture/show shortcuts |
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

## Issue #9 fix: startup error and website quality, 2026-11-14

The owner reported ([issue #9](https://github.com/Waqar-743/SnapNote/issues/9)) that the downloaded app failed to start with "The code execution cannot proceed because VCRUNTIME140.dll was not found," and criticized the website as casual, unrealistic and weak on SEO.

- **Startup fix:** the Windows build now sets `RUSTFLAGS=-C target-feature=+crt-static`, statically linking the Visual C++ runtime into `snapnote.exe`. A new post-build workflow step fails the run if the binary still imports any Visual C++ runtime DLL, so the error cannot ship again. Version bumped to 1.4.2 across `package.json`, `Cargo.toml`, `Cargo.lock` and `tauri.conf.json`; release notes in [releases/v1.4.2.md](releases/v1.4.2.md). Tag `v1.4.2` publishes the fixed installers.
- **Website redesign:** rebuilt around the real application screenshots (hero, quick access, light/dark gallery); removed the mascot section and its 1.5 MB image, the interactive mock preview and the fictional day-story. Copy rewritten to be concrete and professional. Full SEO added: canonical URL, Open Graph and Twitter cards with a generated 1200×630 banner, `SoftwareApplication`/`WebSite`/`FAQPage` JSON-LD, `robots.txt` and `sitemap.xml`. Verification evidence: [issue-9 QA results](../website/qa/issue-9-results.json).
- **Local verification:** frontend `npm test` (10/10), `format:check` and production build pass after the version bump; both workflow YAML files parse; headless Edge captures of the redesigned site verified at desktop and mobile widths.

## Issues #10 and #11: dashboard polish, starter walkthrough, and icon, 2026-11-17

The owner reported two issues: the favicon and app icon should use the dashboard logo ([#10](https://github.com/Waqar-743/SnapNote/issues/10)), and the dashboard should drop the logo from its top menu, gain a proper first-run starter walkthrough, and link the GitHub project from Settings & privacy ([#11](https://github.com/Waqar-743/SnapNote/issues/11)).

- **Dashboard:** the logo image was removed from the top menu and the remaining title, divider, and rail icons realigned. A compact first-run starter screen now walks through the app's working in five steps with a top-left skip button and a centered continue button; the card is capped at 400×268 px so it never covers more than 30% of the first-open window, and a stored flag limits it to the first launch. Settings & privacy links the GitHub project through the opener plugin (the browser preview falls back to `window.open`).
- **Icon:** every bundled icon (ICO, ICNS, PNG sizes, Windows Store logos) and the favicon was regenerated from the dashboard logo; unused template assets (`tauri.svg`, `vite.svg`, and the public logo copies) were removed.
- **Efficiency:** memoized clip search/filtering, selection lookups (Set), and sidebar group counts (single pass); one shared `Intl.DateTimeFormat` for clip dates; sidebar brand logos downscaled to display size (~1 MB → 48 KB).
- **Validation:** the native smoke suite now drives the starter walkthrough through its own buttons and asserts the 30% bound (29 checks); frontend `npm test` (10/10), `format:check`, and the production build pass locally after the bump. Version raised to 1.5.0 across `package.json`, `Cargo.toml`, `Cargo.lock` and `tauri.conf.json`; release notes in [releases/v1.5.0.md](releases/v1.5.0.md). Tag `v1.5.0` publishes the installers.

## Glossy icon rebrand, 2026-11-17

The owner replaced the v1.5.0 icon choice with two new glossy icons: a light pencil icon for light contexts and a dark glossy icon for dark mode. The v1.5.0 icon was reported as blurry.

- **Desktop app icon:** every bundled icon (ICO, ICNS, PNG sizes, Windows Store logos) was regenerated from the dark glossy icon, cropped to its artwork and padded square at 1024px so masks never clip it.
- **Favicons:** the app and the website now ship theme-aware PNG favicons (light pencil in light scheme, dark glossy in dark scheme) plus an Apple touch icon on the website; the old SVG favicon was removed.
- **In-app brand:** the sidebar logo uses the new icons matched to the theme (square 34px).
- **README and website:** the README picture block uses the light pencil icon by default and the dark icon in dark mode; the website header and footer brand marks use the same theme-aware pair. Superseded root images (`SnapNote-logo-Dark.png`, `SnapNote-logo-white.png`, `SnapNote-App.png`) were removed.
- **Validation:** frontend `npm test` (10/10), `format:check`, and the production build pass after the bump. Version raised to 1.5.1 across `package.json`, `Cargo.toml`, `Cargo.lock` and `tauri.conf.json`; release notes in [releases/v1.5.1.md](releases/v1.5.1.md). Tag `v1.5.1` publishes the installers.

## Doubled workspace header brand and refreshed product shots, 2026-11-18

The owner asked for a stronger brand at the top left: the width where the name and icon live looked small, and was to be doubled in size without introducing a background colour that departs from the system theme.

- **Workspace header brand:** the glossy theme-aware SnapNote icon now sits beside the app name in the workspace header, and the wordmark doubles from 15px to 30px (weight 700, icon at 44px, divider scaled to match). The wordmark still hides below the 1100px breakpoint, so the quick-access window keeps the icon with the rail exactly as before.
- **System surface untouched:** the brand lives directly on the existing `--surface` theme colour with no separate background, so it cannot clash in light or dark. A headless render pass measured the header at the exact theme surface in both light (`#fffdf8`) and dark (`rgb(31,26,21)`), with the white pencil icon appearing on the dark theme.
- **Sidebar brand:** the drawer brand grows to stay in the same family (48px icon, 26px name) and now renders without overflow next to the close control.
- **Product screenshots:** the website hero, gallery, and quick-access shots were re-captured from the v1.6.0 production web build in headless Microsoft Edge on Windows, seeded through the app's own backup import with the same illustrative clips the native staging flow uses; capture conditions are recorded in [product/README.md](product/README.md).
- **Validation:** frontend `npm test` (10/10), `format:check`, and the production build pass; headless render checks confirm no overflow, all header controls, and no page errors in both themes. Version raised to 1.6.0 across `package.json`, `Cargo.toml`, `Cargo.lock` and `tauri.conf.json`; release notes in [releases/v1.6.0.md](releases/v1.6.0.md). Tag `v1.6.0` published the installers to the [v1.6.0 release](https://github.com/Waqar-743/SnapNote/releases/tag/v1.6.0); README download links and the website version metadata follow.

## Product limits to keep visible

Tesseract and language data must be installed locally for OCR. No sync provider or automatic paste injection ships. Windows installers are unsigned unless separately configured. macOS runtime checks are not complete. Tray behavior, per-app capture exclusions, automatic lock and richer annotation tools remain later enhancements.

## Resume procedure

Read this file, `git status`, the current branch and latest commit. Follow the remaining stage above; preserve user data, the application identifier and the existing mascot selection. Update this record after each delivery checkpoint, including test results, CI links and website location when available.
