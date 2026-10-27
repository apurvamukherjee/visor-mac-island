# Visor for Windows

The Mac app's island at the top center of every monitor, built with Tauri (Rust + React). The icons, padlock, bell and `useNow` come from `../website/src`.

## Run it

On Windows 10 or 11, with Node 22+ and Rust:

```sh
npm ci && npm ci --prefix ../website
npm run tauri dev       # live reload
npm run tauri build     # installer in src-tauri/target/release/bundle/nsis
```

Checks: `npm run typecheck`, `npm run lint`, `npm test`, and `cargo test` in `src-tauri`.

From a Mac, `cargo check --target x86_64-pc-windows-msvc` type-checks the Rust once an `llvm-rc` is on the PATH (any stub that writes its `/fo` file will do).

## Releases

Windows releases are tagged `windows-v<version>` and never marked latest, so the Mac's update check and the site's DMG link keep pointing at the Mac release. Publishing one runs `.github/workflows/windows.yml`. It builds the tag's version, attaches `Visor-Setup-<version>.exe`, and leaves a filled-in winget manifest as a run artifact for submitting to `microsoft/winget-pkgs`. Builds are unsigned, so SmartScreen asks once: More info › Run anyway.

## Where the Mac and Windows differ

| Feature | Windows |
| --- | --- |
| Notch | Floats at the top center of each monitor, like Visor on Macs without a notch |
| Music | Whatever Windows' media flyout shows (Spotify, browsers, Media Player) |
| Volume HUD | Takes the volume keys from Windows when "Volume and brightness in the island" is on |
| Brightness HUD | Laptop panels only, and Windows' own flyout still shows: the keys never reach apps |
| Lock screen | Windows shows no app windows there; the padlock opens on unlock instead |
| Liquid Glass | Not available |
| Background removal | Not available: Windows has no built-in subject cutout |
| HEIC | Converts only with Microsoft's HEIF extension installed |
| Earbud battery | Not available: Windows doesn't expose AirPods battery |
| Calendar | ICS links only, no account sign-in |
