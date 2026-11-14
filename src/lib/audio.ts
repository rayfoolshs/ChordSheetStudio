import { CacheStorage, Soundfont, getSoundfontNames } from 'smplr';

export type SoundfontKit = 'FluidR3_GM' | 'MusyngKite';
export type SoundfontStatus = 'idle' | 'loading' | 'ready' | 'fallback';
export type DrumVoice =
  | 'kick'
  | 'snare'
  | 'hatClosed'
  | 'hatOpen'
  | 'ride'
  | 'rim'
  | 'shaker'
  | 'brush';

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

// ---------------------------------------------------------------------------
// Drum machine (synthesized, so patterns work offline and need no samples)
// ---------------------------------------------------------------------------

let drumBus: GainNode | null = null;
let drumVolume = 0.75;
let drumNoiseBuffer: AudioBuffer | null = null;

/** Sets the drum bus level. 0 = silent, 1 = full. Safe to call before audio starts. */
export function setDrumVolume(volume: number): void {
  drumVolume = Math.max(0, Math.min(1, Number.isFinite(volume) ? volume : 0));
  if (drumBus && sharedCtx) {
    drumBus.gain.setTargetAtTime(drumVolume, sharedCtx.currentTime, 0.015);
  }
}

function getDrumBus(ctx: AudioContext): GainNode {
  if (!drumBus) {
    drumBus = ctx.createGain();
    drumBus.gain.value = drumVolume;

    // Gentle glue compressor keeps layered hits (kick + snare + hats) from clipping
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -10;
    compressor.knee.value = 12;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.15;

    drumBus.connect(compressor);
    compressor.connect(ctx.destination);
  }
  return drumBus;
}

function getDrumNoise(ctx: AudioContext): AudioBuffer {
  if (!drumNoiseBuffer) {
    const length = Math.ceil(ctx.sampleRate);
    drumNoiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = drumNoiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  }
  return drumNoiseBuffer;
}

interface NoiseOptions {
  filter: BiquadFilterType;
  frequency: number;
  q?: number;
  gain: number;
  attack?: number;
}

function triggerNoise(
  ctx: AudioContext,
  destination: AudioNode,
  time: number,
  duration: number,
  options: NoiseOptions
): void {
  const source = ctx.createBufferSource();
  source.buffer = getDrumNoise(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = options.filter;
  filter.frequency.setValueAtTime(options.frequency, time);
  filter.Q.setValueAtTime(options.q ?? 1, time);
  const gain = ctx.createGain();
  const attack = options.attack ?? 0.002;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(options.gain, time + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start(time);
  source.stop(time + duration + 0.02);
}

function triggerKick(ctx: AudioContext, destination: AudioNode, time: number, velocity: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(145, time);
  osc.frequency.exponentialRampToValueAtTime(46, time + 0.12);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(0.95 * velocity, time + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.32);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(time);
  osc.stop(time + 0.34);
}

function triggerSnare(ctx: AudioContext, destination: AudioNode, time: number, velocity: number): void {
  triggerNoise(ctx, destination, time, 0.17, {
    filter: 'highpass',
    frequency: 1300,
    gain: 0.42 * velocity,
  });
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(195, time);
  osc.frequency.exponentialRampToValueAtTime(150, time + 0.08);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(0.16 * velocity, time + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(time);
  osc.stop(time + 0.14);
}

function triggerHat(
  ctx: AudioContext,
  destination: AudioNode,
  time: number,
  velocity: number,
  open: boolean
): void {
  triggerNoise(ctx, destination, time, open ? 0.28 : 0.045, {
    filter: 'highpass',
    frequency: 7600,
    gain: (open ? 0.15 : 0.12) * velocity,
  });
}

function triggerRide(ctx: AudioContext, destination: AudioNode, time: number, velocity: number): void {
  triggerNoise(ctx, destination, time, 0.5, {
    filter: 'bandpass',
    frequency: 7400,
    q: 0.7,
    gain: 0.1 * velocity,
  });
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(3350, time);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(0.045 * velocity, time + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(time);
  osc.stop(time + 0.22);
}

function triggerRim(ctx: AudioContext, destination: AudioNode, time: number, velocity: number): void {
  triggerNoise(ctx, destination, time, 0.035, {
    filter: 'bandpass',
    frequency: 2700,
    q: 2,
    gain: 0.22 * velocity,
  });
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(950, time);
  osc.frequency.exponentialRampToValueAtTime(720, time + 0.05);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(0.13 * velocity, time + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.07);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(time);
  osc.stop(time + 0.08);
}

function triggerShaker(ctx: AudioContext, destination: AudioNode, time: number, velocity: number): void {
  triggerNoise(ctx, destination, time, 0.09, {
    filter: 'highpass',
    frequency: 5600,
    gain: 0.15 * velocity,
    attack: 0.004,
  });
}

function triggerBrush(ctx: AudioContext, destination: AudioNode, time: number, velocity: number): void {
  triggerNoise(ctx, destination, time, 0.3, {
    filter: 'bandpass',
    frequency: 3200,
    q: 0.6,
    gain: 0.11 * velocity,
    attack: 0.025,
  });
}

/**
 * Plays one synthesized drum hit. `when` is an offset in seconds from now
 * (used to place swung off-beats).
 */
export function playDrumHit(
  voice: DrumVoice,
  options: { velocity?: number; when?: number } = {}
): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const destination = getDrumBus(ctx);
  const time = ctx.currentTime + Math.max(0, options.when ?? 0) + 0.005;
  const velocity = Math.max(0, Math.min(1, options.velocity ?? 0.8));

  switch (voice) {
    case 'kick':
      triggerKick(ctx, destination, time, velocity);
      break;
    case 'snare':
      triggerSnare(ctx, destination, time, velocity);
      break;
    case 'hatClosed':
      triggerHat(ctx, destination, time, velocity, false);
      break;
    case 'hatOpen':
      triggerHat(ctx, destination, time, velocity, true);
      break;
    case 'ride':
      triggerRide(ctx, destination, time, velocity);
      break;
    case 'rim':
      triggerRim(ctx, destination, time, velocity);
      break;
    case 'shaker':
      triggerShaker(ctx, destination, time, velocity);
      break;
    case 'brush':
      triggerBrush(ctx, destination, time, velocity);
      break;
  }
}
