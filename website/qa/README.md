# Website verification — 2026-10-16

Verification used Chromium 156 through Playwright and WebKitGTK MiniBrowser through native WebDriver against the local static server, originally for the first site build and repeated for the 2026-10-16 redesign. The site itself has no browser-testing dependency or build step. Checks are browser workflow observations, not an exhaustive accessibility or device certification.

- [Chromium result list](chromium-results.json): eight workflow checks; no console errors, script errors or failed resource requests.
- [WebKit result list](webkit-results.json): seven supplementary checks. Its GTK browser has a minimum outer window width, so 390px/320px checks use a same-origin iframe with that actual CSS viewport. Mobile screenshot evidence below comes from Chromium's direct viewport, because WebKit's iframe screenshots were unreliable.
- [Desktop opening](desktop-hero.png), [full desktop page](desktop-full.png), [390px opening](mobile-hero.png), [390px downloads](mobile-download.png).

Verified page rendering and mascot image decoding; unique IDs and the main download navigation; light/dark screenshot selection by mouse and keyboard; screenshot zoom, Escape and focus restoration; native FAQ disclosure and repeated OCR links; internal anchors; mobile menu navigation; no horizontal overflow at 320, 390, 620, 768 and 1024px; and browser download flows. Product screenshots identify their actual Linux source and illustrative content.

For the redesigned site the same interaction set was re-exercised locally, `node --check dist/app.js` passes, and every referenced asset resolves relative to the page root so the site serves correctly under GitHub Pages' `/SnapNote/` subpath. Release download URLs are verified against the [v1.2.0 release](https://github.com/Waqar-743/SnapNote/releases/tag/v1.2.0) assets (`SnapNote_1.2.0_x64_en-US.msi`, `SnapNote_1.2.0_x64-setup.exe`, `SnapNote_1.2.0_SHA256SUMS.txt`, SHA-256 digests in [releases/windows-1.2.0.json](../../docs/releases/windows-1.2.0.json)). Live-site evidence is recorded in `docs/testing/public-website/results.json`.

To reproduce: serve `dist/` as described in the project README, open the page in a browser, exercise the controls above and inspect responsive layouts. `node --check dist/app.js` requires no installation. The shipped source does not depend on the temporary QA tools used in the development container.
