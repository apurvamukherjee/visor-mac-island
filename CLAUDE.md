# Visor

A macOS notch app (SwiftUI, Apple silicon, macOS 14+). It shows music, calendar, a file shelf, and volume/brightness HUDs in the notch.

## Build

- `project.yml` is the source of truth. `Visor.xcodeproj` and `Generated-Info.plist` are generated and gitignored.
- `xcodegen generate` → `xcodebuild -scheme Visor -configuration Release build`
- `scripts/make-dmg.sh` builds a local, ad-hoc-signed `dist/Visor.dmg`. It is not for distribution.
- Swift 5 language mode, on purpose. Don't turn on Swift 6 strict concurrency.
- Package versions in `project.yml` are pinned exactly. Don't bump them unless asked.

## Layout

- `Visor/VisorApp.swift`, `VisorViewCoordinator.swift`: entry point and notch state
- `Visor/components/`: UI grouped by feature (Notch, Music, Calendar, Shelf, Settings, Onboarding, Webcam, Live activities, Tabs)
- `Visor/managers/`: system services (music, volume, brightness, battery, calendar, webcam)
- `Visor/MediaControllers/`: one controller per player (Apple Music, Spotify, YouTube Music, Now Playing)
- `Visor/private/`: private SkyLight/CGS APIs for full-screen spaces and the window level

## Rules

- `Visor/` is excluded from SwiftLint and SwiftFormat on purpose. Don't reformat existing files.
- Keep file headers and license notices as they are.
- Don't touch `backup/`. It is a local-only reference archive and is gitignored.
- Only commit when asked.

## License

GPL-3.0. See `LICENSE`.
