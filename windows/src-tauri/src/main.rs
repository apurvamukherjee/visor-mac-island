// No console window behind the app in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio;
mod brightness;
mod error;
mod files;
mod fullscreen;
mod glow;
mod keys;
mod log;
mod media;
mod net;
mod pdf;
mod prefs;
mod prompts;
mod state;
mod system;
mod tools;

use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    thread,
    time::{Duration, Instant},
};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};
use windows::Win32::{
    Foundation::{HWND, POINT},
    UI::WindowsAndMessaging::GetCursorPos,
};

// The open island (640 x 190) plus room for its ears and shadow; see src/island/Island.tsx.
const WINDOW_W: f64 = 720.0;
const WINDOW_H: f64 = 230.0;
const TICK: Duration = Duration::from_millis(16);
/// A pointer that hasn't moved for this many ticks (about half a second) is checked less often.
const REST_AFTER: u32 = 30;
const RESTING_TICK: Duration = Duration::from_millis(100);
const MONITOR_CHECK: Duration = Duration::from_secs(2);
const FULLSCREEN_CHECK: Duration = Duration::from_millis(250);
/// TimerManager.presetMinutes, as the island's timer offers them.
const TIMER_PRESETS: [u32; 6] = [1, 5, 10, 15, 25, 60];

/// "Hide island" from the tray, until it's shown again or Visor restarts.
static USER_HIDDEN: AtomicBool = AtomicBool::new(false);

/// The island's rect in CSS pixels, per window, as the frontend last reported it.
#[derive(serde::Deserialize, Clone, Copy)]
struct Rect {
    x: f64,
    y: f64,
    w: f64,
    h: f64,
}

/// Where an island's window was placed, in physical pixels, and the rect inside it that takes the mouse.
/// The window never moves once placed, so the tracker reads this instead of asking the window each tick.
struct Hit {
    x: i32,
    y: i32,
    scale: f64,
    rect: Option<Rect>,
}

#[derive(Default)]
struct Hits {
    map: Mutex<HashMap<String, Hit>>,
    /// Set with each new rect, so the tracker tests again under a pointer that hasn't moved.
    changed: AtomicBool,
}

