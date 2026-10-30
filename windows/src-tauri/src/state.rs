use serde::Serialize;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

#[derive(Serialize, Clone, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct Media {
    /// The player's app id, e.g. Spotify.exe.
    pub app: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub playing: bool,
    pub can_seek: bool,
    /// Seconds, as of `updated_at`.
    pub position: f64,
    pub duration: f64,
    /// Unix ms when the player last reported `position`; the frontend runs the clock on from it.
    pub updated_at: f64,
    /// Bumps with each new cover so the frontend knows to fetch it.
    pub cover: u32,
}

#[derive(Serialize, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Battery {
    pub level: f32,
    pub charging: bool,
    pub plugged: bool,
    /// Windows energy saver, the Mac's Low Power Mode.
    pub saver: bool,
}

#[derive(Serialize, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Output {
    pub id: String,
    pub name: String,
    pub default: bool,
}

/// Everything the islands show from the system. Small on purpose: it goes to every window on each change.
#[derive(Serialize, Clone, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct State {
    pub media: Option<Media>,
    pub volume: f32,
    pub muted: bool,
    pub brightness: Option<f32>,
    pub battery: Option<Battery>,
    pub locked: bool,
    pub camera: bool,
    pub mic: bool,
    pub accent: String,
    pub outputs: Vec<Output>,
    pub downloading: bool,
    /// Windows' Region settings, which the webview's locale doesn't follow: it takes the display language.
    pub fahrenheit: bool,
    pub hour24: bool,
}

#[derive(Default)]
pub struct Shared(pub Mutex<State>);

/// Applies a change and tells every window, only when something actually changed.
pub fn update(app: &AppHandle, change: impl FnOnce(&mut State)) {
    let shared = app.state::<Shared>();
    let mut state = shared.0.lock().unwrap();
    let before = state.clone();
    change(&mut state);
    if *state != before {
        if let Err(e) = app.emit("state", &*state) {
            eprintln!("visor: sending state failed: {e}");
        }
    }
}

/// Windows that load after a change missed its event, so they start from this.
#[tauri::command]
pub fn get_state(shared: tauri::State<Shared>) -> State {
    shared.0.lock().unwrap().clone()
}
