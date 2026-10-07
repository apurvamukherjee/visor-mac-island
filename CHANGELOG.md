# Changelog

What changed in each Visor release. Downloads are on the [Releases](https://github.com/apurvamukherjee/visor-mac-island/releases) page; the newest is always [`Visor.dmg`](https://github.com/apurvamukherjee/visor-mac-island/releases/latest/download/Visor.dmg).

Versions are `MAJOR.MINOR.PATCH`: a new feature bumps MINOR, a fix bumps PATCH.

## 3.4.0 (build 42) · 2026-10-08

- **Join video calls in one click.** Zoom, Google Meet, Teams and Webex events get a Join button in the calendar. Two minutes before the call, a Join button also appears beside the notch and stays until five minutes in. Settings → Calendar.
- **Switch audio output.** An Audio Output button for the player (add it in Settings → Media) moves sound between the Mac's speakers, AirPods, headphones, a display or AirPlay.
- **Camera and microphone dots.** Green in the notch while an app uses a camera, orange while one uses the microphone. Settings → Appearance.
- **Swipe to change track.** Two fingers left on the closed notch plays the next track, right goes back one. Settings → General.
- **Liquid Glass fixes.** The header buttons, the open-notch HUD and the calendar's day strip no longer show black patches over the glass.
- The README's download button now fetches the latest `Visor.dmg` directly.

## 3.3.0 (build 41) · 2026-10-08

- **Lighter on battery.** The visualizer no longer wakes Visor three times a second while music plays, cover art is decoded at 600 px instead of full size, and the glow behind the cover is blurred once per song instead of every frame.
- **Low Power Mode aware.** In Low Power Mode, or when the Mac runs hot, the visualizer holds still and the progress bar updates once a second.
- **Crisper close.** The notch fades and shrinks when it closes instead of blurring.
- **Update notices.** Visor checks GitHub once a day; a new version shows in the menu bar menu and Settings → About.
- **Search in Settings.**
- **Liquid Glass** for the open notch on macOS 26 (Settings → Appearance). The closed notch stays black.
- **Peek before opening** (Settings → General): hovering first shows the timer, your next event or the song.

## 3.2.0 (build 40) · 2026-10-08

- **Timer.** Start a 1 to 60 minute timer from the open notch; the countdown sits beside the closed notch and a bell rings at the end.
- **Lock screen widgets.** While locked, a panel below the clock shows what's playing, with controls, and any running timer.
- **Download progress.** A ring beside the notch while Safari, Chrome or Firefox downloads into your Downloads folder.
- **Weather** under the year in the calendar (off by default; asks for your location once).
- **More shelf actions.** Export a PDF's pages as images, shrink images for sharing, and Copy Path is always in the menu.

## 3.1.4 (build 39) · 2026-09-29

- The lock-screen padlock stays beside the notch until you unlock. If music is playing, the album cover shows instead.

## 3.1.3 (build 38) · 2026-09-28

- Fixed the custom accent colour wheel, which only kept the first change.
- Fixed a thin sliver of the real notch showing below the island with "Match real notch height".
- Fixed the volume and brightness HUD sometimes stopping until relaunch, and the volume HUD watching the old device after switching output.
- Removed the YouTube Music controller; Now Playing already covers it.
- A 1.4 MB download.

## 3.1.2 (build 37) · 2026-09-25

- Fixed dragging the HUD bar on the closed notch, which moved but changed nothing.
- Fixed album covers from browser players showing the app icon or the previous song's cover.
- Fixed the sneak peek replaying on every play/pause.
- A 1.5 MB download and a 4.5 MB app, with three packages and about 3,100 lines of unused code gone.
- Removed the disabled "App icon" and horizontal-gesture options and "Extend hover area".

## 3.1.1 · 2026-09-24

- A 2.8 MB download (was 7 MB) and a 9.5 MB app (was 23 MB).
- Lighter at idle: no timers left running after the notch changes, and no redraws on every volume or battery change.
- Artwork, lyrics and covers fetched and decoded once instead of on every update.
- Fixed favouriting a track in Apple Music.

## 3.1.0 · 2026-09-24

- **Vinyl mode.** A spinning record with the cover on its label, and a tonearm that drops on play.
- **Lock and unlock animation.** A padlock in the notch that morphs closed or open.
- A vinyl-record menu bar icon.
- Visor 3 is a new app from the ground up: the island, settings, welcome tour, HUDs, shelf, calendar and Now Playing from any app.
