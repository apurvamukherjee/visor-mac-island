use crate::{error::Result, state};
use std::{
    sync::{
        mpsc::{self, RecvTimeoutError, Sender},
        Mutex, OnceLock,
    },
    thread,
    time::{Duration, Instant},
};
use tauri::{ipc::Response, AppHandle};
use windows::{
    core::{Interface, RuntimeType},
    Foundation::TypedEventHandler,
    Media::Control::{
        GlobalSystemMediaTransportControlsSession as Session,
        GlobalSystemMediaTransportControlsSessionManager as SessionManager,
        GlobalSystemMediaTransportControlsSessionMediaProperties as Properties,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus as Status,
    },
    Media::MediaPlaybackAutoRepeatMode as Repeat,
    Storage::Streams::{DataReader, IRandomAccessStream},
};

/// How often the session is read while something is unsettled: a new cover on its way, a
/// player that failed to answer, or no events to wait on.
const POLL: Duration = Duration::from_millis(500);
/// How long the watcher sleeps when nothing has been heard, in case an event went missing.
const REFRESH: Duration = Duration::from_secs(5);
/// The least time between two reads, so a player that reports its position many times a
/// second costs no more than the polling did.
const MIN_GAP: Duration = Duration::from_millis(250);
/// How long the cover keeps being re-read after a track change.
const COVER_SETTLE: Duration = Duration::from_secs(5);
/// 1601-01-01 to 1970-01-01, in the 100 ns ticks WinRT dates use.
const UNIX_EPOCH_TICKS: i64 = 116_444_736_000_000_000;

/// How long reads may keep failing before the island lets go of the song: a player that's busy
/// for a moment shouldn't collapse the island and bring the sneak peek back.
const LET_GO: Duration = Duration::from_secs(2);

static MANAGER: OnceLock<SessionManager> = OnceLock::new();
/// The session the island shows, so the buttons control that one and not whichever Windows calls current.
static SHOWN: Mutex<Option<Session>> = Mutex::new(None);
static COVER: Mutex<Vec<u8>> = Mutex::new(Vec::new());

/// What a player's event says: the set of players changed, or something about one did.
#[derive(Clone, Copy, PartialEq)]
enum Wake {
    Sessions,
    Change,
}

/// A session being listened to, with the tokens that take its three handlers off again.
type Heard = (Session, [i64; 3]);

/// A handler that only passes the news on; the watcher does the reading.
fn waker<S, A>(send: &Sender<Wake>, wake: Wake) -> TypedEventHandler<S, A>
where
    S: RuntimeType + 'static,
    A: RuntimeType + 'static,
{
    let send = send.clone();
    TypedEventHandler::new(move |_, _| {
        if send.send(wake).is_err() {
            eprintln!("visor: a media change had no watcher to go to");
        }
        Ok(())
    })
}

/// Listens to every open player: one that isn't shown may start playing, and then it is.
fn listen(manager: &SessionManager, send: &Sender<Wake>, heard: &mut Vec<Heard>) {
    for (session, [media, playback, timeline]) in heard.drain(..) {
        let removed = session
            .RemoveMediaPropertiesChanged(media)
            .and(session.RemovePlaybackInfoChanged(playback))
            .and(session.RemoveTimelinePropertiesChanged(timeline));
        if let Err(e) = removed {
            eprintln!("visor: a player's handlers stayed on, most likely it closed: {e}");
        }
    }
    let sessions = match manager.GetSessions() {
        Ok(sessions) => sessions,
        Err(e) => return eprintln!("visor: listing players failed: {e}"),
    };
    for session in sessions {
        let tokens = (|| {
            windows::core::Result::Ok([
                session.MediaPropertiesChanged(&waker(send, Wake::Change))?,
                session.PlaybackInfoChanged(&waker(send, Wake::Change))?,
                session.TimelinePropertiesChanged(&waker(send, Wake::Change))?,
            ])
        })();
        match tokens {
            Ok(tokens) => heard.push((session, tokens)),
            Err(e) => eprintln!("visor: a player's changes can't be followed: {e}"),
        }
    }
}

/// Follows whatever Windows shows in its own media flyout: Spotify, a browser tab, Media Player.
/// It reads when a player says something changed, and otherwise sleeps.
pub fn watch(app: AppHandle) {
    let manager = match SessionManager::RequestAsync().and_then(|op| op.join()) {
        Ok(m) => MANAGER.get_or_init(|| m),
        Err(e) => return eprintln!("visor: no media sessions: {e}"),
    };
    let (send, wakes) = mpsc::channel();
    let events = manager
        .SessionsChanged(&waker(&send, Wake::Sessions))
        .and(manager.CurrentSessionChanged(&waker(&send, Wake::Change)))
        .map_err(|e| eprintln!("visor: no media events, polling instead: {e}"))
        .is_ok();
    let mut heard = Vec::new();
    let mut wake = Wake::Sessions;
    let mut key = String::new();
    let mut cover = 0;
    let mut settle = Instant::now();
    let mut failing: Option<Instant> = None;
    loop {
        let started = Instant::now();
        if wake == Wake::Sessions {
            listen(manager, &send, &mut heard);
        }
        let last = SHOWN.lock().unwrap().clone();
        let session = pick(manager, last.as_ref());
        *SHOWN.lock().unwrap() = session.clone();
        match session.map(|s| read(&s, &mut key, &mut cover, &mut settle)) {
            Some(Ok(media)) => {
                failing = None;
                state::update(&app, |s| s.media = Some(media));
            }
            Some(Err(e)) => {
                let since = *failing.get_or_insert_with(|| {
                    eprintln!("visor: reading media failed: {e}");
                    started
                });
                if started.duration_since(since) >= LET_GO {
                    state::update(&app, |s| s.media = None);
                }
            }
            None => {
                failing = None;
                state::update(&app, |s| s.media = None);
            }
        }
        let unsettled = !events || failing.is_some() || Instant::now() < settle;
        wake = match wakes.recv_timeout(if unsettled { POLL } else { REFRESH }) {
            Ok(first) => {
                // The first event after a quiet spell is read at once; a burst waits out the gap
                // and is answered by one read.
                if let Some(rest) = MIN_GAP.checked_sub(started.elapsed()) {
                    thread::sleep(rest);
                }
                if wakes.try_iter().any(|w| w == Wake::Sessions) {
                    Wake::Sessions
                } else {
                    first
                }
            }
            Err(RecvTimeoutError::Timeout) => Wake::Change,
            Err(RecvTimeoutError::Disconnected) => return eprintln!("visor: media events stopped"),
        };
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
    settle: &mut Instant,
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
        *settle = Instant::now() + COVER_SETTLE;
    }
    if Instant::now() < *settle || COVER.lock().unwrap().is_empty() {
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
