# Using SnapNote

## Start with a clip

Launch the desktop app. Capture starts paused on a new workspace. SnapNote opens as a small **quick-access** window with every navigation icon in the header, so a compact window is enough for everyday borrowing and copying. Use **Open workspace** whenever you want the full room; the window grows with you. Copy text or an image in another app, return to SnapNote, and select **Capture now**. Enable automatic capture if you want SnapNote to keep supported clipboard changes while it is running. Pause before copying private material.

Select a clip to inspect or edit it, then use **Copy clip**. Paste normally in your destination app. SnapNote preserves text indentation and line breaks. Copying the same content again reuses its clip rather than creating another entry.

## Find and organize

Use **Ctrl+K** to search titles, text, tags and text extracted from images. Add a favorite for quick retrieval, create folders for projects, or select multiple clips and choose **Group in session**. Folder/session names can be changed; removing a collection keeps its clips.

Select multiple text clips and choose **Copy text together** to copy them separated by blank lines. Images can belong to a session too, but combined copying currently supports text only.

Mark text as a reusable snippet in its details. Use placeholders such as `Hello {{name}}` to create a template. **Copy template** asks for each value and keeps the saved template unchanged.

## Work with images

Select an image for **Extract text**, **Edit image**, or **Pin to screen**. Extracted text becomes searchable and can be copied separately. Draw annotations or select and apply a crop; saving creates another clip and keeps the source image. Editing resizes images larger than 4096 pixels. Pinning opens an image window above other apps.

OCR works locally and needs Tesseract with its language data installed and available on `PATH`. It is not bundled in the current installer. Restart SnapNote after installing it. Missing OCR dependencies produce an error without removing the image.

## Keep writing in notes

Your existing rich-text notes remain in **Notes**. Create, rename, switch and close notes with their tab controls. Formatting, lists, tasks, code, undo/redo, image paste and inline OCR are retained. Note search is separate from clip search. Closing a nonempty note asks before deleting it; keep a backup if you need it later.

## Reach the workspace quickly

- **Alt+X:** floating quick access. **Open workspace** restores the full window.
- **Ctrl+Alt+C:** deliberately capture the current clipboard into the active rich note.
- **Ctrl+Alt+O:** show and focus SnapNote.
- **Escape:** close the current dialog, detail pane or quick panel.

Use Command in place of Ctrl on macOS. Shortcut conflicts appear in the app and do not prevent startup. Closing the main window saves your work and keeps SnapNote in the system tray, so **Alt+X brings the quick window back at any time** — even if you have not looked at SnapNote in a while. Choose **Quit SnapNote** in the tray menu to exit completely; shortcuts and capture rest until you start the app again.

## Privacy, passwords and backups

**Settings & privacy** controls capture, retention and floating behavior. Ordinary history pruning and **Clear recent history** preserve notes, favorites, snippets and clips assigned to a folder or session.

Optional workspace encryption protects the stored notes and clips with a password. It removes preserved plaintext legacy note copies after your confirmation and a successful encrypted save. Keep the password: there is no password recovery. **Lock workspace now** pauses capture, closes pinned image windows and hides the workspace until you unlock it. Unlocked content and the operating system clipboard remain accessible in memory; locking does not erase the system clipboard.

**Export backup** saves a new file to Downloads. Enter a separate backup password for an encrypted export, or leave it blank for readable JSON. Test a restore and keep copies outside this device. To restore, provide the backup password if needed, then select **Import backup**. Imports merge content, preserve conflicting notes as separate notes and reject invalid or over-capacity results before changing your data.

The offline core makes no account, cloud or telemetry requests. Sync is not implemented. The app currently has no per-app exclusions or automatic lock; the tray keeps it reachable without a visible window.
