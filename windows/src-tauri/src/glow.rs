use crate::{audio, error::Result, state};
use std::{
    sync::atomic::{AtomicBool, Ordering},
    thread,
    time::{Duration, Instant},
};
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder,
};
use windows::Win32::{
    Media::Audio::{
        eConsole, eRender, IAudioCaptureClient, IAudioClient, IMMDeviceEnumerator,
        MMDeviceEnumerator, AUDCLNT_BUFFERFLAGS_SILENT, AUDCLNT_SHAREMODE_SHARED,
        AUDCLNT_STREAMFLAGS_LOOPBACK,
    },
    System::Com::{CoCreateInstance, CoTaskMemFree, CLSCTX_ALL},
};

/// Settings › Music › Edge glow.
pub static ENABLED: AtomicBool = AtomicBool::new(false);

const IDLE: Duration = Duration::from_millis(250);
/// About 30 levels a second: the glow smooths between them itself.
const FRAME: Duration = Duration::from_millis(33);
/// A second of buffer, in 100 ns units; loopback only fills what plays.
const BUFFER: i64 = 10_000_000;

/// Kick drums and bass sit below this; above it the glow would follow hi-hats.
const CUTOFF_HZ: f32 = 150.0;
/// The quietest reference the level is measured against, so silence is not amplified into a glow.
const FLOOR: f32 = 0.02;
/// Per frame: at 30 a second the reference halves in about 15 s.
const PEAK_DECAY: f32 = 0.9985;
const AUDIBLE: f32 = 1e-5;

/// Bass loudness relative to the loudest the music has been lately, as the Mac's BassMeter.
pub struct BassMeter {
    coefficient: f32,
    lowpass: f32,
    peak: f32,
}

impl BassMeter {
    pub fn new(sample_rate: f32) -> Self {
        Self {
            coefficient: 1.0 - (-2.0 * std::f32::consts::PI * CUTOFF_HZ / sample_rate).exp(),
            lowpass: 0.0,
            peak: FLOOR,
        }
    }

    /// Interleaved samples in, the bass level 0..=1 and whether anything was audible out.
    pub fn measure(&mut self, samples: &[f32], channels: usize) -> (f32, bool) {
        let channels = channels.max(1);
        let (mut sum, mut loudest, mut frames) = (0.0f32, 0.0f32, 0usize);
        for frame in samples.chunks_exact(channels) {
            let mono = frame.iter().sum::<f32>() / channels as f32;
            loudest = loudest.max(mono.abs());
            self.lowpass += self.coefficient * (mono - self.lowpass);
            sum += self.lowpass * self.lowpass;
            frames += 1;
        }
        let rms = if frames == 0 {
            0.0
        } else {
            (sum / frames as f32).sqrt()
        };
        self.peak = rms.max(self.peak * PEAK_DECAY).max(FLOOR);
        ((rms / self.peak).min(1.0), loudest > AUDIBLE)
    }
}

/// What the glow windows hear each frame.
#[derive(serde::Serialize, Clone, Copy)]
struct Level {
    level: f32,
    /// False when nothing is audible, so the glow breathes instead of sitting still.
    live: bool,
}

/// The output mix through WASAPI loopback: no permission needed, and nothing is kept but loudness.
struct Loopback {
    client: IAudioClient,
    capture: IAudioCaptureClient,
    channels: usize,
    meter: BassMeter,
}

impl Loopback {
    fn open() -> Result<Self> {
        let enumerator: IMMDeviceEnumerator =
            unsafe { CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)? };
        let device = unsafe { enumerator.GetDefaultAudioEndpoint(eRender, eConsole)? };
        let client: IAudioClient = unsafe { device.Activate(CLSCTX_ALL, None)? };
        let format = unsafe { client.GetMixFormat()? };
        let (channels, bits, rate) = unsafe {
            let f = &*format;
            (
                f.nChannels as usize,
                f.wBitsPerSample,
                f.nSamplesPerSec as f32,
            )
        };
        let started = unsafe {
            client.Initialize(
                AUDCLNT_SHAREMODE_SHARED,
                AUDCLNT_STREAMFLAGS_LOOPBACK,
                BUFFER,
                0,
                format,
                None,
            )
        };
        unsafe { CoTaskMemFree(Some(format as *const _)) };
        started?;
        // ponytail: the shared mix format is 32-bit float on every Windows 10/11 machine seen; anything else is refused, not converted.
        if bits != 32 {
            return Err(format!("the output mixes {bits}-bit samples, not 32-bit float").into());
        }
        let capture: IAudioCaptureClient = unsafe { client.GetService()? };
        unsafe { client.Start()? };
        Ok(Self {
            client,
            capture,
            channels,
            meter: BassMeter::new(rate),
        })
    }

    /// Everything captured since the last call, as one level.
    fn read(&mut self) -> Result<Level> {
        let mut samples = Vec::new();
        loop {
            if unsafe { self.capture.GetNextPacketSize()? } == 0 {
                break;
            }
            let (mut data, mut frames, mut flags) = (std::ptr::null_mut(), 0u32, 0u32);
            unsafe {
                self.capture
                    .GetBuffer(&mut data, &mut frames, &mut flags, None, None)?
            };
            let count = frames as usize * self.channels;
            if flags & AUDCLNT_BUFFERFLAGS_SILENT.0 as u32 != 0 || data.is_null() {
                samples.resize(samples.len() + count, 0.0);
            } else {
                samples.extend_from_slice(unsafe {
                    std::slice::from_raw_parts(data as *const f32, count)
                });
            }
            unsafe { self.capture.ReleaseBuffer(frames)? };
        }
        let (level, live) = self.meter.measure(&samples, self.channels);
        Ok(Level { level, live })
    }
}

