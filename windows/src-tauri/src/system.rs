use crate::state;
use std::{thread, time::Duration};
use tauri::AppHandle;
use windows::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};

const POLL: Duration = Duration::from_secs(1);
const NO_BATTERY: u8 = 128;
const UNKNOWN: u8 = 255;
const CHARGING: u8 = 8;

/// Everything that changes on a human timescale, checked once a second.
pub fn watch(app: AppHandle) {
    loop {
        let battery = battery();
        state::update(&app, |s| s.battery = battery);
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
