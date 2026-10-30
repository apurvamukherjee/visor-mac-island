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
    Media::MediaPlaybackAutoRepeatMode as Repeat,
    Storage::Streams::{DataReader, IRandomAccessStream},
};

// ponytail: polls the session; its change events need a handler per session, add if 500 ms ever feels late.
const POLL: Duration = Duration::from_millis(500);
/// Polls to keep re-reading the cover after a track change: about 5 s.
const COVER_SETTLE: u32 = 10;
/// 1601-01-01 to 1970-01-01, in the 100 ns ticks WinRT dates use.
const UNIX_EPOCH_TICKS: i64 = 116_444_736_000_000_000;

/// Failed reads in a row before the island lets go of the song: a player that's busy for a
/// moment shouldn't collapse the island and bring the sneak peek back.
const MISSES: u32 = 4;

static MANAGER: OnceLock<SessionManager> = OnceLock::new();
/// The session the island shows, so the buttons control that one and not whichever Windows calls current.
static SHOWN: Mutex<Option<Session>> = Mutex::new(None);
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
    let mut misses = 0;
    loop {
        let last = SHOWN.lock().unwrap().clone();
        let session = pick(manager, last.as_ref());
        *SHOWN.lock().unwrap() = session.clone();
        match session.map(|s| read(&s, &mut key, &mut cover, &mut settle)) {
            Some(Ok(media)) => {
                misses = 0;
                state::update(&app, |s| s.media = Some(media));
            }
            Some(Err(e)) => {
                if misses == 0 {
                    eprintln!("visor: reading media failed: {e}");
                }
                misses += 1;
                if misses >= MISSES {
                    state::update(&app, |s| s.media = None);
                }
            }
            None => {
                misses = 0;
                state::update(&app, |s| s.media = None);
            }
        }
        thread::sleep(POLL);
    }
}

fn is_playing(session: &Session) -> bool {
    session
        .GetPlaybackInfo()
        .and_then(|i| i.PlaybackStatus())
        .is_ok_and(|s| s == Status::Playing)
}

fn same_app(a: &Session, b: &Session) -> bool {
    a.SourceAppUserModelId().ok() == b.SourceAppUserModelId().ok()
}

/// Windows' "current" session is the last one to change, often a paused Spotify while a video
/// plays in the browser. In order: Windows' pick if it's playing, the one already shown if it's
/// playing, any that's playing, the one already shown while it's still open, then Windows' pick.
fn pick(manager: &SessionManager, last: Option<&Session>) -> Option<Session> {
    // No current session is an error from WinRT, and simply means nothing is playing.
    let current = manager.GetCurrentSession().ok();
    let sessions: Vec<Session> = manager
        .GetSessions()
        .map(|list| list.into_iter().collect())
        .unwrap_or_default();
    let shown = |s: &&Session| last.is_some_and(|l| same_app(s, l));
    current
        .clone()
        .filter(is_playing)
        .or_else(|| {
            sessions
                .iter()
                .filter(shown)
                .find(|s| is_playing(s))
                .cloned()
        })
        .or_else(|| sessions.iter().find(|s| is_playing(s)).cloned())
        .or_else(|| sessions.iter().find(shown).cloned())
        .or(current)
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
    let controls = info.Controls()?;
    let shuffle = controls.IsShuffleEnabled()?.then(|| {
        info.IsShuffleActive()
            .and_then(|r| r.Value())
            .unwrap_or(false)
    });
    let repeat =
        controls
            .IsRepeatEnabled()?
            .then(|| match info.AutoRepeatMode().and_then(|r| r.Value()) {
                Ok(Repeat::Track) => "track",
                Ok(Repeat::List) => "list",
                _ => "none",
            });
    Ok(state::Media {
        app,
        title,
        artist,
        album: props.AlbumTitle()?.to_string(),
        playing: info.PlaybackStatus()? == Status::Playing,
        can_seek: controls.IsPlaybackPositionEnabled()?,
        position: seconds(timeline.Position()?.Duration - start),
        duration: seconds(timeline.EndTime()?.Duration - start),
        updated_at: ((timeline.LastUpdatedTime()?.UniversalTime - UNIX_EPOCH_TICKS) / 10_000)
            as f64,
        cover: *cover,
        shuffle,
        repeat,
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
    Seek {
        seconds: f64,
    },
    Shuffle,
    /// Off, then the whole list, then the one track, as the Music app cycles.
    Repeat,
}

#[tauri::command]
pub async fn media(action: Action) -> Result<()> {
    let shown = SHOWN.lock().unwrap().clone();
    let session = match shown {
        Some(s) => s,
        None => MANAGER
            .get()
            .ok_or("media sessions are unavailable")?
            .GetCurrentSession()?,
    };
    let done = match action {
        Action::Toggle => session.TryTogglePlayPauseAsync()?.join()?,
        Action::Next => session.TrySkipNextAsync()?.join()?,
        Action::Previous => session.TrySkipPreviousAsync()?.join()?,
        Action::Shuffle => {
            let on = session
                .GetPlaybackInfo()?
                .IsShuffleActive()
                .and_then(|r| r.Value())
                .unwrap_or(false);
            session.TryChangeShuffleActiveAsync(!on)?.join()?
        }
        Action::Repeat => {
            let now = session
                .GetPlaybackInfo()?
                .AutoRepeatMode()
                .and_then(|r| r.Value())
                .unwrap_or(Repeat::None);
            let next = match now {
                Repeat::None => Repeat::List,
                Repeat::List => Repeat::Track,
                _ => Repeat::None,
            };
            session.TryChangeAutoRepeatModeAsync(next)?.join()?
        }
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
