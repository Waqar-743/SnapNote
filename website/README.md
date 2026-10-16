# SnapNote product website

A buildless product website using semantic HTML, CSS and progressive JavaScript. No installation or build step is required. The 2026-10-16 mentor redesign is professional, story-driven and personal: a warm paper-and-espresso world with terracotta, olive and amber accents, serif headlines and real product imagery. The palette contains no blue or pink anywhere.

## Preview

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open `http://127.0.0.1:4173`. References are relative, including assets, so the website also works at GitHub Pages’ `/SnapNote/` subpath.

## Design and behavior

- `dist/index.html`: sticky paper header with the brand mark, a storytelling hero (“A quiet place for everything you copy.”), an Alt+X quick-access chapter beside the real 560×640 quick window screenshot, a dark Meet-the-Mentor chapter with the teaching wolf, a three-chapter “day you’ll recognise” story, a bento feature grid with both workspace themes, a plain-words privacy pledge with a ledger, an amber-on-night v1.4.0 download band with first steps, and five honest FAQ disclosures.
- `dist/styles.css`: the full design system — paper/espresso/terracotta palette, serif running heads, framed screenshot cards with captions and soft shadows, responsive layout down to 320px, visible focus styles and reduced-motion support.
- `dist/app.js`: progressive enhancement only — footer year, mobile navigation and a gentle IntersectionObserver reveal. The page is fully readable with JavaScript disabled.
- `dist/assets/logo-dark.png`: the brand mark for light backgrounds (header, footer variant already covered by `logo-original.png`). The Mentor cutout (`mentor-teaching.png`) and the validated app screenshots (`quick-access.png`, `workspace-light.png`, `workspace-dark.png`) are shown in the page itself, not archived.

## Downloads and product details

MSI, EXE and SHA-256 links point at the v1.4.0 Windows release assets. The page retains the unsigned-build notice and makes clear that capture starts paused, workspace encryption is optional, OCR needs a separate Tesseract installation, sync is unavailable, Alt+X survives window close via the system tray, and quitting from the tray stops the shortcut. No testimonials, usage statistics or personal founder claims are invented.

## Publishing

- GitHub Pages: `https://waqar-743.github.io/SnapNote/`, published from `website/dist/` on `main` via `.github/workflows/deploy-website.yml`.
- See `qa/redesign-results.json` for verification of this design.
