# SnapNote product website

A buildless product website using semantic HTML, CSS and progressive JavaScript. No installation or build step is required. The 2026-10-16 mentor redesign is professional, story-driven and personal: a warm paper-and-espresso world with terracotta, olive and amber accents, serif headlines and real product imagery. The palette contains no blue or pink anywhere.

## Preview

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open `http://127.0.0.1:4173`. References are relative, including assets, so the website also works at GitHub Pages’ `/SnapNote/` subpath.

## Design and behavior

- `dist/index.html`: sticky paper header with the brand mark, a storytelling hero (“A quiet place for everything you copy.”), an Alt+X quick-access chapter beside the real 560×640 quick window screenshot, a dark Meet-the-Mentor chapter with the teaching wolf, a three-chapter “day you’ll recognise” story illustrated with the owner’s lamplit-desk art set, a bento feature grid pairing the dark workspace screenshot with the illustrated cells, a plain-words privacy pledge with the golden-padlock illustration and a ledger, an amber-on-night v1.4.0 download band with first steps, and five honest FAQ disclosures.
- `dist/styles.css`: the full design system — paper/espresso/terracotta palette, serif running heads, framed screenshot cards with captions and soft shadows, full-bleed illustration tops for chapter and feature cards, responsive layout down to 320px, visible focus styles and reduced-motion support.
- `dist/app.js`: progressive enhancement only — footer year, mobile navigation and a gentle IntersectionObserver reveal. The page is fully readable with JavaScript disabled.
- `dist/assets/`: product truth and the owner’s illustration set side by side — `logo-dark.png` (light surfaces) and `logo-original.png` (footer), the validated screenshots `quick-access.png`, `workspace-light.png`, `workspace-dark.png`, the Mentor cutout `mentor-teaching.png`, and the warm art set (`hero-desk.jpg`, `drawer.jpg`, `reply-cards.jpg`, `text-extraction.jpg`, `clipped-notes.jpg`, `starred-note.jpg`, `archive-box.jpg`, `alt-x-notes.jpg`, `padlock.jpg`, `notepad-icon.jpg`) resized and JPEG-optimised from `images/` in the repository.

## Downloads and product details

MSI, EXE and SHA-256 links point at the v1.4.0 Windows release assets. The page retains the unsigned-build notice and makes clear that capture starts paused, workspace encryption is optional, OCR needs a separate Tesseract installation, sync is unavailable, Alt+X survives window close via the system tray, and quitting from the tray stops the shortcut. No testimonials, usage statistics or personal founder claims are invented.

## Publishing

- GitHub Pages: `https://waqar-743.github.io/SnapNote/`, published from `website/dist/` on `main` via `.github/workflows/deploy-website.yml`.
- See `qa/redesign-results.json` for verification of this design.
