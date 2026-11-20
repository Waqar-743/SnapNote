# SnapNote Product Website

A fast, zero-build static product website in `dist/`, published automatically to [GitHub Pages](https://waqar-743.github.io/SnapNote/) from `main` via [`.github/workflows/deploy-website.yml`](../.github/workflows/deploy-website.yml).

## Design & Typography

- **Typography:** Paired `Plus Jakarta Sans` (display headings & two-tone `SnapNote` wordmark), `Inter` (body copy), and `JetBrains Mono` (keyboard shortcuts, snippet `{{variables}}`, and PowerShell SHA-256 verification commands), with crisp system fallbacks.
- **Themes:** Full light and dark theme toggle with `prefers-color-scheme` detection and persistent preference, plus an interactive Hero app showcase switching between real Light workspace, Dark workspace, and `Alt+X` Quick Access screenshots.
- **Layout:** Hero with live release badge, 4-column metrics strip, bento feature grid, dark Quick Access spotlight with keyboard shortcuts, real interface gallery, privacy & cloud-comparison table, Download Hub with 1-click PowerShell SHA-256 copy, FAQ accordion, and structured multi-column footer.

## SEO & Backlinks

- Complete meta tags: canonical URL, `hreflang`, `robots` (`max-image-preview:large`), Open Graph, and Twitter/X cards with `1200×630` social banner.
- Rich JSON-LD `@graph` structured data: `WebSite`, `Person`, `BreadcrumbList`, `SoftwareApplication`, `HowTo`, and `FAQPage` (8 questions matching the visible FAQ).
- Bidirectional backlinks connecting the [product website](https://waqar-743.github.io/SnapNote/), [GitHub repository](https://github.com/Waqar-743/SnapNote), [Releases](https://github.com/Waqar-743/SnapNote/releases), documentation, developer profile, and core open-source dependencies (Tauri v2, TipTap, Tesseract OCR).
- Up-to-date `robots.txt` and `sitemap.xml`.

## Preview Locally

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Then open `http://127.0.0.1:4173/`. Run `node --check dist/app.js` to validate JavaScript syntax.
