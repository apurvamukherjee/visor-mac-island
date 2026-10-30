use crate::state;
use std::{
    fs,
    path::{Path, PathBuf},
    thread,
    time::{Duration, SystemTime},
};
use tauri::{AppHandle, Emitter};
use windows::{
    core::GUID,
    Win32::{
        System::{
            Com::CoTaskMemFree,
            Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS},
        },
        UI::Shell::{
            FOLDERID_Downloads, FOLDERID_Screenshots, SHGetKnownFolderPath, KF_FLAG_DEFAULT,
        },
    },
    UI::ViewManagement::{UIColorType, UISettings},
};
use windows_registry::{Key, CURRENT_USER};

const POLL: Duration = Duration::from_secs(1);
const NO_BATTERY: u8 = 128;
const UNKNOWN: u8 = 255;
const CHARGING: u8 = 8;
/// What Edge/Chrome, Firefox and Opera name a file while it is still downloading.
const PARTIAL: [&str; 4] = ["crdownload", "part", "partial", "opdownload"];
const IMAGES: [&str; 3] = ["png", "jpg", "jpeg"];

/// Everything that changes on a human timescale, checked once a second.
pub fn watch(app: AppHandle) {
    let ui = UISettings::new()
        .map_err(|e| eprintln!("visor: no accent color: {e}"))
        .ok();
    let downloads = known_folder(&FOLDERID_Downloads);
    // Win+PrtScn and the Snipping Tool both save here. Shots already there at launch are not new.
    let screenshots = known_folder(&FOLDERID_Screenshots);
    let mut seen = screenshots
        .as_deref()
        .map(newest)
        .unwrap_or(SystemTime::UNIX_EPOCH);
    loop {
        let downloading = downloads
            .as_deref()
            .is_some_and(|d| !files(d, &PARTIAL).is_empty());
        if let Some(dir) = &screenshots {
            let mut shots = files(dir, &IMAGES);
            // Oldest first, so two shots in one second both land.
            shots.sort_by_key(|(_, t)| *t);
            for (path, modified) in shots {
                if modified > seen {
                    seen = modified;
                    if let Err(e) = app.emit("screenshot", path) {
                        eprintln!("visor: sending a screenshot failed: {e}");
                    }
                }
            }
        }
        let accent = ui.as_ref().and_then(accent);
        let battery = battery();
        let (camera, mic) = (in_use("webcam"), in_use("microphone"));
        let (fahrenheit, hour24) = region();
        state::update(&app, |s| {
            s.battery = battery;
            s.camera = camera;
            s.mic = mic;
            s.downloading = downloading;
            s.fahrenheit = fahrenheit;
            s.hour24 = hour24;
            if let Some(accent) = accent {
                s.accent = accent;
            }
        });
        thread::sleep(POLL);
    }
}

/// The accent color from Settings > Personalization, so the island tints like the rest of Windows.
fn accent(ui: &UISettings) -> Option<String> {
    let c = ui.GetColorValue(UIColorType::Accent).ok()?;
    Some(format!("#{:02x}{:02x}{:02x}", c.R, c.G, c.B))
}

/// Settings > Time & language > Region: US measurement means Fahrenheit, and an `H` in the
/// short time format means a 24-hour clock.
fn region() -> (bool, bool) {
    let Ok(intl) = CURRENT_USER.open(r"Control Panel\International") else {
        return (false, false);
    };
    let fahrenheit = intl.get_string("iMeasure").is_ok_and(|m| m == "1");
    let hour24 = intl.get_string("sShortTime").is_ok_and(|t| t.contains('H'));
    (fahrenheit, hour24)
}

fn battery() -> Option<state::Battery> {
    let mut p = SYSTEM_POWER_STATUS::default();
    unsafe { GetSystemPowerStatus(&mut p) }.ok()?;
    if p.BatteryFlag & NO_BATTERY != 0
        || p.BatteryFlag == UNKNOWN
        || p.BatteryLifePercent == UNKNOWN
    {
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
    let path = format!(
        r"Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\{device}"
    );
    let Ok(store) = CURRENT_USER.open(path) else {
        return false;
    };
    let active = |app: &Key| {
        app.get_u64("LastUsedTimeStart").is_ok_and(|t| t > 0)
            && app.get_u64("LastUsedTimeStop") == Ok(0)
    };
    // Store apps sit directly under the device; desktop apps one level down, under NonPackaged.
    let any_active = |key: &Key| {
        key.keys()
            .is_ok_and(|mut names| names.any(|n| key.open(&n).is_ok_and(|app| active(&app))))
    };
    any_active(&store)
        || store
            .open("NonPackaged")
            .is_ok_and(|desktop| any_active(&desktop))
}

fn known_folder(id: &GUID) -> Option<PathBuf> {
    let path = unsafe { SHGetKnownFolderPath(id, KF_FLAG_DEFAULT, None) }
        .map_err(|e| eprintln!("visor: a known folder is missing: {e}"))
        .ok()?;
    let text = unsafe { path.to_string() };
    unsafe { CoTaskMemFree(Some(path.0 as *const _)) };
    text.ok().map(PathBuf::from)
}

/// Files in `dir` with one of `extensions`, and when each last changed.
fn files(dir: &Path, extensions: &[&str]) -> Vec<(PathBuf, SystemTime)> {
    let Ok(entries) = fs::read_dir(dir) else {
        return Vec::new();
    };
    entries
        .flatten()
        .filter(|e| {
            e.path()
                .extension()
                .and_then(|x| x.to_str())
                .is_some_and(|x| extensions.contains(&x.to_ascii_lowercase().as_str()))
        })
        .filter_map(|e| Some((e.path(), e.metadata().ok()?.modified().ok()?)))
        .collect()
}

fn newest(dir: &Path) -> SystemTime {
    files(dir, &IMAGES)
        .into_iter()
        .map(|(_, t)| t)
        .max()
        .unwrap_or(SystemTime::UNIX_EPOCH)
}
