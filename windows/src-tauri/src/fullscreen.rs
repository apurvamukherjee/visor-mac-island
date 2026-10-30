use windows::Win32::{
    Foundation::{HWND, RECT},
    Graphics::Gdi::{
        GetMonitorInfoW, MonitorFromWindow, HMONITOR, MONITORINFO, MONITOR_DEFAULTTONULL,
    },
    UI::Shell::{
        SHQueryUserNotificationState, QUNS_BUSY, QUNS_PRESENTATION_MODE,
        QUNS_RUNNING_D3D_FULL_SCREEN,
    },
    UI::WindowsAndMessaging::{
        GetClassNameW, GetForegroundWindow, GetShellWindow, GetWindowRect, SetWindowPos,
        HWND_TOPMOST, SWP_ASYNCWINDOWPOS, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOOWNERZORDER,
        SWP_NOSIZE,
    },
};

/// Puts the window back on top of the topmost band: any other always-on-top app that
/// activates later lands above it, and Windows never moves it back.
pub fn raise(window: HWND) -> windows::core::Result<()> {
    unsafe {
        SetWindowPos(
            window,
            Some(HWND_TOPMOST),
            0,
            0,
            0,
            0,
            // Async so the tracker thread never waits on the main thread's message loop.
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_NOOWNERZORDER | SWP_ASYNCWINDOWPOS,
        )
    }
}

/// The monitor the foreground window fills edge to edge (a game, a video, a slideshow), if any.
/// The shell's own full-screen check comes first: with an auto-hiding taskbar a maximized
/// window also covers the whole monitor, and that isn't full screen.
pub fn monitor() -> Option<HMONITOR> {
    let state = unsafe { SHQueryUserNotificationState() }.ok()?;
    if ![QUNS_BUSY, QUNS_RUNNING_D3D_FULL_SCREEN, QUNS_PRESENTATION_MODE].contains(&state) {
        return None;
    }
    unsafe {
        let window = GetForegroundWindow();
        if window.is_invalid() || window == GetShellWindow() || is_desktop(window) {
            return None;
        }
        let mut rect = RECT::default();
        GetWindowRect(window, &mut rect).ok()?;
        let monitor = MonitorFromWindow(window, MONITOR_DEFAULTTONULL);
        let mut info = MONITORINFO {
            cbSize: size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };
        if !GetMonitorInfoW(monitor, &mut info).as_bool() {
            return None;
        }
        let m = info.rcMonitor;
        let fills = rect.left <= m.left
            && rect.top <= m.top
            && rect.right >= m.right
            && rect.bottom >= m.bottom;
        fills.then_some(monitor)
    }
}

pub fn monitor_of(window: HWND) -> HMONITOR {
    unsafe { MonitorFromWindow(window, MONITOR_DEFAULTTONULL) }
}

/// Clicking the wallpaper focuses a full-screen desktop window, which isn't a full-screen app.
fn is_desktop(window: HWND) -> bool {
    let mut class = [0u16; 16];
    let len = unsafe { GetClassNameW(window, &mut class) } as usize;
    matches!(
        String::from_utf16_lossy(&class[..len]).as_str(),
        "WorkerW" | "Progman"
    )
}
