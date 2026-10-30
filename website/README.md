# SnapNote product website

A buildless product site in `dist/`, published to [GitHub Pages](https://waqar-743.github.io/SnapNote/) from `main`. No framework, build step, external fonts or analytics are required.

The 2026-10-30 update keeps the warm paper, espresso, terracotta and olive palette and The Mentor wolf. All other bitmap images have been removed from the published site. Inline SVG icons, animated note strokes, a flowing workspace diagram and a local-device lock illustration replace the old screenshots and artwork. Motion stops when visitors prefer reduced motion.

The hero contains an interactive preview with clearly identified sample clips: visitors can filter text/images, search, and copy sample text. The quick-access illustration demonstrates showing and hiding the panel. These examples do not connect to a visitor's desktop app or save their clipboard.

## Preview

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open `http://127.0.0.1:4173`. Relative assets also work under GitHub Pages' `/SnapNote/` subpath.

## Downloads

Header and hero downloads point to GitHub's `/releases/latest`. MSI, EXE and checksum links start with the same working fallback, then resolve the exact installer assets using the public latest-release API. The displayed version comes from that response. API failures or disabled JavaScript leave the latest-release page accessible; no old version is hardcoded into the website.

## Verification and publishing

See [v1.4.1 browser results](qa/v1.4.1-results.json) for responsive layouts, preview interactions, reduced motion, release resolution, API failure and JavaScript-disabled checks. Current [desktop](qa/v1.4.1-desktop.png) and [mobile](qa/v1.4.1-mobile.png) captures use simulated release metadata to verify future-version handling.

`node --check dist/app.js` checks progressive JavaScript. `.github/workflows/deploy-website.yml` publishes `website/dist/` when it changes on `main`.
