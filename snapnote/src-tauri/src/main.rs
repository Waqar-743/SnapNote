// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    collections::{hash_map::DefaultHasher, HashMap},
    fs,
    hash::{Hash, Hasher},
    io::Cursor,
    io::Write,
    process::Command,
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    time::Duration,
};

use base64::{engine::general_purpose::STANDARD, Engine};
use image::{DynamicImage, ImageBuffer, ImageFormat, Rgba};
use rusty_tesseract::{image_to_string, Args, Image};
use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

const MAX_IMAGE_BYTES: usize = 8_000_000;
const MAX_TEXT_BYTES: usize = 1_000_000;

#[derive(Default)]
struct WorkspaceState {
    capture: AtomicBool,
    quick_access: AtomicBool,
    quick_shortcut_down: AtomicBool,
    clipboard_lock: Mutex<()>,
    fingerprint: Mutex<Option<u64>>,
    sequence: Mutex<Option<u32>>,
    warnings: Mutex<Vec<String>>,
    pinned: Mutex<HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ClipboardCaptured {
    #[serde(rename = "type")]
    payload_type: String,
    data: String,
}

#[cfg(target_os = "windows")]
fn clipboard_sequence() -> Option<u32> {
    #[link(name = "user32")]
    unsafe extern "system" {
        fn GetClipboardSequenceNumber() -> u32;
    }
    Some(unsafe { GetClipboardSequenceNumber() })
}

#[cfg(not(target_os = "windows"))]
fn clipboard_sequence() -> Option<u32> {
    None
}

fn capture_shortcut_for_platform() -> Shortcut {
    #[cfg(target_os = "macos")]
    {
        Shortcut::new(Some(Modifiers::META | Modifiers::ALT), Code::KeyC)
    }

    #[cfg(not(target_os = "macos"))]
    {
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyC)
    }
}

fn show_app_shortcut_for_platform() -> Shortcut {
    #[cfg(target_os = "macos")]
    {
        Shortcut::new(Some(Modifiers::META | Modifiers::ALT), Code::KeyO)
    }

    #[cfg(not(target_os = "macos"))]
    {
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyO)
    }
}

fn quick_access_shortcut() -> Shortcut {
    Shortcut::new(Some(Modifiers::ALT), Code::KeyX)
}

/// Surface the main window on demand, even if it was hidden from the tray or never shown.
fn show_main_window(app: &tauri::AppHandle, open_quick_access: bool) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        if open_quick_access {
            let _ = window.emit("quick-access", ());
        }
    }
}

/// Dismiss the active quick window; otherwise bring quick access to the foreground.
fn toggle_quick_access(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let state = app.state::<WorkspaceState>();
        if state.quick_access.load(Ordering::SeqCst)
            && window.is_visible().unwrap_or(false)
            && !window.is_minimized().unwrap_or(true)
            && window.is_focused().unwrap_or(false)
        {
            if let Err(error) = window.hide() {
                let _ = window.emit("clipboard-warning", error.to_string());
            }
            return;
        }
        show_main_window(app, true);
    }
}

#[tauri::command]
fn set_quick_access(app: tauri::AppHandle, enabled: bool) {
    app.state::<WorkspaceState>()
        .quick_access
        .store(enabled, Ordering::SeqCst);
}

fn fingerprint<T: Hash + ?Sized>(kind: &str, data: &T) -> u64 {
    let mut hasher = DefaultHasher::new();
    kind.hash(&mut hasher);
    data.hash(&mut hasher);
    hasher.finish()
}

fn image_fingerprint(width: u32, height: u32, rgba: &[u8]) -> u64 {
    fingerprint("image", &(width, height, rgba))
}

