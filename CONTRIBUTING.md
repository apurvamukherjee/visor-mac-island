# Contributing to Visor

Thanks for helping. Bugs go in [Issues](https://github.com/apurvamukherjee/visor-mac-island/issues), questions and ideas in [Discussions](https://github.com/apurvamukherjee/visor-mac-island/discussions). New here? Look for issues labelled [`good first issue`](https://github.com/apurvamukherjee/visor-mac-island/labels/good%20first%20issue).

## Run it locally

The repo holds three apps:

| Folder | What | Needs |
| --- | --- | --- |
| `Visor/` | The Mac app (Swift, SwiftUI) | macOS 14+, Apple silicon, Xcode 26+ |
| `windows/` | The Windows app (Tauri: Rust + React) | Node 22, Rust stable |
| `website/` | The site with the in-browser demo (Vite + React) | Node 22 |

**Mac app.** The Xcode project is generated from `project.yml`, so don't edit `Visor.xcodeproj` by hand.

```bash
brew install xcodegen swiftlint
xcodegen generate
open Visor.xcodeproj   # or: xcodebuild -scheme Visor -configuration Debug build
```

**Website.**

```bash
cd website
npm ci
npm run dev
```

**Windows app.** Setup and build steps are in [`windows/README.md`](windows/README.md). It imports shared components from `website/`, so run `npm ci` in both folders.

## Checks

CI runs these on every push to `main`. Run the ones for the folders you touched before opening a PR.

```bash
# Mac app
swiftlint lint --quiet
xcodebuild -scheme Visor -configuration Debug CODE_SIGNING_ALLOWED=NO build
swiftc -parse-as-library Visor/models/LyricTiming.swift scripts/check-lyric-timing.swift -o /tmp/check-lyric-timing && /tmp/check-lyric-timing

# website/ and windows/
npm run typecheck
npm run lint
npm test

# windows/src-tauri
cargo test
```

## Pull requests

1. Fork the repo and branch off `main`.
2. Keep each PR to one change. Add a test when you change logic in `website/` or `windows/`.
3. Write commit messages like the existing history: `type(scope): what changed`, lowercase, e.g. `fix(windows/music): re-read the cover after a track change`. Types: `feat`, `fix`, `perf`, `docs`, `ci`, `chore`.
4. Open the PR against `main` and say what you tested, with a screenshot or clip for anything visible.

## Code style

- Swift: SwiftLint (`.swiftlint.yml`) and SwiftFormat (`.swiftformat`).
- TypeScript: strict mode and ESLint, as configured in each folder.
- Comments explain why, not what.

## Response times

Every new issue and pull request gets a first reply within a day. A fix may take longer, but you won't be left without an answer.

## License

By contributing you agree that your work is released under the [GPL-3.0](LICENSE).