impl Drop for Loopback {
    fn drop(&mut self) {
        if let Err(e) = unsafe { self.client.Stop() } {
            eprintln!("visor: stopping the glow's loopback failed: {e}");
        }
    }
}

fn wanted(app: &AppHandle) -> bool {
    if !ENABLED.load(Ordering::Relaxed) {
        return false;
    }
    let state = app.state::<state::Shared>();
    let state = state.0.lock().unwrap();
    !state.locked && state.media.as_ref().is_some_and(|m| m.playing)
}

fn glow_windows(app: &AppHandle) -> Vec<(String, tauri::WebviewWindow)> {
    app.webview_windows()
        .into_iter()
        .filter(|(l, _)| l.starts_with("glow-"))
        .collect()
}

/// One click-through window over each whole monitor. The islands raise themselves above it.
fn open_windows(app: &AppHandle, generation: u32) -> Result<()> {
    for (i, monitor) in app.available_monitors()?.iter().enumerate() {
        let window =
            WebviewWindowBuilder::new(app, format!("glow-{generation}-{i}"), WebviewUrl::default())
                .transparent(true)
                .decorations(false)
                .shadow(false)
                .resizable(false)
                .always_on_top(true)
                .skip_taskbar(true)
                .focused(false)
                .focusable(false)
                .visible(false)
                .build()?;
        window.set_position(PhysicalPosition::new(
            monitor.position().x,
            monitor.position().y,
        ))?;
        window.set_size(PhysicalSize::new(
            monitor.size().width,
            monitor.size().height,
        ))?;
        window.set_ignore_cursor_events(true)?;
        let target = window.clone();
        app.run_on_main_thread(move || {
            if let Err(e) = crate::prefs::capture(&target) {
                eprintln!("visor: glow capture setting failed: {e}");
            }
        })?;
        window.show()?;
    }
    Ok(())
}

fn close_windows(app: &AppHandle) {
    for (label, window) in glow_windows(app) {
        if let Err(e) = window.destroy() {
            eprintln!("visor: closing {label} failed: {e}");
        }
    }
}

/// The glow's windows and its loopback exist only while it is on and music plays.
pub fn watch(app: AppHandle) {
    audio::com();
    let mut loopback: Option<Loopback> = None;
    let mut generation = 0u32;
    let mut monitors = 0usize;
    let mut retry_at = Instant::now();
    loop {
        if !wanted(&app) {
            if loopback.take().is_some() || !glow_windows(&app).is_empty() {
                close_windows(&app);
            }
            thread::sleep(IDLE);
            continue;
        }
        // A monitor plugged in or out gets a fresh set, as the islands do.
        let count = app
            .available_monitors()
            .map(|m| m.len())
            .unwrap_or(monitors);
        if glow_windows(&app).is_empty() || count != monitors {
            close_windows(&app);
            generation += 1;
            monitors = count;
            if let Err(e) = open_windows(&app, generation) {
                eprintln!("visor: opening the glow failed: {e}");
            }
        }
        if loopback.is_none() && Instant::now() >= retry_at {
            loopback = Loopback::open()
                .map_err(|e| {
                    eprintln!("visor: the glow can't hear the output: {e}");
                    retry_at = Instant::now() + Duration::from_secs(5);
                })
                .ok();
        }
        // Without the loopback the glow still runs, breathing as it does in silence.
        let level = match loopback.as_mut().map(Loopback::read) {
            Some(Ok(level)) => level,
            Some(Err(e)) => {
                // The output device changed or went away; the next frame opens the new one.
                eprintln!("visor: reading the glow's loopback failed: {e}");
                loopback = None;
                Level {
                    level: 0.0,
                    live: false,
                }
            }
            None => Level {
                level: 0.0,
                live: false,
            },
        };
        for (label, _) in glow_windows(&app) {
            if let Err(e) = app.emit_to(label.as_str(), "glow-level", level) {
                eprintln!("visor: {label} glow level failed: {e}");
            }
        }
        thread::sleep(FRAME);
    }
}

#[cfg(test)]
mod tests {
    use super::BassMeter;

    fn tone(hz: f32, seconds: f32) -> Vec<f32> {
        (0..(48_000.0 * seconds) as usize)
            .flat_map(|i| {
                let s = (2.0 * std::f32::consts::PI * hz * i as f32 / 48_000.0).sin() * 0.5;
                [s, s]
            })
            .collect()
    }

    #[test]
    fn silence_reads_as_nothing() {
        let mut meter = BassMeter::new(48_000.0);
        assert_eq!(meter.measure(&vec![0.0; 3200], 2), (0.0, false));
    }

    #[test]
    fn bass_lights_it_and_treble_barely_does() {
        let mut meter = BassMeter::new(48_000.0);
        let (bass, heard) = meter.measure(&tone(60.0, 0.1), 2);
        assert!(heard && bass > 0.9, "{bass}");
        let (treble, heard) = meter.measure(&tone(6_000.0, 0.1), 2);
        assert!(heard && treble < 0.1, "{treble}");
    }
}
