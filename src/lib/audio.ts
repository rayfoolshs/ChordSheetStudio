import { CacheStorage, Soundfont, getSoundfontNames } from 'smplr';

export type SoundfontKit = 'FluidR3_GM' | 'MusyngKite';
export type SoundfontStatus = 'idle' | 'loading' | 'ready' | 'fallback';

export interface GmInstrumentOption {
  id: string;
  label: string;
}

const POPULAR_GM_IDS = [
  'acoustic_grand_piano',
  'electric_piano_1',
  'acoustic_guitar_nylon',
  'acoustic_guitar_steel',
  'electric_guitar_clean',
  'electric_guitar_jazz',
  'overdriven_guitar',
  'drawbar_organ',
  'church_organ',
  'accordion',
  'harpsichord',
  'vibraphone',
  'marimba',
  'string_ensemble_1',
  'brass_section',
  'choir_aahs',
  'pad_2_warm',
];

export function formatGmName(id: string): string {
  return id
    .split('_')
    .map((part) => (part.length ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

export const POPULAR_GM_OPTIONS: GmInstrumentOption[] = POPULAR_GM_IDS.map((id) => ({
  id,
  label: formatGmName(id),
}));

export const ALL_GM_OPTIONS: GmInstrumentOption[] = getSoundfontNames()
  .slice()
  .sort()
  .map((id) => ({
    id,
    label: formatGmName(id),
  }));

let sharedCtx: AudioContext | null = null;
let sharedStorage: ReturnType<typeof CacheStorage> | null = null;
const loadedInstruments = new Map<string, Soundfont>();
const loadingPromises = new Map<string, Promise<Soundfont | null>>();
const statusListeners = new Set<(key: string, status: SoundfontStatus) => void>();

export function onSoundfontStatus(listener: (key: string, status: SoundfontStatus) => void): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

function emitStatus(key: string, status: SoundfontStatus) {
  statusListeners.forEach((fn) => fn(key, status));
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedCtx) {
    sharedCtx = new Ctor();
  }
  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

function getStorage() {
  if (typeof window === 'undefined' || !('caches' in window)) return undefined;
  if (!sharedStorage) {
    sharedStorage = CacheStorage('chord-sheet-soundfonts-v1');
  }
  return sharedStorage;
}

function cacheKey(instrument: string, kit: SoundfontKit): string {
  return `${kit}:${instrument}`;
}

export function getSoundfontState(instrument: string, kit: SoundfontKit = 'FluidR3_GM'): SoundfontStatus {
  const key = cacheKey(instrument, kit);
  if (loadedInstruments.has(key)) return 'ready';
  if (loadingPromises.has(key)) return 'loading';
  return 'idle';
}

export async function preloadSoundfont(
  instrument: string,
  kit: SoundfontKit = 'FluidR3_GM'
): Promise<Soundfont | null> {
  const ctx = getAudioContext();
  if (!ctx) return null;
  const key = cacheKey(instrument, kit);

  const cached = loadedInstruments.get(key);
  if (cached) return cached;

  const existingPromise = loadingPromises.get(key);
  if (existingPromise) return existingPromise;

  emitStatus(key, 'loading');
  const promise = (async () => {
    try {
      const sf = Soundfont(ctx, {
        instrument,
        kit,
        storage: getStorage(),
        volume: 105,
      });
      await sf.ready;
      loadedInstruments.set(key, sf);
      emitStatus(key, 'ready');
      return sf;
    } catch {
      emitStatus(key, 'fallback');
      return null;
    } finally {
      loadingPromises.delete(key);
    }
  })();

  loadingPromises.set(key, promise);
  return promise;
}

export function stopAllAudio(): void {
  loadedInstruments.forEach((sf) => {
    try {
      sf.stop();
    } catch {
      // ignore
    }
  });
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Instant Web Audio fallback synthesizer when SoundFont is still loading or unavailable offline
function playSynthFallback(
  midiNotes: number[],
  style: 'strum' | 'piano',
  duration: number,
  strumGap: number,
  bright = 2400
) {
  const ctx = getAudioContext();
  if (!ctx || !midiNotes.length) return;
  const now = ctx.currentTime + 0.015;
  const perNoteGain = Math.min(0.16, 0.42 / Math.max(1, midiNotes.length));

  midiNotes.forEach((midi, idx) => {
    const startTime = now + idx * (style === 'strum' ? strumGap : 0.012);
    const freq = midiToFreq(midi);
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    if (style === 'strum') {
      osc1.type = 'triangle';
      osc2.type = 'sawtooth';
      osc2.detune.setValueAtTime(3.5, startTime);
      filter.frequency.setValueAtTime(bright, startTime);
      filter.frequency.exponentialRampToValueAtTime(Math.max(240, freq * 1.4), startTime + duration * 0.7);
    } else {
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, startTime);
      filter.frequency.setValueAtTime(3400, startTime);
      filter.frequency.exponentialRampToValueAtTime(750, startTime + duration * 0.8);
    }

    osc1.frequency.setValueAtTime(freq, startTime);
    if (style === 'strum') osc2.frequency.setValueAtTime(freq, startTime);

    filter.type = 'lowpass';
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(perNoteGain, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration + 0.05);
    osc2.stop(startTime + duration + 0.05);
  });
}

/**
 * Plays MIDI notes using the requested General MIDI SoundFont instrument.
 * If the SoundFont isn't decoded yet, triggers preload and plays instant fallback so clicks never stall.
 */
export function playSoundfontChord(
  midiNotes: number[],
  options: {
    instrument: string;
    kit?: SoundfontKit;
    duration?: number;
    strumGap?: number;
    velocity?: number;
    fallbackStyle?: 'strum' | 'piano';
    fallbackBright?: number;
  }
): void {
  const ctx = getAudioContext();
  if (!ctx || !midiNotes.length) return;

  const {
    instrument,
    kit = 'FluidR3_GM',
    duration = 1.6,
    strumGap = 0.028,
    velocity = 96,
    fallbackStyle = 'piano',
    fallbackBright = 2400,
  } = options;

  const key = cacheKey(instrument, kit);
  const sf = loadedInstruments.get(key);

  if (sf) {
    const startAt = ctx.currentTime + 0.015;
    midiNotes.forEach((midi, idx) => {
      sf.start({
        note: midi,
        velocity,
        time: startAt + idx * strumGap,
        duration,
      });
    });
    return;
  }

  // Trigger background load for subsequent bars/clicks, and play instant synth fallback now
  void preloadSoundfont(instrument, kit);
  playSynthFallback(midiNotes, fallbackStyle, duration, strumGap, fallbackBright);
}

export function playStrumMidi(
  midiNotes: number[],
  duration = 1.6,
  strumGap = 0.03,
  bright = 2400,
  instrument = 'acoustic_guitar_steel',
  kit: SoundfontKit = 'FluidR3_GM'
): void {
  playSoundfontChord(midiNotes, {
    instrument,
    kit,
    duration,
    strumGap,
    velocity: 92,
    fallbackStyle: 'strum',
    fallbackBright: bright,
  });
}

export function playPianoMidi(
  midiNotes: number[],
  duration = 1.6,
  instrument = 'acoustic_grand_piano',
  kit: SoundfontKit = 'FluidR3_GM'
): void {
  playSoundfontChord(midiNotes, {
    instrument,
    kit,
    duration,
    strumGap: 0.01,
    velocity: 95,
    fallbackStyle: 'piano',
  });
}

export function playMetronomeClick(accent = false): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime + 0.005;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(accent ? 1200 : 880, now);
  osc.frequency.exponentialRampToValueAtTime(accent ? 600 : 440, now + 0.035);
  gain.gain.setValueAtTime(accent ? 0.14 : 0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.05);
}
