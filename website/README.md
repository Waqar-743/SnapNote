# SnapNote product website

A buildless product website using semantic HTML, CSS and progressive JavaScript. No installation or build step is required. The 2026-10-16 redesign uses a dark forest-and-amber editorial theme — near-black green, warm cream, amber, ember and olive — with system sans-serif, serif and monospace typography. The palette contains no blue or pink anywhere, including the favicon.

## Preview

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open `http://127.0.0.1:4173`. References are relative, including assets, so the website also works at GitHub Pages’ `/SnapNote/` subpath.

## Design and behavior

- `dist/index.html`: dark hero with a quick-access demo card and floating shortcut chips, a marquee ticker strip, a three-part everyday story with tabs, a rounded bento workspace panel, a dark privacy chapter, FAQs, an amber download band and footer.
- `dist/styles.css`: the full design system — light/dark section rhythm, responsive layout down to 320px, visible focus styles, reduced-motion support (ticker, progress bar and transitions disabled).
- `dist/app.js`: scroll-progress bar, section-aware navigation highlighting, mobile navigation, accessible story tabs with arrow/Home/End keyboard navigation, and linked OCR answer disclosure.
- `dist/assets/logo-original.png`: unchanged copy of the repository’s original `SnapNote-logo-white.png`, shown on cream tiles in the header and footer.
- `dist/assets/favicon.svg`: an amber notebook-and-pencil mark drawn for this redesign; it replaces the earlier blue rounded-square icon.

The interactive story uses explicitly labeled illustrative content. Product screenshots and mascot art from earlier designs remain archived in assets but are not displayed.

## Downloads and product details

MSI and EXE links retain the validated v1.2.0 Windows release assets. The page retains the unsigned-preview notice and makes clear that capture starts paused, workspace encryption is optional, OCR needs a separate Tesseract installation, and sync is unavailable. No testimonials, usage statistics or personal founder claims are invented.

## Publishing

- GitHub Pages: `https://waqar-743.github.io/SnapNote/`, published from `website/dist/` on `main` via `.github/workflows/deploy-website.yml`.
- Sites: `https://snapnote-workspace.grittybloom257.chatgpt.site`, retaining the project identity in `.openai/hosting.json` and its existing public audience.

See `qa/redesign-results.json` for verification of this design.
