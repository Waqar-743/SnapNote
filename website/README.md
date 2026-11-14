# SnapNote product website

A buildless product site in `dist/`, published to [GitHub Pages](https://waqar-743.github.io/SnapNote/) from `main`. No framework, build step, external fonts or analytics are required.

The 2026-11-14 redesign (issue [#9](https://github.com/Waqar-743/SnapNote/issues/9)) is built around **real application screenshots** instead of illustrations and interactive mockups. The mascot section was removed, the copy was rewritten to be concrete and professional, and the page weight dropped by ~1.5 MB. The warm paper, espresso and terracotta palette is kept as the brand.

## Structure

- Hero with the real light-theme workspace screenshot and honest value proposition.
- Eight feature cards covering clipboard history, quick access, notes, snippets, image tools, organization, encryption and backups.
- Quick access section with the real Alt+X window screenshot and a three-step start guide.
- A screenshots gallery (light and dark themes) captured from the running app.
- Privacy section with a concrete no-account/no-cloud/no-telemetry pledge.
- Download section with dynamic release resolution (MSI, EXE, checksums).
- FAQ that matches the `FAQPage` structured data.

## SEO

The site ships complete metadata: canonical URL, descriptive title and meta description, Open Graph and Twitter card tags with a generated 1200x630 social banner, `SoftwareApplication` / `WebSite` / `FAQPage` JSON-LD structured data, `robots.txt` and `sitemap.xml`. All screenshots carry descriptive `alt` text and explicit dimensions.

## Preview

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open `http://127.0.0.1:4173`. Relative assets also work under GitHub Pages' `/SnapNote/` subpath.

## Downloads

Header and hero downloads point to GitHub's `/releases/latest`. MSI, EXE and checksum links start with the same working fallback, then resolve the exact installer assets using the public latest-release API. The displayed version comes from that response. API failures or disabled JavaScript leave the latest-release page accessible; no old version is hardcoded into the website.

## Verification and publishing

See [issue-9 QA results](qa/issue-9-results.json) for the redesign verification: rendered desktop and mobile captures, asset reference checks, JSON-LD validation and JavaScript syntax checks. `node --check dist/app.js` checks progressive JavaScript. `.github/workflows/deploy-website.yml` publishes `website/dist/` when it changes on `main`.
