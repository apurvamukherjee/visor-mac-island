use crate::state;
use std::{thread, time::Duration};
use tauri::AppHandle;
use windows::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};
use windows_registry::{Key, CURRENT_USER};

const POLL: Duration = Duration::from_secs(1);
const NO_BATTERY: u8 = 128;
const UNKNOWN: u8 = 255;
const CHARGING: u8 = 8;

/// Everything that changes on a human timescale, checked once a second.
pub fn watch(app: AppHandle) {
    loop {
        let battery = battery();
        let (camera, mic) = (in_use("webcam"), in_use("microphone"));
        state::update(&app, |s| {
            s.battery = battery;
            s.camera = camera;
            s.mic = mic;
        });
        thread::sleep(POLL);
    }
}

fn battery() -> Option<state::Battery> {
    let mut p = SYSTEM_POWER_STATUS::default();
    unsafe { GetSystemPowerStatus(&mut p) }.ok()?;
    if p.BatteryFlag & NO_BATTERY != 0 || p.BatteryFlag == UNKNOWN || p.BatteryLifePercent == UNKNOWN {
        return None;
    }
    Some(state::Battery {
        level: p.BatteryLifePercent as f32 / 100.0,
        charging: p.BatteryFlag & CHARGING != 0,
        plugged: p.ACLineStatus == 1,
        saver: p.SystemStatusFlag == 1,
    })
}

/// Windows' own privacy record: an app holding the camera or mic has a start time and no stop time yet.
fn in_use(device: &str) -> bool {
    let path = format!(r"Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\{device}");
    let Ok(store) = CURRENT_USER.open(path) else { return false };
    let active = |app: &Key| app.get_u64("LastUsedTimeStart").is_ok_and(|t| t > 0) && app.get_u64("LastUsedTimeStop") == Ok(0);
    // Store apps sit directly under the device; desktop apps one level down, under NonPackaged.
    let any_active = |key: &Key| key.keys().is_ok_and(|mut names| names.any(|n| key.open(&n).is_ok_and(|app| active(&app))));
    any_active(&store) || store.open("NonPackaged").is_ok_and(|desktop| any_active(&desktop))
}
