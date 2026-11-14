import type { DrumVoice } from './audio';
import type { DrumPattern, TimeSignature } from '../types';

export interface DrumHit {
  step: number;
  voice: DrumVoice;
  velocity: number;
}

export interface DrumPatternSpec {
  stepsPerBar: number;
  hits: DrumHit[];
}

export const DRUM_PATTERN_OPTIONS: { value: DrumPattern; label: string }[] = [
  { value: 'none', label: 'Off' },
  { value: 'blues', label: 'Blues' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'bossa', label: 'Bossa Nova' },
  { value: 'rock', label: 'Rock' },
  { value: 'ballad', label: 'Ballad' },
];

/** Swing is only offered for the two shuffle-based feels. */
export function isSwingPattern(pattern: DrumPattern): boolean {
  return pattern === 'blues' || pattern === 'jazz';
}

export function getBeatsPerBar(timeSignature: TimeSignature): number {
  if (timeSignature === '3/4') return 3;
  if (timeSignature === '2/4') return 2;
  if (timeSignature === '6/8') return 6;
  return 4;
}

type HitSpec = [step: number, voice: DrumVoice, velocity: number];

function hats(count: number, velocity = 0.5): HitSpec[] {
  return Array.from({ length: count }, (_, step) => [
    step,
    'hatClosed',
    step % 2 === 0 ? velocity : velocity * 0.72,
  ] as HitSpec);
}

function shaker(count: number, velocity = 0.34): HitSpec[] {
  return Array.from({ length: count }, (_, step) => [
    step,
    'shaker',
    step % 2 === 0 ? velocity : velocity * 0.7,
  ] as HitSpec);
}

// 4/4 patterns on an eighth-note grid (8 steps per bar).
// 3/4 and 2/4 reuse the opening steps of the same pattern.
const SIMPLE_PATTERNS: Record<Exclude<DrumPattern, 'none'>, HitSpec[]> = {
  blues: [
    [0, 'kick', 0.95],
    [4, 'kick', 0.85],
    [2, 'snare', 0.82],
    [6, 'snare', 0.9],
    ...hats(8, 0.5),
  ],
  jazz: [
    [0, 'ride', 0.72],
    [3, 'ride', 0.5],
    [4, 'ride', 0.65],
    [7, 'ride', 0.55],
    [2, 'hatClosed', 0.3],
    [6, 'hatClosed', 0.32],
    [3, 'snare', 0.18],
    [6, 'snare', 0.26],
  ],
  bossa: [
    [0, 'kick', 0.92],
    [3, 'kick', 0.5],
    [4, 'kick', 0.72],
    [2, 'rim', 0.78],
    [6, 'rim', 0.78],
    ...shaker(8),
  ],
  rock: [
    [0, 'kick', 0.98],
    [4, 'kick', 0.9],
    [2, 'snare', 0.88],
    [6, 'snare', 0.94],
    ...hats(8, 0.58),
  ],
  ballad: [
    [0, 'kick', 0.72],
    [4, 'kick', 0.66],
    [2, 'snare', 0.55],
    [6, 'snare', 0.62],
    [0, 'ride', 0.34],
    [2, 'ride', 0.28],
    [4, 'ride', 0.34],
    [6, 'ride', 0.28],
    [0, 'brush', 0.2],
    [4, 'brush', 0.18],
  ],
};

// 6/8 patterns on a sixteenth-note grid (12 steps per bar, 2 steps per eighth).
const COMPOUND_PATTERNS: Record<Exclude<DrumPattern, 'none'>, HitSpec[]> = {
  blues: [
    [0, 'kick', 0.95],
    [6, 'kick', 0.82],
    [4, 'snare', 0.8],
    [10, 'snare', 0.88],
    ...hats(6, 0.5).map(([step, voice, velocity]) => [step * 2, voice, velocity] as HitSpec),
  ],
  jazz: [
    [0, 'ride', 0.7],
    [4, 'ride', 0.5],
    [6, 'ride', 0.64],
    [10, 'ride', 0.56],
    [4, 'hatClosed', 0.3],
    [10, 'hatClosed', 0.3],
    [10, 'snare', 0.22],
  ],
  bossa: [
    [0, 'kick', 0.92],
    [6, 'kick', 0.74],
    [4, 'rim', 0.76],
    [10, 'rim', 0.76],
    ...shaker(6).map(([step, voice, velocity]) => [step * 2, voice, velocity] as HitSpec),
  ],
  rock: [
    [0, 'kick', 0.98],
    [6, 'kick', 0.88],
    [4, 'snare', 0.86],
    [10, 'snare', 0.92],
    ...hats(6, 0.56).map(([step, voice, velocity]) => [step * 2, voice, velocity] as HitSpec),
  ],
  ballad: [
    [0, 'kick', 0.7],
    [6, 'kick', 0.64],
    [4, 'snare', 0.52],
    [10, 'snare', 0.58],
    [0, 'ride', 0.32],
    [4, 'ride', 0.26],
    [8, 'ride', 0.3],
    [0, 'brush', 0.18],
    [6, 'brush', 0.16],
  ],
};

export function getDrumPattern(pattern: DrumPattern, timeSignature: TimeSignature): DrumPatternSpec {
  const beatsPerBar = getBeatsPerBar(timeSignature);
  const stepsPerBar = beatsPerBar * 2;

  if (pattern === 'none') {
    return { stepsPerBar, hits: [] };
  }

  const source = timeSignature === '6/8' ? COMPOUND_PATTERNS[pattern] : SIMPLE_PATTERNS[pattern];
  const hits = source
    .filter(([step]) => step < stepsPerBar)
    .map(([step, voice, velocity]) => ({ step, voice, velocity }));

  return { stepsPerBar, hits };
}
