use crate::{error::Result, state};
use std::{
    sync::{Mutex, OnceLock},
    thread,
    time::Duration,
};
use tauri::{ipc::Response, AppHandle};
use windows::{
    core::Interface,
    Media::Control::{
        GlobalSystemMediaTransportControlsSession as Session,
        GlobalSystemMediaTransportControlsSessionManager as SessionManager,
        GlobalSystemMediaTransportControlsSessionMediaProperties as Properties,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus as Status,
    },
    Storage::Streams::{DataReader, IRandomAccessStream},
};

// ponytail: polls the session; its change events need a handler per session, add if 500 ms ever feels late.
const POLL: Duration = Duration::from_millis(500);
/// Polls to keep re-reading the cover after a track change: about 5 s.
const COVER_SETTLE: u32 = 10;
/// 1601-01-01 to 1970-01-01, in the 100 ns ticks WinRT dates use.
const UNIX_EPOCH_TICKS: i64 = 116_444_736_000_000_000;

static MANAGER: OnceLock<SessionManager> = OnceLock::new();
static COVER: Mutex<Vec<u8>> = Mutex::new(Vec::new());

/// Follows whatever Windows shows in its own media flyout: Spotify, a browser tab, Media Player.
pub fn watch(app: AppHandle) {
    let manager = match SessionManager::RequestAsync().and_then(|op| op.join()) {
        Ok(m) => MANAGER.get_or_init(|| m),
        Err(e) => return eprintln!("visor: no media sessions: {e}"),
    };
    let mut key = String::new();
    let mut cover = 0;
    let mut settle = 0;
    loop {
        // No current session is an error from WinRT, and simply means nothing is playing.
        let media = manager.GetCurrentSession().ok().and_then(|session| {
            read(&session, &mut key, &mut cover, &mut settle)
                .map_err(|e| eprintln!("visor: reading media failed: {e}"))
                .ok()
        });
        state::update(&app, |s| s.media = media);
        thread::sleep(POLL);
    }
}

fn read(
    session: &Session,
    key: &mut String,
    cover: &mut u32,
    settle: &mut u32,
) -> Result<state::Media> {
    let props = session.TryGetMediaPropertiesAsync()?.join()?;
    let info = session.GetPlaybackInfo()?;
    let timeline = session.GetTimelineProperties()?;
    let app = session.SourceAppUserModelId()?.to_string();
    let title = props.Title()?.to_string();
    let artist = props.Artist()?.to_string();

    // Players send the new title before the new cover, handing over none or the last song's for a
    // moment, so the cover is re-read for a few seconds after a change, and while there is none.
    let now = format!("{app}|{title}|{artist}");
    if now != *key {
        *key = now;
        *settle = COVER_SETTLE;
    }
    if *settle > 0 || COVER.lock().unwrap().is_empty() {
        *settle = settle.saturating_sub(1);
        let bytes = cover_bytes(&props).unwrap_or_default();
        let mut stored = COVER.lock().unwrap();
        if bytes != *stored {
            *stored = bytes;
            *cover += 1;
        }
    }

    let start = timeline.StartTime()?.Duration;
    Ok(state::Media {
        app,
        title,
        artist,
        album: props.AlbumTitle()?.to_string(),
        playing: info.PlaybackStatus()? == Status::Playing,
        can_seek: info.Controls()?.IsPlaybackPositionEnabled()?,
        position: seconds(timeline.Position()?.Duration - start),
        duration: seconds(timeline.EndTime()?.Duration - start),
        updated_at: ((timeline.LastUpdatedTime()?.UniversalTime - UNIX_EPOCH_TICKS) / 10_000)
            as f64,
        cover: *cover,
    })
}

fn seconds(ticks: i64) -> f64 {
    ticks.max(0) as f64 / 1e7
}

fn cover_bytes(props: &Properties) -> Result<Vec<u8>> {
    let stream = props.Thumbnail()?.OpenReadAsync()?.join()?;
    read_stream(&stream.cast()?)
}

pub fn read_stream(stream: &IRandomAccessStream) -> Result<Vec<u8>> {
    let size = stream.Size()? as u32;
    let reader = DataReader::CreateDataReader(&stream.GetInputStreamAt(0)?)?;
    reader.LoadAsync(size)?.join()?;
    let mut bytes = vec![0; size as usize];
    reader.ReadBytes(&mut bytes)?;
    Ok(bytes)
}

/// Raw bytes, so the cover reaches the page as an ArrayBuffer instead of a JSON array of numbers.
#[tauri::command]
pub fn media_cover() -> Response {
    Response::new(COVER.lock().unwrap().clone())
}

#[derive(serde::Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum Action {
    Toggle,
    Next,
    Previous,
    Seek { seconds: f64 },
}

#[tauri::command]
pub async fn media(action: Action) -> Result<()> {
    let session = MANAGER
        .get()
        .ok_or("media sessions are unavailable")?
        .GetCurrentSession()?;
    let done = match action {
        Action::Toggle => session.TryTogglePlayPauseAsync()?.join()?,
        Action::Next => session.TrySkipNextAsync()?.join()?,
        Action::Previous => session.TrySkipPreviousAsync()?.join()?,
        Action::Seek { seconds } => {
            let start = session.GetTimelineProperties()?.StartTime()?.Duration;
            session
                .TryChangePlaybackPositionAsync(start + (seconds * 1e7) as i64)?
                .join()?
        }
    };
    if done {
        Ok(())
    } else {
        Err("the player refused".into())
    }
}
