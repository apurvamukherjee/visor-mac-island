use windows::Win32::{
    Foundation::{HWND, RECT},
    Graphics::Gdi::{
        GetMonitorInfoW, MonitorFromWindow, HMONITOR, MONITORINFO, MONITOR_DEFAULTTONULL,
    },
    UI::WindowsAndMessaging::{GetClassNameW, GetForegroundWindow, GetShellWindow, GetWindowRect},
};

/// The monitor the foreground window fills edge to edge (a game, a video, a slideshow), if any.
/// A maximized window stops at the taskbar, so it doesn't count.
pub fn monitor() -> Option<HMONITOR> {
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