#[tauri::command]
fn set_hit(window: tauri::Window, hits: tauri::State<Hits>, rect: Rect) {
    if let Some(hit) = hits.map.lock().unwrap().get_mut(window.label()) {
        hit.rect = Some(rect);
    }
    hits.changed.store(true, Ordering::Relaxed);
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
    let hits = app.state::<Hits>();
    hits.map.lock().unwrap().clear();

    for (i, monitor) in app.available_monitors()?.iter().enumerate() {
        let scale = monitor.scale_factor();
        let (w, h) = (
            (WINDOW_W * scale).round() as u32,
            (WINDOW_H * scale).round() as u32,
        );
        let x = monitor.position().x + (monitor.size().width as i32 - w as i32) / 2;
        let y = monitor.position().y;
        let label = format!("island-{generation}-{i}");
        // Before the window exists, so its first set_hit finds the entry.
        hits.map.lock().unwrap().insert(
            label.clone(),
            Hit {
                x,
                y,
                scale,
                rect: None,
            },
        );
        let window = WebviewWindowBuilder::new(app, label, WebviewUrl::default())
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
        // Moved first, sized after: moving onto a monitor with another scale makes Windows rescale the
        // window for it, which would undo a size set for that monitor beforehand.
        window.set_position(PhysicalPosition::new(x, y))?;
        window.set_size(PhysicalSize::new(w, h))?;
        window.set_ignore_cursor_events(true)?;
        prompts::allow(&window)?;
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

/// One island as the tracker holds it: the handle is asked for once, since every ask of a window
/// waits on the main thread.
struct Island {
    label: String,
    window: WebviewWindow,
    hwnd: HWND,
    /// Whether the window takes the mouse right now; None until the first test.
    interactive: Option<bool>,
    hidden: bool,
}

fn island_windows(app: &AppHandle, generation: u32) -> Vec<Island> {
    // Only this generation's: the last one's windows may still be on their way out.
    let prefix = format!("island-{generation}-");
    app.webview_windows()
        .into_iter()
        .filter(|(label, _)| label.starts_with(&prefix))
        .filter_map(|(label, window)| {
            let hwnd = window
                .hwnd()
                .map_err(|e| eprintln!("visor: {label} has no window handle: {e}"))
                .ok()?;
            Some(Island {
                label,
                window,
                hwnd,
                interactive: None,
                hidden: false,
            })
        })
        .collect()
}

/// Windows can't shape a window's hit area to a CSS box, so the window ignores the mouse
/// unless the cursor is over the island's reported rect.
// ponytail: polled, 60 Hz while the pointer moves and 10 Hz at rest; a WH_MOUSE_LL hook would
// run on every mouse move system-wide, which costs more than this does.
fn track_cursor(app: AppHandle) {
    let hits = app.state::<Hits>();
    let mut monitors = monitor_key(&app).unwrap_or_default();
    let mut generation = 0;
    let mut islands = island_windows(&app, generation);
    let mut last = (i32::MIN, i32::MIN);
    let mut still = 0u32;
    let (mut monitors_at, mut fullscreen_at) = (Instant::now(), Instant::now());
    loop {
        thread::sleep(if still >= REST_AFTER {
            RESTING_TICK
        } else {
            TICK
        });
        let now = Instant::now();
        let mut retest = hits.changed.swap(false, Ordering::Relaxed);

        // Tauri has no display-change event, so hot-plugging and rescaling are polled.
        if now.duration_since(monitors_at) >= MONITOR_CHECK {
            monitors_at = now;
            match monitor_key(&app) {
                Ok(key) if key != monitors => {
                    monitors = key;
                    generation += 1;
                    if let Err(e) = place_islands(&app, generation) {
                        eprintln!("visor: rebuilding islands failed: {e}");
                    }
                    islands = island_windows(&app, generation);
                    retest = true;
                }
                Ok(_) => {}
                Err(e) => eprintln!("visor: reading monitors failed: {e}"),
            }
        }

        if now.duration_since(fullscreen_at) >= FULLSCREEN_CHECK {
            fullscreen_at = now;
            retest |= hide_under_fullscreen(&mut islands);
        }

        // Straight from Win32: Tauri's cursor_position is answered by the main thread, and asking
        // it 60 times a second kept that thread awake for nothing.
        let mut cursor = POINT::default();
        if unsafe { GetCursorPos(&mut cursor) }.is_err() {
            continue;
        }
        let at = (cursor.x, cursor.y);
        if at == last {
            still = still.saturating_add(1);
            if !retest {
                continue;
            }
        } else {
            still = 0;
            last = at;
        }

        for island in islands.iter_mut().filter(|i| !i.hidden) {
            let inside = {
                let map = hits.map.lock().unwrap();
                let Some((hit, r)) = map
                    .get(&island.label)
                    .and_then(|h| Some((h, h.rect.as_ref()?)))
                else {
                    continue;
                };
                let (left, top) = (
                    hit.x as f64 + r.x * hit.scale,
                    hit.y as f64 + r.y * hit.scale,
                );
                let (x, y) = (cursor.x as f64, cursor.y as f64);
                x >= left && x < left + r.w * hit.scale && y >= top && y < top + r.h * hit.scale
            };
            if island.interactive == Some(inside) {
                continue;
            }
            let label = island.label.as_str();
            if let Err(e) = island.window.set_ignore_cursor_events(!inside) {
                eprintln!("visor: {label} hit-test toggle failed: {e}");
                continue;
            }
            // Once the window turns click-through the webview may never see the pointer go,
            // so the island hears it from here too and closes as if it had.
            if !inside && island.interactive == Some(true) {
                if let Err(e) = app.emit_to(label, "pointer-left", ()) {
                    eprintln!("visor: {label} pointer-left failed: {e}");
                }
            }
            island.interactive = Some(inside);
        }
    }
}

/// Visor stays on top of everything, but steps aside for a full-screen game or video when
/// the setting asks, and only on the monitor showing it; and everywhere when the tray says so.
/// True when an island was hidden or shown.
fn hide_under_fullscreen(islands: &mut [Island]) -> bool {
    let user_hidden = USER_HIDDEN.load(Ordering::Relaxed);
    let full = prefs::HIDE_IN_FULLSCREEN
        .load(Ordering::Relaxed)
        .then(fullscreen::monitor)
        .flatten();
    let mut changed = false;
    for island in islands {
        let label = island.label.as_str();
        let hide = user_hidden || full.is_some_and(|m| fullscreen::monitor_of(island.hwnd) == m);
        if !hide {
            if let Err(e) = fullscreen::raise(island.hwnd) {
                eprintln!("visor: {label} raise failed: {e}");
            }
        }
        if hide == island.hidden {
            continue;
        }
        let done = if hide {
            island.window.hide()
        } else {
            island.window.show()
        };
        match done {
            Ok(()) => {
                island.hidden = hide;
                changed = true;
            }
            Err(e) => eprintln!("visor: {label} fullscreen hide failed: {e}"),
        }
    }
    changed
}

#[tauri::command]
// Async: building a window inside a sync command deadlocks WebView2 on Windows (tauri docs, wry#583).
async fn show_settings(app: AppHandle) -> error::Result<()> {
    Ok(open_settings(&app)?)
}

#[tauri::command]
// Async for the same reason as show_settings.
async fn show_tasks(app: AppHandle) -> error::Result<()> {
    Ok(open_tasks(&app)?)
}

pub(crate) fn open_settings(app: &AppHandle) -> tauri::Result<()> {
    open_window(
        app,
        "settings",
        "Visor Settings",
        (780.0, 560.0),
        (700.0, 480.0),
    )
}

fn open_tasks(app: &AppHandle) -> tauri::Result<()> {
    open_window(app, "tasks", "Visor Tasks", (520.0, 560.0), (420.0, 400.0))
}

fn open_window(
    app: &AppHandle,
    label: &str,
    title: &str,
    (w, h): (f64, f64),
    (min_w, min_h): (f64, f64),
) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window(label) {
        // A minimized window ignores focus, so the tray click would seem to do nothing.
        window.unminimize()?;
        window.show()?;
        return window.set_focus();
    }
    WebviewWindowBuilder::new(app, label, WebviewUrl::default())
        .title(title)
        .inner_size(w, h)
        .min_inner_size(min_w, min_h)
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

/// Hands a second launch over to the running Visor, which opens Settings.
fn wake_running() {
    use windows::Win32::{
        Foundation::{LPARAM, WPARAM},
        UI::WindowsAndMessaging::{
            AllowSetForegroundWindow, FindWindowExW, PostMessageW, ASFW_ANY, HWND_MESSAGE,
        },
    };
    unsafe {
        // Only the process the user just clicked may bring a window forward; this lends that to the running one.
        let _ = AllowSetForegroundWindow(ASFW_ANY);
        match FindWindowExW(Some(HWND_MESSAGE), None, keys::SESSION_CLASS, None) {
            Ok(window) => {
                if let Err(e) =
                    PostMessageW(Some(window), keys::WM_SHOW_SETTINGS, WPARAM(0), LPARAM(0))
                {
                    eprintln!("visor: couldn't reach the running Visor: {e}");
                }
            }
            Err(e) => eprintln!("visor: the running Visor has no session window: {e}"),
        }
    }
}

fn main() {
    if already_running() {
        return wake_running();
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
            show_tasks,
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
            let tasks = MenuItem::with_id(app, "tasks", "Tasks…", true, None::<&str>)?;
            let hide = MenuItem::with_id(app, "hide", "Hide island", true, None::<&str>)?;
            let timers = TIMER_PRESETS
                .iter()
                .map(|m| {
                    let label = if *m < 60 {
                        format!("{m} min")
                    } else {
                        "1 hour".into()
                    };
                    MenuItem::with_id(app, format!("timer-{m}"), label, true, None::<&str>)
                })
                .collect::<tauri::Result<Vec<_>>>()?;
            let timer_refs: Vec<&dyn tauri::menu::IsMenuItem<_>> = timers
                .iter()
                .map(|t| t as &dyn tauri::menu::IsMenuItem<_>)
                .collect();
            let timer = Submenu::with_items(app, "Start a timer", true, &timer_refs)?;
            let quit = MenuItem::with_id(app, "quit", "Quit Visor", true, None::<&str>)?;
            let line = PredefinedMenuItem::separator(app)?;
            let icon = app
                .default_window_icon()
                .cloned()
                .ok_or("bundle has no icon")?;
            let hide_item = hide.clone();
            TrayIconBuilder::new()
                .icon(icon)
                .tooltip("Visor")
                .menu(&Menu::with_items(
                    app,
                    &[&settings, &tasks, &hide, &timer, &line, &quit],
                )?)
                // Left click is the quick way in, as most tray apps do; the menu is on the right.
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        if let Err(e) = open_settings(tray.app_handle()) {
                            eprintln!("visor: opening settings failed: {e}");
                        }
                    }
                })
                .on_menu_event(move |app, event| match event.id().as_ref() {
                    "settings" => {
                        if let Err(e) = open_settings(app) {
                            eprintln!("visor: opening settings failed: {e}");
                        }
                    }
                    "tasks" => {
                        if let Err(e) = open_tasks(app) {
                            eprintln!("visor: opening tasks failed: {e}");
                        }
                    }
                    "hide" => {
                        let hidden = !USER_HIDDEN.fetch_xor(true, Ordering::Relaxed);
                        let text = if hidden { "Show island" } else { "Hide island" };
                        if let Err(e) = hide_item.set_text(text) {
                            eprintln!("visor: renaming the hide item failed: {e}");
                        }
                    }
                    "quit" => app.exit(0),
                    id => {
                        // One island starts it; the rest pick it up from the timer they share.
                        let minutes = id
                            .strip_prefix("timer-")
                            .and_then(|m| m.parse::<u32>().ok());
                        let first = app
                            .webview_windows()
                            .into_keys()
                            .find(|l| l.starts_with("island-"));
                        if let (Some(minutes), Some(label)) = (minutes, first) {
                            if let Err(e) = app.emit_to(label.as_str(), "start-timer", minutes) {
                                eprintln!("visor: starting a timer failed: {e}");
                            }
                        }
                    }
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
            let glow_app = handle.clone();
            thread::spawn(move || glow::watch(glow_app));
            let media_app = handle.clone();
            thread::spawn(move || media::watch(media_app));
            thread::spawn(move || track_cursor(handle));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Visor failed to start");
}
