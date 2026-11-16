# Chord Sheet Studio

**Created by Ray Foo**

Turn chord progressions into printable A4 chord sheets with guitar, keyboard, and ukulele voicings, transposition, capo support, audio playback, and a built-in drum machine.

- **Live app:** https://rayfoolshs.github.io/ChordSheetStudio/
- **Source:** https://github.com/rayfoolshs/ChordSheetStudio

## Features

### Chord sheets

- Enter progressions in a configurable bar grid
- Guitar, keyboard, and ukulele chord diagrams
- Left- and right-handed guitar/piano diagrams
- Slash chords (`G/B`), split bars (`G | D`), repeat bars (`%`), and no-chord bars (`NC`)
- Transpose in semitones with automatic key detection
- Capo support with optional capo shapes
- Chord voicing picker for each instrument
- Live A4 preview and one-page print/PDF output
- Standalone iOS PDF export flow

### Playback

- General MIDI SoundFont playback with 128 instruments and two banks
- Instant synthesized fallback while a SoundFont is loading or when offline
- Adjustable tempo from 40–240 BPM
- Time signatures: `4/4`, `3/4`, `6/8`, and `2/4`
- Optional metronome click
- Active bar highlighting during playback

### Drum machine

- Selectable `Blues`, `Jazz`, `Bossa Nova`, `Rock`, and `Ballad` patterns
- Adjustable swing for **Blues** and **Jazz** only, from straight to triplet feel
- Independent drum volume slider
- Fully synthesized drum kit — no extra samples or network requests
- Patterns follow the selected time signature

See [docs/DRUMS.md](docs/DRUMS.md) for pattern details and implementation notes.

### Library, sharing, and offline use

- Save charts to the browser library
- **Save menu** in the header downloads the sheet as a **PDF** or **PNG**, saves a **`.json` project file**, and re-opens a saved project file
- Shareable chart links with the song data encoded in the URL hash
- Installable PWA with offline support
- Cached SoundFonts and web fonts

## Tech stack

- React 19 + TypeScript
- Vite
- Tailwind CSS
- `smplr` for General MIDI SoundFont playback
- `vite-plugin-pwa` for the service worker and installable app
- Web Audio API for synthesized drums and the fallback instrument
- `html2canvas` for the iOS PDF export path

## Getting started

### Requirements

- Node.js 20 or newer
- npm, or Bun 1.2+ (the repository includes `bun.lock`)

### Install

```bash
npm install --legacy-peer-deps
```

The legacy peer flag is currently needed because the Vite 8 / esbuild peer ranges in this dependency set do not resolve cleanly under npm's default strict peer checking.

Alternatively, with Bun:

```bash
bun install
```

### Run the dev server

```bash
npm run dev
```

Vite serves the app at `http://localhost:3000` when that port is free. If the port is occupied, Vite prints the port it selected (for example `http://localhost:3001`).

### Build and lint

```bash
npm run lint
npm run build
npm run preview
```

## Is the drum volume separate from the metronome?

Yes. The metronome and drums have separate controls:

- **Click** toggles the metronome.
- **Drum volume** sets the drum bus level from `0–100%`.
- The drum bus has a gentle compressor so layered hits do not clip.

## How do I save a chord sheet to a file?

Open the **Save** menu in the header:

- **Download PDF** — saves the A4 sheet as a PDF file directly, without the print dialog.
- **Download PNG** — saves a high-resolution image of the sheet for chats, slides, or worksheets.
- **Save project (.json)** — saves every setting (chords, key, capo, drums, voicings) so you can edit it later.
- **Open project (.json)** — loads a saved project file back into the editor.

File names follow the song title, for example `I-Got-A-Feeling.pdf`. The **Print / Save PDF** button still opens the browser print dialog for vector output and paper printing.

## GitHub Pages

The app is deployed automatically to GitHub Pages from the `main` branch.

- **Workflow:** [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)
- **Live URL:** https://rayfoolshs.github.io/ChordSheetStudio/
- **Base path:** `/ChordSheetStudio/` when `GITHUB_PAGES=true`

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full deployment and troubleshooting guide.

## Project structure

```text
src/
  App.tsx                 App shell, editor, playback scheduler, UI
  types.ts                Shared types and SheetState
  components/             Preview, diagrams, library, print help, PWA UI
  hooks/                  PWA install hook
  lib/
    audio.ts              SoundFont playback, synth fallback, drum synthesis
    chords.ts             Chord parsing and voicing generation
    drums.ts              Drum pattern definitions and meter handling
    pdf.ts                A4 print zoom, PDF/PNG rendering, file downloads
    storage.ts            Local storage, defaults, sanitization, share links
public/                   PWA icons and app icon
docs/                     Additional documentation
```

## Notes

- Chart data is stored locally in the browser. There is no account system or backend.
- SoundFonts are downloaded from the MIDI.js soundfont CDN and cached by the service worker. Drum sounds are synthesized locally.
- The app is designed to work offline after the first load.

## Credits

Created and maintained by **Ray Foo**.