fn capture_clipboard_payload(
    app: &tauri::AppHandle,
    known: Option<u64>,
) -> Result<Option<(u64, ClipboardCaptured)>, String> {
    if let Ok(image) = app.clipboard().read_image() {
        if image.rgba().len() > 64_000_000 {
            return Err("Clipboard image is too large (maximum 16 megapixels).".into());
        }
        let hash = image_fingerprint(image.width(), image.height(), image.rgba());
        if known == Some(hash) {
            *app.state::<WorkspaceState>()
                .sequence
                .lock()
                .map_err(|_| "Clipboard state unavailable")? = clipboard_sequence();
            return Ok(None);
        }
        let rgba = ImageBuffer::<Rgba<u8>, Vec<u8>>::from_raw(
            image.width(),
            image.height(),
            image.rgba().to_vec(),
        )
        .ok_or_else(|| "Clipboard image conversion failed".to_string())?;
        let mut png_data = Vec::new();
        DynamicImage::ImageRgba8(rgba)
            .write_to(&mut Cursor::new(&mut png_data), ImageFormat::Png)
            .map_err(|e| e.to_string())?;
        if png_data.len() > MAX_IMAGE_BYTES {
            return Err("Clipboard image exceeds the 8 MB limit.".into());
        }
        return Ok(Some((
            hash,
            ClipboardCaptured {
                payload_type: "image".into(),
                data: format!("data:image/png;base64,{}", STANDARD.encode(png_data)),
            },
        )));
    }
    if let Ok(text) = app.clipboard().read_text() {
        if text.is_empty() {
            return Ok(None);
        }
        if text.len() > MAX_TEXT_BYTES {
            return Err("Clipboard text exceeds the 1 MB limit.".into());
        }
        let hash = fingerprint("text", &text);
        if known == Some(hash) {
            *app.state::<WorkspaceState>()
                .sequence
                .lock()
                .map_err(|_| "Clipboard state unavailable")? = clipboard_sequence();
            return Ok(None);
        }
        return Ok(Some((
            hash,
            ClipboardCaptured {
                payload_type: "text".into(),
                data: text,
            },
        )));
    }
    Ok(None)
}

#[tauri::command]
fn configure_capture(app: tauri::AppHandle, enabled: bool) {
    app.state::<WorkspaceState>()
        .capture
        .store(enabled, Ordering::SeqCst);
}

#[tauri::command]
fn native_status(app: tauri::AppHandle) -> Vec<String> {
    app.state::<WorkspaceState>()
        .warnings
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .clone()
}

#[tauri::command]
async fn read_clipboard(app: tauri::AppHandle) -> Result<ClipboardCaptured, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<WorkspaceState>();
        let _guard = state
            .clipboard_lock
            .lock()
            .map_err(|_| "Clipboard is busy")?;
        capture_clipboard_payload(&app, None)?
            .map(|(_, payload)| payload)
            .ok_or_else(|| "The clipboard contains no supported text or image.".into())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn write_clipboard(app: tauri::AppHandle, payload: ClipboardCaptured) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<WorkspaceState>();
        let _guard = state
            .clipboard_lock
            .lock()
            .map_err(|_| "Clipboard is busy")?;
        let hash;
        match payload.payload_type.as_str() {
            "text" => {
                if payload.data.len() > MAX_TEXT_BYTES {
                    return Err("Text exceeds the 1 MB limit.".into());
                }
                hash = fingerprint("text", &payload.data);
                app.clipboard()
                    .write_text(payload.data)
                    .map_err(|e| e.to_string())?;
            }
            "image" => {
                let decoded = decode_image(&payload.data)?;
                let rgba = decoded.to_rgba8();
                hash = image_fingerprint(rgba.width(), rgba.height(), rgba.as_raw());
                app.clipboard()
                    .write_image(&tauri::image::Image::new_owned(
                        rgba.as_raw().clone(),
                        rgba.width(),
                        rgba.height(),
                    ))
                    .map_err(|e| e.to_string())?;
            }
            _ => return Err("Unsupported clipboard format.".into()),
        }
        *state
            .fingerprint
            .lock()
            .map_err(|_| "Clipboard state is unavailable")? = Some(hash);
        *state
            .sequence
            .lock()
            .map_err(|_| "Clipboard state is unavailable")? = clipboard_sequence();
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

