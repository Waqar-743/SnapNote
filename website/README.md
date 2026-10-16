# SnapNote product website

A buildless product site using semantic HTML, CSS and a small progressive JavaScript layer. No dependency installation, build step, analytics, accounts, or external font requests.

- **Live site:** https://waqar-743.github.io/SnapNote/
- **Published from:** `website/dist/` on `main`, deployed by `.github/workflows/deploy-website.yml` (GitHub Pages, build type "workflow").

## Preview locally

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open `http://127.0.0.1:4173`. All asset references are relative, so the site also works when served under a subpath such as GitHub Pages' `/SnapNote/`.

## Content and assets

- `dist/index.html`: hero, capability ribbon, feature grid, screenshot showcase with light/dark tabs, quick-access section, privacy details, FAQs, and the download section.
- `dist/styles.css`: aurora-gradient dark hero, sticky glass header, bento feature cards, responsive layout (390px/320px safe), reduced-motion support and visible keyboard focus states.
- `dist/app.js`: mobile navigation, accessible light/dark screenshot tabs, screenshot zoom dialog, scrolled header state, and linked FAQ disclosure.
- `dist/assets/mentor-teaching.png`: transparent illustration of the owner-selected **A — The Mentor** mascot; original pose sheets and the exact generation prompt are in the main repository's `docs/brand/`.
- `dist/assets/workspace-*.png` and `quick-access.png`: actual running desktop app with illustrative clipboard content; reproduction steps are in the main repository's `docs/product/README.md`.
- `dist/assets/favicon.svg`: clipboard mark matching the product's visual direction.

## Downloads

Download buttons link directly to the CI-built, validated assets of the [v1.2.0 release](https://github.com/Waqar-743/SnapNote/releases/tag/v1.2.0):

- MSI: `https://github.com/Waqar-743/SnapNote/releases/download/v1.2.0/SnapNote_1.2.0_x64_en-US.msi`
- EXE: `https://github.com/Waqar-743/SnapNote/releases/download/v1.2.0/SnapNote_1.2.0_x64-setup.exe`
- SHA-256: `SnapNote_1.2.0_SHA256SUMS.txt` on the same release.

When publishing a new version, tag `v<version>` so the Windows workflow builds and attaches the installers, then update the links above and run the "Deploy product website" workflow.

## Validation

JavaScript syntax (`node --check`), real-browser navigation/gallery/dialog/FAQ interactions, keyboard selection and focus restoration, internal anchors, 390px/320px responsive layout, image loading and download integrity were checked. Evidence and browser-specific details are recorded in `qa/`.

The page does not claim that Tesseract is bundled, encryption is automatic, sync is available, or macOS is validated. Installers are unsigned previews.
