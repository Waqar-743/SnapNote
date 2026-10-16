# Website delivery — 2026-10-16

[Open the public SnapNote product site](https://snapnote-workspace.grittybloom257.chatgpt.site).

Created from scratch on `website/product-site`, following the existing desktop redesign and the green primary-platform gate: [Windows run 38856921850](https://github.com/Waqar-743/SnapNote/actions/runs/38856921850). Existing desktop code was reused and improved; the website is a separate buildless project under `website/`.

Review: [website draft PR #4](https://github.com/Waqar-743/SnapNote/pull/4), based on the [desktop draft PR #3](https://github.com/Waqar-743/SnapNote/pull/3). After the desktop PR is merged, retarget the website PR to `main`.

## Delivered

- A calm slate/blue visual direction, editorial typography, the owner-selected A Mentor teaching illustration and matching clipboard mark.
- Actual desktop screenshots with light/dark selection and accessible image zoom, plus a real floating-panel screenshot. Screenshot captions identify Linux and illustrative content.
- Concrete capture/search/organization, notes and image workflows; privacy controls and optional encryption; beginner-facing FAQs.
- Functional Windows x64 EXE/MSI downloads from validated production artifacts for app commit `224687e`, attached to the owner's existing latest GitHub release `v1.1.0`. The site labels them unsigned v1.2.0 previews and records exact hashes in `website/dist/downloads/checksums.json`.
- Responsive layouts, mobile navigation, keyboard screenshot tabs, Escape/focus handling, reduced-motion support and native FAQ disclosure. No framework runtime, external fonts or analytics.

[Local preview instructions](../website/README.md) and [browser evidence](../website/qa/README.md) are included. Eight Chromium workflow checks and seven supplementary WebKit checks pass. Both real browser downloads match the validated artifact sizes and SHA-256 checksums. Visual review covered the desktop page and direct 390px Chromium viewport; layout overflow checks include 320px.

## Deployment record

Initially published privately with the Sites plugin. After the owner reported a 404 and explicitly chose **public**, access was changed to `public` (policy revision 2). Anonymous HTTP and a fresh Chromium session now load the product page and assets successfully without signing in. [Live verification](testing/public-website/results.json), [desktop screenshot](testing/public-website/public-desktop.png), [mobile screenshot](testing/public-website/public-mobile.png).

| Field | Exact value |
| --- | --- |
| Project | `appgprj_6ad1ba34b9148191841f6f5129c84c5f` |
| Hosted source commit | `b6380fb65d7879d75eb20d0047eb488febc2d864` |
| Saved version | `appgprj_6ad1ba34b9148191841f6f5129c84c5f~appgver_012a50d55bb88191924919ecfffa8856` (version 3) |
| Deployment | `appgdep_6ad1c31064708191a0c2f5cb0ed75abd` — succeeded |
| Source manifest | `website/.openai/hosting.json` |

Future publication must reuse this exact Site identity and retain its current **public** audience. Use the normal saved-version/deploy flow for a public Site, not owner-private deployment tools. The hosted source is a separate repository managed by the Sites source helper; `website/` preserves a matching authored source copy in the product repository. Do not run the helper from the root desktop repository or substitute its Git remote.

## Completed release upload

The owner explicitly requested that the compiled installers be added to the existing latest release. The [v1.1.0 release](https://github.com/Waqar-743/SnapNote/releases/tag/v1.1.0) now also includes `SnapNote_1.2.0_x64-setup.exe`, `SnapNote_1.2.0_x64_en-US.msi` and `SnapNote_1.2.0_SHA256SUMS.txt`, from green run `38858824546`. Server-reported uploaded sizes and SHA-256 digests match the build outputs. [Release receipt](releases/windows-1.2.0.json).

Release notes explain that the newly attached Windows files contain v1.2.0 while the existing tag, source archives and older Linux assets remain v1.1.0. Website download buttons now link directly to the verified release assets; matching local copies are retained. No release assets were removed or overwritten.

## Remaining scope

Optional sync is deferred. OCR needs a separately installed Tesseract engine. macOS runtime validation, signed desktop releases, tray behavior, automatic locking and per-app capture exclusions remain later work. These are disclosed where relevant and are not presented as shipping features on the website. The existing latest release was updated at the owner's request; no desktop version tag was created or moved, and no PR was merged.
