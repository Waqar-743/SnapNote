# Website delivery — 2026-10-16 (revised)

[Open the public SnapNote product site](https://waqar-743.github.io/SnapNote/).

The site was created from scratch on `website/product-site` after the green Windows desktop gate, then **redesigned on 2026-10-16** and moved to GitHub Pages. It is a buildless static site in `website/dist/` published from `main` by `.github/workflows/deploy-website.yml`.

## Why the site was moved

The previous external host returned 404s, and the first GitHub Pages attempt failed because the `github-pages` environment branch policy only allowed `main` while the deploy workflow ran from `gh-pages` ("Branch gh-pages is not allowed to deploy to github-pages due to environment protection rules"). Publishing from `main` through the existing `github-pages` environment resolves both problems; the old external host is retired.

Redesign highlights: aurora-gradient hero with the real app screenshot, sticky glass header, capability ribbon, bento feature grid, dark screenshot showcase with light/dark tabs and zoom dialog, Alt+S quick-access section, privacy cards, FAQs with the Mentor illustration, and a gradient download band linking the release assets. All asset paths are relative so the site works under the `/SnapNote/` project path.

## Delivered

- Public GitHub Pages deployment from `main` with the `github-pages` environment (build type: workflow).
- Actual desktop screenshots with light/dark selection, accessible zoom, mobile navigation, keyboard handling, reduced-motion support and native FAQ disclosure. No framework runtime, external fonts or analytics.
- Download buttons link directly to the CI-built, validated assets on the [v1.2.0 release](https://github.com/Waqar-743/SnapNote/releases/tag/v1.2.0): `SnapNote_1.2.0_x64_en-US.msi`, `SnapNote_1.2.0_x64-setup.exe` and `SnapNote_1.2.0_SHA256SUMS.txt`.

[Local preview instructions](../website/README.md) and [browser evidence](../website/qa/README.md) are included.

## Completed release upload

The `v1.2.0` tag was pushed at `main` commit `57e9b8ee90fa916f07a18d55ba1100f2d2b8a947`. The Windows workflow ([run 38879682636](https://github.com/Waqar-743/SnapNote/actions/runs/38879682636)) built, validated and published `SnapNote_1.2.0_x64_en-US.msi`, `SnapNote_1.2.0_x64-setup.exe` and `SnapNote_1.2.0_SHA256SUMS.txt` to the [v1.2.0 release](https://github.com/Waqar-743/SnapNote/releases/tag/v1.2.0), which is marked latest. The release receipt records the exact digests: [releases/windows-1.2.0.json](releases/windows-1.2.0.json).

The earlier v0.1.0 release and its assets remain untouched. The previously documented plan of attaching v1.2.0 files to a "v1.1.0" release never landed on GitHub and was replaced by this clean v1.2.0 release.

## Remaining scope

Optional sync is deferred. OCR needs a separately installed Tesseract engine. macOS runtime validation, signed desktop releases, tray behavior, automatic locking and per-app capture exclusions remain later work. These are disclosed where relevant and are not presented as shipping features on the website.
