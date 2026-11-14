# Drum Machine Reference

Chord Sheet Studio includes a small synthesized drum machine that plays along with the chord progression. It is intentionally sample-free so it works offline and starts instantly.

## Controls

The drum controls sit directly above the progression grid.

| Control | Values | Notes |
| --- | --- | --- |
| Drums | Off, Blues, Jazz, Bossa Nova, Rock, Ballad | Pattern selector |
| Swing | 0–100% | Visible only for Blues and Jazz |
| Drum volume | 0–100% | Independent drum bus level |

The `Off` option stops all drum hits while leaving chord playback and the metronome untouched.

## Pattern catalogue

Patterns are written on an eighth-note grid (8 steps per 4/4 bar). The `3/4` and `2/4` meters reuse the opening steps of the same patterns. `6/8` has a dedicated compound pattern set.

| Pattern | Feel | Main voices |
| --- | --- | --- |
| Blues | Shuffle | Kick, snare backbeat, closed hats with swing |
| Jazz | Ride-driven swing | Ride cymbal, hi-hat foot, ghost snare |
| Bossa Nova | Syncopated Latin | Cross-stick rim, shaker, syncopated kick |
| Rock | Straight backbeat | Kick, snare, closed hats |
| Ballad | Soft and sparse | Soft kick/snare, ride, brush swells |

### Voice synthesis

All drum voices are generated with the Web Audio API in `src/lib/audio.ts`:

- `kick` — pitched sine drop
- `snare` — filtered noise plus a short body tone
- `hatClosed` / `hatOpen` — high-passed noise
- `ride` — band-passed noise plus a high sine ping
- `rim` — short cross-stick noise and tone
- `shaker` — short high-passed noise burst
- `brush` — slower band-passed noise swell

The drum bus feeds a `DynamicsCompressorNode` before the main output, which keeps layered hits from clipping.

## Swing

Swing is a feel control for patterns where eighth notes are unevenly spaced. It is available for **Blues** and **Jazz** only.

- `0%` — straight eighths
- `100%` — triplet shuffle (the off-beat lands two-thirds of the way through the beat)

The scheduler uses this formula:

```text
stepDuration = beatDuration / 2
offBeatDelay = (swing / 100) * (stepDuration / 3)
```

Only odd-ninth steps are delayed, so the downbeat stays anchored. `swing` is ignored for `6/8`, where the meter is already compound.

## Playback scheduler

`src/App.tsx` runs the sequencer on eighth-note steps:

1. One tick is one eighth note.
2. Chords and the metronome trigger on even steps (the beat).
3. Drums can trigger on even or odd steps.
4. When the current step is an off-beat and the pattern is Blues or Jazz, the drum hit is scheduled with the swing delay.
5. The active bar highlight updates on the beat.

Changing the drum pattern or swing while playing takes effect without restarting playback because those values are read from a live ref. Changing the drum volume updates the drum bus immediately.

## Data model

`SheetState` stores the drum settings:

```ts
drumPattern: DrumPattern; // 'none' | 'blues' | 'jazz' | 'bossa' | 'rock' | 'ballad'
drumVolume: number;       // 0-100
swing: number;            // 0-100, used by blues/jazz only
```

The values are persisted with the active chart, included in saved charts, and carried through share links. Older saved charts are sanitized to the defaults: `Off`, `75%` volume, and `60%` swing.

## Adding a pattern

1. Add the pattern id to `DrumPattern` in `src/types.ts`.
2. Add it to `DRUM_PATTERN_OPTIONS` in `src/lib/drums.ts`.
3. Add a step list to `SIMPLE_PATTERNS` for 4/4-family meters.
4. Add a compound step list to `COMPOUND_PATTERNS` if a dedicated `6/8` feel is needed.
5. Use an existing `DrumVoice` or add a new voice in `src/lib/audio.ts`.
6. Add the sanitizer value in `src/lib/storage.ts` if it should survive loading.
7. Run `npm run lint` and `npm run build`.

Step indices are zero-based eighth-note positions in `4/4` (`0` = beat 1, `1` = the “and” of beat 1, and so on).

## Manual test checklist

- Select every pattern and start playback.
- Confirm the active bar still highlights on the beat.
- Confirm the Swing slider appears only for Blues and Jazz.
- Move swing from 0% to 100% during playback and listen for the off-beat delay.
- Move drum volume from 100% to 0% and confirm only the drums fade out.
- Switch patterns while playback is running and confirm the change is immediate.
- Change time signature and confirm the drum pattern follows the new meter.
- Reload the page and confirm the pattern, swing, and volume persist.
