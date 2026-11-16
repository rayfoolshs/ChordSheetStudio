# Changelog

All notable changes to Chord Sheet Studio are documented here.

## [Unreleased] - 2026-11-14

### Added

- **Save to file menu:** the header **Save** button downloads the A4 sheet as a PDF or PNG, saves a `.json` project file, and opens a saved project file from disk.
- **Drum machine patterns:** Blues, Jazz, Bossa Nova, Rock, and Ballad, plus an Off option.
- **Adjustable swing:** 0–100% control shown for the Blues and Jazz patterns only.
- **Drum volume:** Independent 0–100% slider backed by a dedicated drum bus with a gentle compressor.
- **Live drum controls:** Pattern, swing, and volume can be changed without restarting playback.
- **Header credit:** “Created by Ray Foo” above the Chord Sheet Studio wordmark.
- **Project documentation:** `README.md`, `CHANGELOG.md`, drum reference, and deployment guide.
- **GitHub Pages deployment:** Automated build and deployment workflow for the public demo.

### Changed

- Playback sequencing now runs on eighth-note steps so drum hits can be placed on and between beats.
- Swing delays off-beat eighth notes from straight time to a triplet shuffle.
- Added persisted `drumPattern`, `drumVolume`, and `swing` values to saved charts, exports, and share links.
- Vite now uses the `/ChordSheetStudio/` base path when building for GitHub Pages.

### Fixed

- Drum layering is compressed to reduce clipping from simultaneous kick, snare, and cymbal hits.
- Shared app links and the header icon now respect the Vite base path used by GitHub Pages.
- GitHub Pages assets now resolve under `/ChordSheetStudio/` after the repository was renamed, fixing the blank page on the published site.

### Documentation

- [docs/DRUMS.md](docs/DRUMS.md) — pattern catalogue, swing math, and extension guide.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — GitHub Pages setup, base path, and PWA notes.

## [0.1.0] - Initial commit

### Added

- Initial Chord Sheet Studio app scaffold.
- Chord parsing, voicings, transposition, capo support, and A4 print preview.
- General MIDI SoundFont playback and offline PWA support.
