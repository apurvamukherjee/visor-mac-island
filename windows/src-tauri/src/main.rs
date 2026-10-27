// No console window behind the app in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio;
mod brightness;
mod error;
mod keys;
mod media;
mod state;

use std::{collections::HashMap, sync::Mutex, thread, time::Duration};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder,
};

// The open island (640 x 190) plus room for its ears and shadow; see src/island/Island.tsx.
const WINDOW_W: f64 = 720.0;
const WINDOW_H: f64 = 230.0;
const TICK: Duration = Duration::from_millis(16);
const MONITOR_CHECK_TICKS: u32 = 120;

/// The island's rect in CSS pixels, per window, as the frontend last reported it.
#[derive(serde::Deserialize, Clone, Copy)]
struct Rect {
    x: f64,
    y: f64,
    w: f64,
    h: f64,
}

#[derive(Default)]
struct Hits(Mutex<HashMap<String, Rect>>);

#[tauri::command]
fn set_hit(window: tauri::Window, hits: tauri::State<Hits>, rect: Rect) {
    hits.0.lock().unwrap().insert(window.label().into(), rect);
}

type MonitorKey = Vec<(i32, i32, u32, u32, u64)>;

fn monitor_key(app: &AppHandle) -> tauri::Result<MonitorKey> {
    Ok(app
        .available_monitors()?
        .iter()
        .map(|m| (m.position().x, m.position().y, m.size().width, m.size().height, m.scale_factor().to_bits()))
        .collect())
}

/// One island per monitor, top center, where the Mac has its notch.
/// Labels carry a generation so a rebuild never collides with windows still being destroyed.
fn place_islands(app: &AppHandle, generation: u32) -> tauri::Result<()> {
    for (label, window) in app.webview_windows() {
        if label.starts_with("island-") {
            window.destroy()?;
        }
    }
    app.state::<Hits>().0.lock().unwrap().clear();

    for (i, monitor) in app.available_monitors()?.iter().enumerate() {
        let scale = monitor.scale_factor();
        let (w, h) = ((WINDOW_W * scale).round() as u32, (WINDOW_H * scale).round() as u32);
        let x = monitor.position().x + (monitor.size().width as i32 - w as i32) / 2;
        let window = WebviewWindowBuilder::new(app, format!("island-{generation}-{i}"), WebviewUrl::default())
            .transparent(true)
            .decorations(false)
            .shadow(false)
            .resizable(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .focused(false)
            .focusable(false)
            .visible(false)
            .build()?;
        window.set_size(PhysicalSize::new(w, h))?;
        window.set_position(PhysicalPosition::new(x, monitor.position().y))?;
        window.set_ignore_cursor_events(true)?;
        window.show()?;
    }
    Ok(())
}

/// Windows can't shape a window's hit area to a CSS box, so the window ignores the mouse
/// unless the cursor is over the island's reported rect.
// ponytail: 60 Hz cursor poll; swap for a WH_MOUSE_LL hook if it ever shows up in CPU.
fn track_cursor(app: AppHandle) {
    let mut interactive: HashMap<String, bool> = HashMap::new();
    let mut monitors = monitor_key(&app).unwrap_or_default();
    let mut generation = 0;
    let mut tick = 0u32;
    loop {
        thread::sleep(TICK);
        tick = tick.wrapping_add(1);

        // Tauri has no display-change event, so hot-plugging and rescaling are polled.
        if tick % MONITOR_CHECK_TICKS == 0 {
            match monitor_key(&app) {
                Ok(now) if now != monitors => {
                    monitors = now;
                    generation += 1;
                    interactive.clear();
                    if let Err(e) = place_islands(&app, generation) {
                        eprintln!("visor: rebuilding islands failed: {e}");
                    }
                }
                Ok(_) => {}
                Err(e) => eprintln!("visor: reading monitors failed: {e}"),
            }
        }

        let Ok(cursor) = app.cursor_position() else { continue };
        let hits = app.state::<Hits>().0.lock().unwrap().clone();
        for (label, window) in app.webview_windows() {
            let Some(r) = hits.get(&label) else { continue };
            let (Ok(origin), Ok(scale)) = (window.outer_position(), window.scale_factor()) else { continue };
            let (left, top) = (origin.x as f64 + r.x * scale, origin.y as f64 + r.y * scale);
            let inside = cursor.x >= left
                && cursor.x < left + r.w * scale
                && cursor.y >= top
                && cursor.y < top + r.h * scale;
            if interactive.get(&label) != Some(&inside) {
                if let Err(e) = window.set_ignore_cursor_events(!inside) {
                    eprintln!("visor: {label} hit-test toggle failed: {e}");
                    continue;
                }
                interactive.insert(label, inside);
            }
        }
    }
}

fn open_settings(app: &AppHandle) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window("settings") {
        return window.set_focus();
    }
    WebviewWindowBuilder::new(app, "settings", WebviewUrl::default())
        .title("Visor Settings")
        .inner_size(420.0, 200.0)
        .resizable(false)
        .center()
        .build()?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .manage(Hits::default())
        .manage(state::Shared::default())
        .invoke_handler(tauri::generate_handler![set_hit, state::get_state, media::media, media::media_cover, audio::set_volume, audio::set_output])
        .setup(|app| {
            let handle = app.handle().clone();
            place_islands(&handle, 0)?;

            let settings = MenuItem::with_id(app, "settings", "Settings…", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit Visor", true, None::<&str>)?;
            let icon = app.default_window_icon().cloned().ok_or("bundle has no icon")?;
            TrayIconBuilder::new()
                .icon(icon)
                .tooltip("Visor")
                .menu(&Menu::with_items(app, &[&settings, &quit])?)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "settings" => {
                        if let Err(e) = open_settings(app) {
                            eprintln!("visor: opening settings failed: {e}");
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            let brightness_app = handle.clone();
            thread::spawn(move || brightness::watch(brightness_app));
            let keys_app = handle.clone();
            thread::spawn(move || keys::run(keys_app));
            let audio_app = handle.clone();
            thread::spawn(move || audio::watch(audio_app));
            let media_app = handle.clone();
            thread::spawn(move || media::watch(media_app));
            thread::spawn(move || track_cursor(handle));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Visor failed to start");
}
