# Website delivery — 2026-10-16

[Open the private SnapNote product site](https://snapnote-workspace.grittybloom257.chatgpt.site).

Created from scratch on `website/product-site`, following the existing desktop redesign and the green primary-platform gate: [Windows run 38856921850](https://github.com/Waqar-743/SnapNote/actions/runs/38856921850). Existing desktop code was reused and improved; the website is a separate buildless project under `website/`.

## Delivered

- A calm slate/blue visual direction, editorial typography, the owner-selected A Mentor teaching illustration and matching clipboard mark.
- Actual desktop screenshots with light/dark selection and accessible image zoom, plus a real floating-panel screenshot. Screenshot captions identify Linux and illustrative content.
- Concrete capture/search/organization, notes and image workflows; privacy controls and optional encryption; beginner-facing FAQs.
- Functional Windows x64 EXE/MSI downloads, copied unchanged from the validated production artifacts for app commit `20a3214`. The site labels them unsigned v1.2.0 previews and records exact hashes in `website/dist/downloads/checksums.json`.
- Responsive layouts, mobile navigation, keyboard screenshot tabs, Escape/focus handling, reduced-motion support and native FAQ disclosure. No framework runtime, external fonts or analytics.

[Local preview instructions](../website/README.md) and [browser evidence](../website/qa/README.md) are included. Eight Chromium workflow checks and seven supplementary WebKit checks pass. Both real browser downloads match the validated artifact sizes and SHA-256 checksums. Visual review covered the desktop page and direct 390px Chromium viewport; layout overflow checks include 320px.

## Deployment record

Published privately with the Sites plugin; audience was not changed. The native deployment status returned `succeeded` with the URL above.

| Field | Exact value |
| --- | --- |
| Project | `appgprj_6ad1ba34b9148191841f6f5129c84c5f` |
| Hosted source commit | `08fdfae542ef6356a8f5c0cebe10cd0875857f20` |
| Saved version | `appgprj_6ad1ba34b9148191841f6f5129c84c5f~appgver_cc8993f274b081919871c23a5cc762b6` |
| Deployment | `appgdep_6ad1bd4d24b081919c448e3c05959a2b` |
| Source manifest | `website/.openai/hosting.json` |

Future publication must reuse this exact Site identity and retain its current audience. The hosted source is a separate repository managed by the Sites source helper; `website/` preserves a matching authored source copy in the product repository. Do not run the helper from the root desktop repository or substitute its Git remote.

## Remaining scope

Optional sync is deferred. OCR needs a separately installed Tesseract engine. macOS runtime validation, signed desktop releases, tray behavior, automatic locking and per-app capture exclusions remain later work. These are disclosed where relevant and are not presented as shipping features on the website. No official desktop version tag, release publication or PR merge was performed.
