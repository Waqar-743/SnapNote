# SnapNote

A local-first smart clipboard and visual workspace, evolved from the existing Tauri + React + TipTap desktop app.

Windows is the primary target. The existing application identity and rich-text note format are retained so an upgrade can find the original notes. New workspace data uses transactional IndexedDB storage in the app’s device profile.

## Desktop capabilities

- Opt-in automatic history for text and images, duplicate suppression, exact text whitespace, and copy-back to the system clipboard.
- Search across clip titles, content, tags, and extracted image text; separate note search.
- Favorites, folders, tags, reusable snippets with `{{variables}}`, and grouped sessions.
- Multi-select text clips for combined copying or session grouping.
- Alt+S floating quick access, optional always-on-top workspace, and image-only pinned windows.
- Image crop and drawing annotation, saved as a new clip so the original is kept.
- Local OCR through Tesseract, both in image details and in the retained rich note editor.
- Multiple notes, rename/close, rich formatting, headings, lists, task lists, code blocks, undo/redo, and image paste.
- Light/dark themes, capture pause, bounded recent history, and protected favorites/organized content.
- Optional password encryption of the live workspace, lock/unlock, password-encrypted backups, and validated merge imports.

Sync is not connected or implemented. The app makes no account, cloud, or telemetry requests. OCR requires Tesseract and its language data on the device; it is not currently bundled in the installer. No automatic paste injection into other apps is implemented: copy a clip, then paste normally in the destination app.

## Development

Run commands from `snapnote/`:

```bash
npm ci
npm run tauri dev
```

Use Node 20.19+ (or a current Node 22/24 release), current stable Rust, and the [Tauri platform prerequisites](https://v2.tauri.app/start/prerequisites/). On Windows, the installer build requires Visual Studio C++ Build Tools and WebView2. For OCR, install Tesseract, add its directory to `PATH`, and restart SnapNote.

```bash
npm test
npm run format:check
npm run build
cargo test --manifest-path src-tauri/Cargo.toml --locked
npm run tauri build
```

The Windows workflow builds installers and runs storage/native helper checks, then builds an isolated test application for native clipboard, image, shortcut, and persistence testing. Publishing release assets remains restricted to version tags.

## Shortcuts

| Shortcut | Action |
| --- | --- |
| Alt+S | Open floating quick access |
| Ctrl+Alt+C | Capture clipboard into the active rich note |
| Ctrl+Alt+O | Show/focus SnapNote |
| Ctrl+K | Search clips |
| Ctrl+B / I / U | Bold / italic / underline in notes |
| Ctrl+Shift+X / H | Strikethrough / highlight in notes |
| Ctrl+Z / Ctrl+Shift+Z | Undo / redo in notes |
| Escape | Close the current detail, dialog, or quick panel |

The retained macOS paths use Command instead of Ctrl. A reserved global shortcut is reported in the UI without preventing startup.

## Data compatibility and privacy

The identifier remains `come.codespace.snapnote`. Original `snapnote-tabs` records are read on first migration and kept as a recovery copy during normal use. New changes are written to the new transactional store; they are not backported to the old localStorage records. Storage failures are shown rather than silently discarded.

Enabling live workspace encryption atomically rewrites stored entities using AES-256-GCM with PBKDF2-SHA256, then removes the old plaintext note copies after explicit confirmation. The password is required on the next launch and cannot be recovered. Encryption protects the persisted workspace; unlocked content and the operating system clipboard remain usable in memory. Keep backups separately.

Clear recent history preserves notes, favorites, snippets, and organized clips. Import merges content and preserves conflicting notes under new identities. Backup export uses a unique filename in Downloads; unencrypted export is plain JSON, and an optional backup password encrypts it.

## Design and validation

- [Recovered progress and remaining work](docs/PROJECT-STATUS.md)
- [Desktop user guide](docs/DESKTOP-GUIDE.md)
- [Architecture audit and delivery strategy](docs/DESKTOP-STRATEGY.md)
- [Selected snowy wolf mascot and alternatives](docs/brand/README.md)
- [Validation evidence](docs/testing/README.md)

The owner selected **A — The Mentor**. The product website is published from `website/dist` through a GitHub Pages workflow and lives at [https://waqar-743.github.io/SnapNote/](https://waqar-743.github.io/SnapNote/), or see [website source and local preview instructions](website/README.md) and [delivery details](docs/WEBSITE-DELIVERY.md). The validated v1.2.0 Windows installers (MSI + EXE) with SHA-256 checksums are attached to the [v1.2.0 release](https://github.com/Waqar-743/SnapNote/releases/tag/v1.2.0).
