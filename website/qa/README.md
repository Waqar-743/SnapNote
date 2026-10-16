# Website verification — 2026-10-16

Final verification used Chromium 156 through Playwright and WebKitGTK MiniBrowser through native WebDriver against the local static server. The site itself has no browser-testing dependency or build step. Checks are browser workflow observations, not an exhaustive accessibility or device certification.

- [Chromium result list](chromium-results.json): eight workflow checks; no console errors, script errors or failed resource requests.
- [WebKit result list](webkit-results.json): seven supplementary checks. Its GTK browser has a minimum outer window width, so 390px/320px checks use a same-origin iframe with that actual CSS viewport. Mobile screenshot evidence below comes from Chromium's direct viewport, because WebKit's iframe screenshots were unreliable.
- [Desktop opening](desktop-hero.png), [full desktop page](desktop-full.png), [390px opening](mobile-hero.png), [390px downloads](mobile-download.png).

Verified page rendering and mascot image decoding; unique IDs and the main download navigation; light/dark screenshot selection by mouse and keyboard; screenshot zoom, Escape and focus restoration; native FAQ disclosure and repeated OCR links; internal anchors; mobile menu navigation; no horizontal overflow at 320, 390, 620, 768 and 1024px; and both real browser downloads with byte counts/SHA-256 matching the validated Windows artifacts. Product screenshots identify their actual Linux source and illustrative content.

Installer provenance: desktop commit `20a321463b2a91d376bc51e9dd9ef048a2bc05cf`, [green Windows run 38856921850](https://github.com/Waqar-743/SnapNote/actions/runs/38856921850). Checksums are served at `/downloads/checksums.json`. Native desktop validation is documented separately in the main repository under `docs/testing/`.

To reproduce: serve `dist/` as described in the project README, open the page in a browser, exercise the controls above and inspect responsive layouts. `node --check dist/app.js` requires no installation. The shipped source does not depend on the temporary QA tools used in the development container.