fn decode_image(data: &str) -> Result<DynamicImage, String> {
    if data.len() > 12_000_000 {
        return Err("Image exceeds the 8 MB limit.".into());
    }
    let (prefix, encoded) = data.split_once(',').ok_or("Invalid image data")?;
    if ![
        "data:image/png;base64",
        "data:image/jpeg;base64",
        "data:image/webp;base64",
    ]
    .contains(&prefix)
    {
        return Err("Unsupported image format.".into());
    }
    let bytes = STANDARD.decode(encoded).map_err(|e| e.to_string())?;
    let mut reader = image::ImageReader::new(Cursor::new(bytes))
        .with_guessed_format()
        .map_err(|e| e.to_string())?;
    let mut limits = image::Limits::default();
    limits.max_image_width = Some(8192);
    limits.max_image_height = Some(8192);
    limits.max_alloc = Some(64_000_000);
    reader.limits(limits);
    reader.decode().map_err(|e| e.to_string())
}

#[tauri::command]
fn set_floating(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    app.get_webview_window("main")
        .ok_or("Main window unavailable")?
        .set_always_on_top(enabled)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn pin_image(app: tauri::AppHandle, data: String) -> Result<(), String> {
    decode_image(&data)?;
    let state = app.state::<WorkspaceState>();
    let mut pinned = state
        .pinned
        .lock()
        .map_err(|_| "Image window unavailable")?;
    if pinned.len() >= 6 {
        return Err("Close a pinned image before opening another (maximum 6).".into());
    }
    let label = format!(
        "pin-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_nanos()
    );
    pinned.insert(label.clone(), data);
    drop(pinned);
    let builder =
        WebviewWindowBuilder::new(&app, &label, WebviewUrl::App("index.html?pin=1".into()))
            .title("SnapNote · Pinned image")
            .inner_size(480.0, 360.0)
            .always_on_top(true);
    // WebView2 windows sharing a profile need identical browser arguments.
    #[cfg(target_os = "windows")]
    let builder = match app
        .config()
        .app
        .windows
        .first()
        .and_then(|window| window.additional_browser_args.as_deref())
    {
        Some(arguments) => builder.additional_browser_args(arguments),
        None => builder,
    };
    let result = builder.build();
    match result {
        Ok(window) => {
            let handle = app.clone();
            let key = label.clone();
            window.on_window_event(move |event| {
                if matches!(event, tauri::WindowEvent::Destroyed) {
                    if let Ok(mut pinned) = handle.state::<WorkspaceState>().pinned.lock() {
                        pinned.remove(&key);
                    }
                }
            });
            Ok(())
        }
        Err(error) => {
            if let Ok(mut pinned) = state.pinned.lock() {
                pinned.remove(&label);
            }
            Err(error.to_string())
        }
    }
}

#[tauri::command]
fn pinned_image(window: tauri::WebviewWindow, app: tauri::AppHandle) -> Result<String, String> {
    app.state::<WorkspaceState>()
        .pinned
        .lock()
        .map_err(|_| "Image unavailable")?
        .get(window.label())
        .cloned()
        .ok_or_else(|| "Pinned image is no longer available.".into())
}

fn close_all_pinned_images(app: &tauri::AppHandle) -> Result<(), String> {
    // Window destruction also updates the map, so release its mutex before closing.
    let labels: Vec<String> = app
        .state::<WorkspaceState>()
        .pinned
        .lock()
        .map_err(|_| "Pinned image state unavailable")?
        .keys()
        .cloned()
        .collect();
    for label in labels {
        if let Some(window) = app.get_webview_window(&label) {
            window.close().map_err(|e| e.to_string())?;
        }
    }
    app.state::<WorkspaceState>()
        .pinned
        .lock()
        .map_err(|_| "Pinned image state unavailable")?
        .clear();
    Ok(())
}

#[tauri::command]
fn close_pinned_images(app: tauri::AppHandle) -> Result<(), String> {
    close_all_pinned_images(&app)
}

/// Closing the main window keeps SnapNote resident so Alt+X reopens it at any time.
#[tauri::command]
fn finish_close(app: tauri::AppHandle) -> Result<(), String> {
    close_all_pinned_images(&app)?;
    let window = app
        .get_webview_window("main")
        .ok_or("Main window unavailable")?;
    window.hide().map_err(|e| e.to_string())
}

#[tauri::command]
async fn export_backup(app: tauri::AppHandle, data: String) -> Result<String, String> {
    if data.len() > 200_000_000 {
        return Err("Backup exceeds 200 MB.".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let directory = app.path().download_dir().map_err(|e| e.to_string())?;
        fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
        let stamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_nanos();
        let path = directory.join(format!("SnapNote-backup-{stamp}.json"));
        let mut options = fs::OpenOptions::new();
        options.write(true).create_new(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.mode(0o600);
        }
        let mut file = options.open(&path).map_err(|e| e.to_string())?;
        file.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
        file.sync_all().map_err(|e| e.to_string())?;
        Ok(path.to_string_lossy().into_owned())
    })
    .await
    .map_err(|e| e.to_string())?
}

fn ensure_tesseract_available() -> Result<(), String> {
    match Command::new("tesseract").arg("--version").output() {
        Ok(output) if output.status.success() => Ok(()),
        Ok(_) | Err(_) => Err(
            "OCR engine not available. Install Tesseract and restart the app. Linux: `sudo apt install tesseract-ocr`, macOS: `brew install tesseract`, Windows: install Tesseract and add it to PATH.".to_string(),
        ),
    }
}

#[tauri::command]
async fn extract_text_from_image(base64_data: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        ensure_tesseract_available()?;
        let decoded = decode_image(&base64_data)?;
        // rusty-tesseract owns a unique NamedTempFile and removes it on drop.
        let image_input = Image::from_dynamic_image(&decoded)
            .map_err(|e| format!("Unable to prepare image for OCR: {e}"))?;
        image_to_string(&image_input, &Args::default())
            .map(|text| text.trim().to_string())
            .map_err(|e| format!("OCR failed. Check installed Tesseract language data: {e}"))
    })
    .await
    .map_err(|e| e.to_string())?
}

