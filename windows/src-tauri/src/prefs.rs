use crate::{error::Result, keys};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Manager, WebviewWindow};
use windows::Win32::UI::WindowsAndMessaging::{
    SetWindowDisplayAffinity, WDA_EXCLUDEFROMCAPTURE, WDA_NONE,
};
use windows_registry::CURRENT_USER;

pub static HIDE_FROM_CAPTURE: AtomicBool = AtomicBool::new(false);
pub static HIDE_IN_FULLSCREEN: AtomicBool = AtomicBool::new(true);
const RUN: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";

/// The settings Rust acts on. The rest live only in the frontend.
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Native {
    replace_hud: bool,
    hide_from_capture: bool,
    hide_in_fullscreen: bool,
    launch_at_login: bool,
}

#[tauri::command]
pub fn apply_settings(app: AppHandle, settings: Native) -> Result<()> {
    keys::REPLACE_HUD.store(settings.replace_hud, Ordering::Relaxed);
    HIDE_IN_FULLSCREEN.store(settings.hide_in_fullscreen, Ordering::Relaxed);
    HIDE_FROM_CAPTURE.store(settings.hide_from_capture, Ordering::Relaxed);
    for (label, window) in app.webview_windows() {
        if label.starts_with("island-") {
            capture(&window)?;
        }
    }
    let run = CURRENT_USER.create(RUN)?;
    if settings.launch_at_login {
        run.set_string("Visor", std::env::current_exe()?.to_string_lossy())?;
    } else if run.get_string("Visor").is_ok() {
        run.remove_value("Visor")?;
    }
    Ok(())
}

/// Keeps the island out of screenshots, recordings and screen shares when the setting is on.
pub fn capture(window: &WebviewWindow) -> Result<()> {
    let affinity = if HIDE_FROM_CAPTURE.load(Ordering::Relaxed) {
        WDA_EXCLUDEFROMCAPTURE
    } else {
        WDA_NONE
    };
    unsafe { SetWindowDisplayAffinity(window.hwnd()?, affinity)? };
    Ok(())
}
