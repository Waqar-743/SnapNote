# SnapNote product website

A new, buildless product site, created **after** the desktop release gate passed. Source uses semantic HTML, CSS and a small progressive JavaScript layer. It has no dependency installation or build step, analytics, accounts, or external font requests.

## Preview locally

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open `http://127.0.0.1:4173`. Site identity and static output are recorded in `.openai/hosting.json`. Reuse that exact identity for future publication; do not create another Site. The public product website is `https://snapnote-workspace.grittybloom257.chatgpt.site`.

## Content and assets

- `dist/index.html`: product story, actual screenshots, feature descriptions, privacy details, FAQs and Windows preview downloads.
- `dist/styles.css`: responsive layout, light/slate/blue brand palette, reduced-motion support and keyboard focus states.
- `dist/app.js`: accessible light/dark screenshot tabs, native screenshot zoom dialog, mobile navigation and linked FAQ disclosure.
- `dist/assets/mentor-teaching.png`: transparent illustration generated with the built-in image generation tool, using the owner-selected **A — The Mentor** model sheet. Original six-pose sheets and the exact generation prompt are in the main repository's `docs/brand/`.
- `dist/assets/workspace-*.png` and `quick-access.png`: actual running Linux desktop app with illustrative clipboard content, captured through the native smoke harness. See the main repository's `docs/product/README.md` for reproduction.
- `dist/assets/favicon.svg`: clipboard mark matching the existing product's visual direction. Other inline icons use simple matching line geometry.
- `dist/downloads/`: unchanged production Windows x64 MSI/EXE artifacts from [successful run 38858824546](https://github.com/Waqar-743/SnapNote/actions/runs/38858824546), desktop commit `224687e61e5034051a6dc4c59b4be1dda28c599c`. File sizes and SHA-256 checksums are in `checksums.json`.

The installers are unsigned **v1.2.0 previews**, now attached to the existing latest GitHub release `v1.1.0` at the owner’s request. Download buttons link directly to those release assets; matching local copies are retained. No tag was moved or created. The page does not claim that Tesseract is bundled, encryption is automatic, sync is available, or macOS is validated. Website access is public, as explicitly requested by the owner on 2026-10-16.

## Validation

JavaScript syntax, real-browser navigation/gallery/dialog/FAQ interactions, keyboard selection and focus restoration, internal anchors, 390px/320px responsive layout, image loading and local download integrity were checked. Evidence and browser-specific details are recorded in `qa/`. No public audience change or official desktop release is part of this site.

Future edits should use the same Sites identity, preserve the current public audience, update screenshots from the real app, and replace preview downloads only with artifacts from a successful native validation run.