fn main() {
    let capture_shortcut = capture_shortcut_for_platform();
    let show_app_shortcut = show_app_shortcut_for_platform();
    let quick_access_shortcut = quick_access_shortcut();
    let capture_handler_shortcut = capture_shortcut.clone();
    let show_handler_shortcut = show_app_shortcut.clone();
    let quick_handler_shortcut = quick_access_shortcut.clone();

    tauri::Builder::default()
        .manage(WorkspaceState {
            quick_access: AtomicBool::new(true),
            ..WorkspaceState::default()
        })
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, triggered_shortcut, event| {
                    if *triggered_shortcut == quick_handler_shortcut {
                        let state = app.state::<WorkspaceState>();
                        let down = &state.quick_shortcut_down;
                        if event.state == ShortcutState::Released {
                            down.store(false, Ordering::SeqCst);
                        } else if !down.swap(true, Ordering::SeqCst) {
                            toggle_quick_access(app);
                        }
                        return;
                    }
                    if event.state != ShortcutState::Pressed {
                        return;
                    }

                    if *triggered_shortcut == capture_handler_shortcut {
                        let app_handle = app.clone();
                        tauri::async_runtime::spawn(async move {
                            match read_clipboard(app_handle.clone()).await {
                                Ok(payload) => {
                                    let _ = app_handle.emit("clipboard-captured", payload);
                                }
                                Err(error) => {
                                    let _ = app_handle.emit("clipboard-warning", error);
                                }
                            }
                        });
                        return;
                    }

                    if *triggered_shortcut == show_handler_shortcut {
                        show_main_window(app, false);
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .setup(move |app| {
            for (name, shortcut) in [
                ("Capture", capture_shortcut),
                ("Show app", show_app_shortcut),
                ("Quick access", quick_access_shortcut),
            ] {
                if let Err(error) = app.global_shortcut().register(shortcut) {
                    app.state::<WorkspaceState>()
                        .warnings
                        .lock()
                        .unwrap_or_else(|e| e.into_inner())
                        .push(format!("{name} shortcut unavailable: {error}"));
                }
            }
            // A resident tray keeps Alt+X alive after the window is closed.
            let quick_item =
                MenuItem::with_id(app, "quick", "Open quick access (Alt+X)", true, None::<&str>)?;
            let show_item = MenuItem::with_id(app, "show", "Show SnapNote", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit SnapNote", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&quick_item, &show_item, &quit_item])?;
            let tray_builder = TrayIconBuilder::with_id("snapnote-tray")
                .tooltip("SnapNote — Alt+X toggles quick access")
                .menu(&tray_menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quick" => show_main_window(app, true),
                    "show" => show_main_window(app, false),
                    "quit" => app.exit(0),
                    _ => {}
                });
            let tray_builder = match app.default_window_icon() {
                Some(icon) => tray_builder.icon(icon.clone()),
                None => tray_builder,
            };
            if let Err(error) = tray_builder.build(app) {
                app.state::<WorkspaceState>()
                    .warnings
                    .lock()
                    .unwrap_or_else(|e| e.into_inner())
                    .push(format!("Tray icon unavailable: {error}"));
            }
            let handle = app.handle().clone();
            let mut last_warning = String::new();
            std::thread::spawn(move || loop {
                std::thread::sleep(Duration::from_millis(900));
                let state = handle.state::<WorkspaceState>();
                if !state.capture.load(Ordering::SeqCst) {
                    continue;
                }
                // Windows is the primary target: avoid rereading/hashing an unchanged bitmap.
                let sequence = clipboard_sequence();
                if sequence.is_some()
                    && sequence == *state.sequence.lock().unwrap_or_else(|e| e.into_inner())
                {
                    continue;
                }
                let Ok(_guard) = state.clipboard_lock.try_lock() else {
                    continue;
                };
                let known = *state.fingerprint.lock().unwrap_or_else(|e| e.into_inner());
                match capture_clipboard_payload(&handle, known) {
                    Ok(Some((hash, payload))) if state.capture.load(Ordering::SeqCst) => {
                        last_warning.clear();
                        *state.sequence.lock().unwrap_or_else(|e| e.into_inner()) = sequence;
                        *state.fingerprint.lock().unwrap_or_else(|e| e.into_inner()) = Some(hash);
                        let _ = handle.emit("clipboard-history", payload);
                    }
                    Err(error) => {
                        if error != last_warning {
                            let _ = handle.emit("clipboard-warning", &error);
                            last_warning = error;
                        }
                        std::thread::sleep(Duration::from_secs(5));
                    }
                    _ => {} // Empty/busy clipboards are retried on the next bounded poll.
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            extract_text_from_image,
            configure_capture,
            native_status,
            read_clipboard,
            write_clipboard,
            set_floating,
            set_quick_access,
            pin_image,
            pinned_image,
            close_pinned_images,
            finish_close,
            export_backup
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exact_clipboard_identity_preserves_whitespace_and_format() {
        assert_ne!(fingerprint("text", "  code\n"), fingerprint("text", "code"));
        assert_ne!(fingerprint("text", b"same"), fingerprint("image", b"same"));
    }

    #[test]
    fn image_identity_includes_dimensions() {
        let pixels = [255_u8; 16];
        assert_ne!(
            image_fingerprint(1, 4, &pixels),
            image_fingerprint(2, 2, &pixels)
        );
        assert_eq!(
            image_fingerprint(2, 2, &pixels),
            image_fingerprint(2, 2, &pixels)
        );
    }

    #[test]
    fn image_decoder_rejects_executable_malformed_and_oversized_inputs() {
        assert!(decode_image("data:image/svg+xml;base64,PHN2Zz4=").is_err());
        assert!(decode_image("data:image/png;base64,not-base64").is_err());
        assert!(decode_image(&"x".repeat(12_000_001)).is_err());
        assert!(decode_image("arbitrary-file-path.png").is_err());
    }

    #[test]
    fn png_round_trip_preserves_dimensions_and_pixels() {
        let original =
            DynamicImage::ImageRgba8(ImageBuffer::from_pixel(3, 2, Rgba([14, 50, 190, 255])));
        let mut png = Vec::new();
        original
            .write_to(&mut Cursor::new(&mut png), ImageFormat::Png)
            .unwrap();
        let decoded =
            decode_image(&format!("data:image/png;base64,{}", STANDARD.encode(png))).unwrap();
        assert_eq!(decoded.to_rgba8(), original.to_rgba8());
    }
}
