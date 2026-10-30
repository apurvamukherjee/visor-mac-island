// No console window behind the app in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio;
mod brightness;
mod error;
mod files;
mod fullscreen;
mod keys;
mod log;
mod media;
mod net;
mod pdf;
mod prefs;
mod state;
mod system;
mod tools;

use std::{
    collections::{HashMap, HashSet},
    sync::{atomic::Ordering, Mutex},
    thread,
    time::Duration,
};
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
const FULLSCREEN_CHECK_TICKS: u32 = 15;

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
        .map(|m| {
            (
                m.position().x,
                m.position().y,
                m.size().width,
                m.size().height,
                m.scale_factor().to_bits(),
            )
        })
        .collect())
}

/// One island per monitor, top center, where the Mac has its notch.
/// Labels carry a generation so a rebuild never collides with windows still being destroyed.
fn place_islands(app: &AppHandle, generation: u32) -> error::Result<()> {
    for (label, window) in app.webview_windows() {
        if label.starts_with("island-") {
            window.destroy()?;
        }
    }
    app.state::<Hits>().0.lock().unwrap().clear();

    for (i, monitor) in app.available_monitors()?.iter().enumerate() {
        let scale = monitor.scale_factor();
        let (w, h) = (
            (WINDOW_W * scale).round() as u32,
            (WINDOW_H * scale).round() as u32,
        );
        let x = monitor.position().x + (monitor.size().width as i32 - w as i32) / 2;
        let window = WebviewWindowBuilder::new(
            app,
            format!("island-{generation}-{i}"),
            WebviewUrl::default(),
        )
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
        // Display affinity only takes from the window's own thread, and rebuilds run on the tracker's.
        let target = window.clone();
        app.run_on_main_thread(move || {
            if let Err(e) = prefs::capture(&target) {
                eprintln!("visor: capture setting failed: {e}");
            }
        })?;
        window.show()?;
    }
    Ok(())
}

/// Windows can't shape a window's hit area to a CSS box, so the window ignores the mouse
/// unless the cursor is over the island's reported rect.
// ponytail: 60 Hz cursor poll; swap for a WH_MOUSE_LL hook if it ever shows up in CPU.
fn track_cursor(app: AppHandle) {
    let mut interactive: HashMap<String, bool> = HashMap::new();
    let mut hidden: HashSet<String> = HashSet::new();
    let mut monitors = monitor_key(&app).unwrap_or_default();
    let mut generation = 0;
    let mut tick = 0u32;
    loop {
        thread::sleep(TICK);
        tick = tick.wrapping_add(1);

        // Tauri has no display-change event, so hot-plugging and rescaling are polled.
        if tick.is_multiple_of(MONITOR_CHECK_TICKS) {
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

        if tick.is_multiple_of(FULLSCREEN_CHECK_TICKS) {
            hide_under_fullscreen(&app, &mut hidden);
        }

        let Ok(cursor) = app.cursor_position() else {
            continue;
        };
        let hits = app.state::<Hits>().0.lock().unwrap().clone();
        for (label, window) in app.webview_windows() {
            let Some(r) = hits.get(&label) else { continue };
            if hidden.contains(&label) {
                continue;
            }
            let (Ok(origin), Ok(scale)) = (window.outer_position(), window.scale_factor()) else {
                continue;
            };
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

/// Visor stays on top of everything, but steps aside for a full-screen game or video when
/// the setting asks, and only on the monitor showing it.
fn hide_under_fullscreen(app: &AppHandle, hidden: &mut HashSet<String>) {
    let full = prefs::HIDE_IN_FULLSCREEN
        .load(Ordering::Relaxed)
        .then(fullscreen::monitor)
        .flatten();
    for (label, window) in app.webview_windows() {
        if !label.starts_with("island-") {
            continue;
        }
        let Ok(hwnd) = window.hwnd() else { continue };
        let hide = full.is_some_and(|m| fullscreen::monitor_of(hwnd) == m);
        if !hide {
            if let Err(e) = fullscreen::raise(hwnd) {
                eprintln!("visor: {label} raise failed: {e}");
            }
        }
        if hide == hidden.contains(&label) {
            continue;
        }
        let done = if hide { window.hide() } else { window.show() };
        match done {
            Ok(()) if hide => drop(hidden.insert(label)),
            Ok(()) => drop(hidden.remove(&label)),
            Err(e) => eprintln!("visor: {label} fullscreen hide failed: {e}"),
        }
    }
}

#[tauri::command]
// Async: building a window inside a sync command deadlocks WebView2 on Windows (tauri docs, wry#583).
async fn show_settings(app: AppHandle) -> error::Result<()> {
    Ok(open_settings(&app)?)
}

fn open_settings(app: &AppHandle) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window("settings") {
        return window.set_focus();
    }
    WebviewWindowBuilder::new(app, "settings", WebviewUrl::default())
        .title("Visor Settings")
        .inner_size(780.0, 560.0)
        .min_inner_size(700.0, 480.0)
        .center()
        .build()?;
    Ok(())
}

/// Sign-in start plus a click on the Start menu, or the installer's "Run Visor", would
/// otherwise stack a second set of islands, tray icon and key hook on the first.
fn already_running() -> bool {
    use windows::{
        core::w,
        Win32::{
            Foundation::{GetLastError, ERROR_ALREADY_EXISTS},
            System::Threading::CreateMutexW,
        },
    };
    // The handle is never closed: Windows drops the mutex when this process ends.
    unsafe { CreateMutexW(None, false, w!("Local\\VisorSingleInstance")) }.is_ok()
        && unsafe { GetLastError() } == ERROR_ALREADY_EXISTS
}

fn main() {
    if already_running() {
        return;
    }
    // A release build has no console, so without this every eprintln! goes nowhere.
    #[cfg(not(debug_assertions))]
    if let Err(e) = log::to_file() {
        eprintln!("visor: no log file: {e}");
    }
    tauri::Builder::default()
        .manage(Hits::default())
        .manage(state::Shared::default())
        .invoke_handler(tauri::generate_handler![
            set_hit,
            state::get_state,
            media::media,
            media::media_cover,
            audio::set_volume,
            audio::set_output,
            prefs::apply_settings,
            show_settings,
            files::thumbnail,
            files::open,
            files::reveal,
            files::start_drag,
            files::share,
            tools::convert_image,
            tools::images_to_pdf,
            tools::pdf_to_images,
            net::fetch_text,
            log::log,
            log::show_log,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            place_islands(&handle, 0)?;

            let settings = MenuItem::with_id(app, "settings", "Settings…", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit Visor", true, None::<&str>)?;
            let icon = app
                .default_window_icon()
                .cloned()
                .ok_or("bundle has no icon")?;
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

            let system_app = handle.clone();
            thread::spawn(move || system::watch(system_app));
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
