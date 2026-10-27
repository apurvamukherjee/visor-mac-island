use crate::{audio, error::Result, state};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    OnceLock,
};
use tauri::{AppHandle, Emitter};
use windows::{
    core::w,
    Win32::{
        Foundation::{HWND, LPARAM, LRESULT, WPARAM},
        System::{
            LibraryLoader::GetModuleHandleW,
            RemoteDesktop::{WTSRegisterSessionNotification, NOTIFY_FOR_THIS_SESSION},
        },
        UI::{
            Input::KeyboardAndMouse::{VIRTUAL_KEY, VK_VOLUME_DOWN, VK_VOLUME_MUTE, VK_VOLUME_UP},
            WindowsAndMessaging::{
                CallNextHookEx, CreateWindowExW, DefWindowProcW, GetMessageW, RegisterClassW,
                SetWindowsHookExW, HWND_MESSAGE, KBDLLHOOKSTRUCT, MSG, WH_KEYBOARD_LL,
                WINDOW_EX_STYLE, WINDOW_STYLE, WM_KEYDOWN, WM_SYSKEYDOWN, WM_WTSSESSION_CHANGE,
                WNDCLASSW, WTS_SESSION_LOCK, WTS_SESSION_UNLOCK,
            },
        },
    },
};

/// The Settings switch "Replace the Windows volume flyout".
pub static REPLACE_HUD: AtomicBool = AtomicBool::new(true);
static APP: OnceLock<AppHandle> = OnceLock::new();
/// Windows' own step for the volume keys.
const STEP: f32 = 0.02;

/// Hook and session window both need a message loop on the thread that made them, so they share this one.
pub fn run(app: AppHandle) {
    APP.get_or_init(|| app);
    audio::com();
    if let Err(e) = install() {
        return eprintln!("visor: media keys and lock watch unavailable: {e}");
    }
    let mut msg = MSG::default();
    while unsafe { GetMessageW(&mut msg, None, 0, 0) }.as_bool() {}
}

fn install() -> Result<()> {
    unsafe {
        let module = GetModuleHandleW(None)?;
        SetWindowsHookExW(WH_KEYBOARD_LL, Some(on_key), Some(module.into()), 0)?;

        // A message-only window, just to be told when the session locks and unlocks.
        let class = WNDCLASSW {
            lpfnWndProc: Some(on_message),
            hInstance: module.into(),
            lpszClassName: w!("VisorSession"),
            ..Default::default()
        };
        RegisterClassW(&class);
        let window = CreateWindowExW(
            WINDOW_EX_STYLE(0),
            w!("VisorSession"),
            None,
            WINDOW_STYLE(0),
            0,
            0,
            0,
            0,
            Some(HWND_MESSAGE),
            None,
            Some(module.into()),
            None,
        )?;
        WTSRegisterSessionNotification(window, NOTIFY_FOR_THIS_SESSION)?;
    }
    Ok(())
}

unsafe extern "system" fn on_message(
    window: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    if msg == WM_WTSSESSION_CHANGE {
        if let Some(app) = APP.get() {
            match wparam.0 as u32 {
                WTS_SESSION_LOCK => state::update(app, |s| s.locked = true),
                WTS_SESSION_UNLOCK => state::update(app, |s| s.locked = false),
                _ => {}
            }
        }
    }
    unsafe { DefWindowProcW(window, msg, wparam, lparam) }
}

/// Takes the volume keys from Windows, so its flyout stays away and the island shows instead.
unsafe extern "system" fn on_key(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code >= 0 && REPLACE_HUD.load(Ordering::Relaxed) {
        let key = unsafe { &*(lparam.0 as *const KBDLLHOOKSTRUCT) };
        let vk = VIRTUAL_KEY(key.vkCode as u16);
        if matches!(vk, VK_VOLUME_UP | VK_VOLUME_DOWN | VK_VOLUME_MUTE) {
            if matches!(wparam.0 as u32, WM_KEYDOWN | WM_SYSKEYDOWN) {
                if let Err(e) = press(vk) {
                    eprintln!("visor: volume key failed: {e}");
                }
            }
            return LRESULT(1);
        }
    }
    unsafe { CallNextHookEx(None, code, wparam, lparam) }
}

fn press(vk: VIRTUAL_KEY) -> Result<()> {
    let v = audio::endpoint_volume()?;
    unsafe {
        if vk == VK_VOLUME_MUTE {
            v.SetMute(!v.GetMute()?.as_bool(), std::ptr::null())?;
        } else {
            let by = if vk == VK_VOLUME_UP { STEP } else { -STEP };
            let level = ((v.GetMasterVolumeLevelScalar()? + by) / STEP).round() * STEP;
            v.SetMasterVolumeLevelScalar(level.clamp(0.0, 1.0), std::ptr::null())?;
            v.SetMute(false, std::ptr::null())?;
        }
    }
    // At 0 or 100% the level doesn't change, but the HUD should still answer the key.
    if let Some(app) = APP.get() {
        app.emit("volume-key", ())?;
    }
    Ok(())
}
