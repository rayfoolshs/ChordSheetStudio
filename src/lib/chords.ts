import type {
  BarCellParsed,
  BarreInfo,
  FretShape,
  GuitarVoicing,
  HandSide,
  NoteSpelling,
  ParsedChord,
  PianoNote,
  PianoVoicing,
  QualityDef,
  RootInfo,
  UkuleleVoicing,
} from '../types';

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const NOTE_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Standard Guitar tuning (low E to high e): E2, A2, D3, G3, B3, E4
export const GUITAR_OPEN_MIDI = [40, 45, 50, 55, 59, 64];
const STRING_OPEN_PC = [4, 9, 2, 7, 11, 4];

// Standard Ukulele re-entrant tuning: G4, C4, E4, A4
export const UKULELE_OPEN_MIDI = [67, 60, 64, 69];
const UKE_OPEN_PC = [7, 0, 4, 9];

const E_ROOT_FRET: Record<number, number> = {
  0: 8, 1: 9, 2: 10, 3: 11, 4: 0, 5: 1,
  6: 2, 7: 3, 8: 4, 9: 5, 10: 6, 11: 7,
};

const A_ROOT_FRET: Record<number, number> = {
  0: 3, 1: 4, 2: 5, 3: 6, 4: 7, 5: 8,
  6: 9, 7: 10, 8: 11, 9: 0, 10: 1, 11: 2,
};

const D_ROOT_FRET: Record<number, number> = {
  0: 10, 1: 11, 2: 0, 3: 1, 4: 2, 5: 3,
  6: 4, 7: 5, 8: 6, 9: 7, 10: 8, 11: 9,
};

export const QUALITY_DEFS: Record<string, QualityDef> = {
  major: {
    suffix: '',
    intervals: [0, 4, 7],
    degrees: [0, 2, 4],
    eShape: [0, 2, 2, 1, 0, 0],
    aShape: [null, 0, 2, 2, 2, 0],
    ukeShape: [2, 0, 0, 3],
  },
  minor: {
    suffix: 'm',
    intervals: [0, 3, 7],
    degrees: [0, 2, 4],
    eShape: [0, 2, 2, 0, 0, 0],
    aShape: [null, 0, 2, 2, 1, 0],
    ukeShape: [2, 0, 0, 0],
  },
  seven: {
    suffix: '7',
    intervals: [0, 4, 7, 10],
    degrees: [0, 2, 4, 6],
    eShape: [0, 2, 0, 1, 0, 0],
    aShape: [null, 0, 2, 0, 2, 0],
    ukeShape: [2, 3, 1, 3],
  },
  maj7: {
    suffix: 'maj7',
    intervals: [0, 4, 7, 11],
    degrees: [0, 2, 4, 6],
    eShape: [0, 2, 1, 1, 0, 0],
    aShape: [null, 0, 2, 1, 2, 0],
    ukeShape: [2, 4, 1, 3],
  },
  m7: {
    suffix: 'm7',
    intervals: [0, 3, 7, 10],
    degrees: [0, 2, 4, 6],
    eShape: [0, 2, 0, 0, 0, 0],
    aShape: [null, 0, 2, 0, 1, 0],
    ukeShape: [2, 3, 3, 3],
  },
  m7b5: {
    suffix: 'm7b5',
    intervals: [0, 3, 6, 10],
    degrees: [0, 2, 4, 6],
    preferA: true,
    eShape: [0, null, 0, 0, null, null],
    aShape: [null, 0, 1, 0, 1, null],
  },
  mmaj7: {
    suffix: 'm(maj7)',
    intervals: [0, 3, 7, 11],
    degrees: [0, 2, 4, 6],
    eShape: [0, 2, 1, 0, 0, 0],
    aShape: [null, 0, 2, 1, 1, 0],
  },
  m9: {
    suffix: 'm9',
    intervals: [0, 3, 7, 10, 14],
    degrees: [0, 2, 4, 6, 8],
    eShape: [0, 2, 0, 0, 0, 2],
  },
  maj9: {
    suffix: 'maj9',
    intervals: [0, 4, 7, 11, 14],
    degrees: [0, 2, 4, 6, 8],
    eShape: [0, 2, 1, 1, 0, 2],
  },
  nine: {
    suffix: '9',
    intervals: [0, 4, 7, 10, 14],
    degrees: [0, 2, 4, 6, 8],
    eShape: [0, 2, 0, 1, 0, 2],
  },
  six: {
    suffix: '6',
    intervals: [0, 4, 7, 9],
    degrees: [0, 2, 4, 5],
    eShape: [0, 2, 2, 1, 2, 0],
    aShape: [null, 0, 2, 2, 2, 2],
  },
  m6: {
    suffix: 'm6',
    intervals: [0, 3, 7, 9],
    degrees: [0, 2, 4, 5],
    eShape: [0, 2, 2, 0, 2, 0],
    aShape: [null, 0, 2, 2, 1, 2],
  },
  sixnine: {
    suffix: '6/9',
    intervals: [0, 4, 7, 9, 14],
    degrees: [0, 2, 4, 5, 8],
    aShape: [null, 0, 2, 2, 2, 2],
  },
  add9: {
    suffix: 'add9',
    intervals: [0, 4, 7, 14],
    degrees: [0, 2, 4, 8],
    eShape: [0, 2, 2, 1, 0, 2],
    aShape: [null, 0, 2, 4, 2, 0],
  },
  madd9: {
    suffix: 'madd9',
    intervals: [0, 3, 7, 14],
    degrees: [0, 2, 4, 8],
    eShape: [0, 2, 2, 0, 0, 2],
  },
  sus2: {
    suffix: 'sus2',
    intervals: [0, 2, 7],
    degrees: [0, 1, 4],
    eShape: [0, 2, 4, 4, 0, 0],
    aShape: [null, 0, 2, 2, 0, 0],
  },
  sus4: {
    suffix: 'sus4',
    intervals: [0, 5, 7],
    degrees: [0, 3, 4],
    eShape: [0, 2, 2, 2, 0, 0],
    aShape: [null, 0, 2, 2, 3, 0],
  },
  sevsus4: {
    suffix: '7sus4',
    intervals: [0, 5, 7, 10],
    degrees: [0, 3, 4, 6],
    eShape: [0, 2, 0, 2, 0, 0],
    aShape: [null, 0, 2, 0, 3, 0],
  },
  dim: {
    suffix: 'dim',
    intervals: [0, 3, 6],
    degrees: [0, 2, 4],
    preferA: true,
    eShape: [0, 1, 2, 0, null, 0],
    aShape: [null, 0, 1, 2, 1, null],
  },
  dim7: {
    suffix: 'dim7',
    intervals: [0, 3, 6, 9],
    degrees: [0, 2, 4, 6],
    eShape: [0, 1, 2, 0, 2, 0],
  },
  aug: {
    suffix: 'aug',
    intervals: [0, 4, 8],
    degrees: [0, 2, 4],
    eShape: [0, 3, 2, 1, 1, 0],
  },
  five: {
    suffix: '5',
    intervals: [0, 7],
    degrees: [0, 4],
    eShape: [0, 2, 2, null, null, null],
    aShape: [null, 0, 2, 2, null, null],
  },
};

function makeShape(frets: number[], fingers: number[], barre?: BarreInfo | null): FretShape {
  return {
    frets,
    fingers,
    barre: barre || null,
    baseFret: 1,
  };
}

export const OPEN_SHAPES: Record<string, FretShape> = {
  C: makeShape([-1, 3, 2, 0, 1, 0], [0, 3, 2, 0, 1, 0]),
  G: makeShape([3, 2, 0, 0, 0, 3], [2, 1, 0, 0, 0, 3]),
  D: makeShape([-1, -1, 0, 2, 3, 2], [0, 0, 0, 1, 3, 2]),
  A: makeShape([-1, 0, 2, 2, 2, 0], [0, 0, 1, 2, 3, 0]),
  E: makeShape([0, 2, 2, 1, 0, 0], [0, 2, 3, 1, 0, 0]),
  F: makeShape([-1, -1, 3, 2, 1, 1], [0, 0, 3, 2, 1, 1], { fret: 1, from: 4, to: 5, finger: 1 }),
  Am: makeShape([-1, 0, 2, 2, 1, 0], [0, 0, 2, 3, 1, 0]),
  Em: makeShape([0, 2, 2, 0, 0, 0], [0, 2, 3, 0, 0, 0]),
  Dm: makeShape([-1, -1, 0, 2, 3, 1], [0, 0, 0, 2, 3, 1]),
  C7: makeShape([-1, 3, 2, 3, 1, 0], [0, 3, 2, 4, 1, 0]),
  G7: makeShape([3, 2, 0, 0, 0, 1], [3, 2, 0, 0, 0, 1]),
  D7: makeShape([-1, -1, 0, 2, 1, 2], [0, 0, 0, 2, 1, 3]),
  A7: makeShape([-1, 0, 2, 0, 2, 0], [0, 0, 2, 0, 3, 0]),
  E7: makeShape([0, 2, 0, 1, 0, 0], [0, 2, 0, 1, 0, 0]),
  B7: makeShape([-1, 2, 1, 2, 0, 2], [0, 2, 1, 3, 0, 4]),
  Cmaj7: makeShape([-1, 3, 2, 0, 0, 0], [0, 3, 2, 0, 0, 0]),
  Fmaj7: makeShape([-1, -1, 3, 2, 1, 0], [0, 0, 3, 2, 1, 0]),
  Gmaj7: makeShape([3, 2, 0, 0, 0, 2], [3, 2, 0, 0, 0, 1]),
  Dmaj7: makeShape([-1, -1, 0, 2, 2, 2], [0, 0, 0, 1, 1, 1], { fret: 2, from: 3, to: 5, finger: 1 }),
  Amaj7: makeShape([-1, 0, 2, 1, 2, 0], [0, 0, 2, 1, 3, 0]),
  Emaj7: makeShape([0, 2, 1, 1, 0, 0], [0, 3, 1, 2, 0, 0]),
  Am7: makeShape([-1, 0, 2, 0, 1, 0], [0, 0, 2, 0, 1, 0]),
  Em7: makeShape([0, 2, 0, 0, 0, 0], [0, 2, 0, 0, 0, 0]),
  Dm7: makeShape([-1, -1, 0, 2, 1, 1], [0, 0, 0, 2, 1, 1], { fret: 1, from: 4, to: 5, finger: 1 }),
  Bm7: makeShape([-1, 2, 0, 2, 0, 2], [0, 1, 0, 2, 0, 3]),
  Dsus2: makeShape([-1, -1, 0, 2, 3, 0], [0, 0, 0, 1, 3, 0]),
  Dsus4: makeShape([-1, -1, 0, 2, 3, 3], [0, 0, 0, 1, 2, 3]),
  Asus2: makeShape([-1, 0, 2, 2, 0, 0], [0, 0, 1, 2, 0, 0]),
  Asus4: makeShape([-1, 0, 2, 2, 3, 0], [0, 0, 1, 2, 3, 0]),
  Esus4: makeShape([0, 2, 2, 2, 0, 0], [0, 2, 3, 4, 0, 0]),
  A7sus4: makeShape([-1, 0, 2, 0, 3, 0], [0, 0, 1, 0, 3, 0]),
  D7sus4: makeShape([-1, -1, 0, 2, 1, 3], [0, 0, 0, 2, 1, 4]),
  E7sus4: makeShape([0, 2, 0, 2, 0, 0], [0, 2, 0, 3, 0, 0]),
  Cadd9: makeShape([-1, 3, 2, 0, 3, 0], [0, 3, 2, 0, 4, 0]),
  Gadd9: makeShape([3, 2, 0, 2, 0, 3], [3, 2, 0, 1, 0, 4]),
  // Common slash chords
  'G/B': makeShape([-1, 2, 0, 0, 3, 3], [0, 1, 0, 0, 3, 4]),
  'D/F#': makeShape([2, -1, 0, 2, 3, 2], [1, 0, 0, 2, 4, 3]),
  'C/G': makeShape([3, 3, 2, 0, 1, 0], [3, 4, 2, 0, 1, 0]),
  'C/E': makeShape([0, 3, 2, 0, 1, 0], [0, 3, 2, 0, 1, 0]),
  'Am/G': makeShape([3, 0, 2, 2, 1, 0], [3, 0, 2, 2, 1, 0]),
  'Am/E': makeShape([0, 0, 2, 2, 1, 0], [0, 0, 2, 3, 1, 0]),
  'F/C': makeShape([-1, 3, 3, 2, 1, 1], [0, 3, 4, 2, 1, 1], { fret: 1, from: 4, to: 5, finger: 1 }),
  'Em/B': makeShape([-1, 2, 2, 0, 0, 0], [0, 2, 3, 0, 0, 0]),
};

export const UKE_OPEN_SHAPES: Record<string, FretShape> = {
  C: makeShape([0, 0, 0, 3], [0, 0, 0, 3]),
  G: makeShape([0, 2, 3, 2], [0, 1, 3, 2]),
  D: makeShape([2, 2, 2, 0], [1, 2, 3, 0]),
  A: makeShape([2, 1, 0, 0], [2, 1, 0, 0]),
  E: makeShape([4, 4, 4, 2], [2, 3, 4, 1]),
  F: makeShape([2, 0, 1, 0], [2, 0, 1, 0]),
  Bb: makeShape([3, 2, 1, 1], [3, 2, 1, 1], { fret: 1, from: 2, to: 3, finger: 1 }),
  Am: makeShape([2, 0, 0, 0], [2, 0, 0, 0]),
  Em: makeShape([0, 4, 3, 2], [0, 3, 2, 1]),
  Dm: makeShape([2, 2, 1, 0], [2, 3, 1, 0]),
  Bm: makeShape([4, 2, 2, 2], [3, 1, 1, 1], { fret: 2, from: 1, to: 3, finger: 1 }),
  'F#m': makeShape([2, 1, 2, 0], [2, 1, 3, 0]),
  Gm: makeShape([0, 2, 3, 1], [0, 2, 3, 1]),
  C7: makeShape([0, 0, 0, 1], [0, 0, 0, 1]),
  G7: makeShape([0, 2, 1, 2], [0, 2, 1, 3]),
  D7: makeShape([2, 2, 2, 3], [1, 1, 1, 2], { fret: 2, from: 0, to: 2, finger: 1 }),
  A7: makeShape([0, 1, 0, 0], [0, 1, 0, 0]),
  E7: makeShape([1, 2, 0, 2], [1, 2, 0, 3]),
  B7: makeShape([2, 3, 2, 2], [1, 2, 1, 1], { fret: 2, from: 0, to: 3, finger: 1 }),
  Am7: makeShape([0, 0, 0, 0], [0, 0, 0, 0]),
  Dm7: makeShape([2, 2, 1, 3], [2, 3, 1, 4]),
  Em7: makeShape([0, 2, 0, 2], [0, 1, 0, 2]),
  Cmaj7: makeShape([0, 0, 0, 2], [0, 0, 0, 2]),
  Fmaj7: makeShape([2, 4, 1, 3], [2, 4, 1, 3]),
  Gmaj7: makeShape([0, 2, 2, 2], [0, 1, 2, 3]),
  Csus4: makeShape([0, 0, 1, 3], [0, 0, 1, 3]),
  Dsus4: makeShape([2, 2, 3, 0], [1, 2, 3, 0]),
  Gsus4: makeShape([0, 2, 3, 3], [0, 1, 2, 3]),
  Cadd9: makeShape([0, 2, 0, 3], [0, 1, 0, 3]),
};

const QUALITY_RULES: [RegExp, string][] = [
  [/^(m7b5|min7b5|m7-5|ø7|ø)$/, 'm7b5'],
  [/^(m\(maj7\)|mmaj7|minmaj7|mΔ7|mΔ)$/, 'mmaj7'],
  [/^(6\/9|69)$/, 'sixnine'],
  [/^(7sus4|7sus)$/, 'sevsus4'],
  [/^(maj9|M9|Δ9)$/, 'maj9'],
  [/^(maj7|M7|Δ7|Δ)$/, 'maj7'],
  [/^(maj|M)$/, 'major'],
  [/^(m9|min9|-9)$/, 'm9'],
  [/^(m7|min7|-7)$/, 'm7'],
  [/^(m6|min6|-6)$/, 'm6'],
  [/^(madd9|minadd9|-add9)$/, 'madd9'],
  [/^(m|min|-)$/, 'minor'],
  [/^add9$/, 'add9'],
  [/^sus2$/, 'sus2'],
  [/^(sus4|sus)$/, 'sus4'],
  [/^dim7$/, 'dim7'],
  [/^(dim|°|o)$/, 'dim'],
  [/^(aug|\+)$/, 'aug'],
  [/^6$/, 'six'],
  [/^7$/, 'seven'],
  [/^9$/, 'nine'],
  [/^5$/, 'five'],
  [/^$/, 'major'],
];

export function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

/**
 * Strict root parsing: if fullMatch is true, rejects trailing junk like "Gfoo" in "C/Gfoo".
 */
function parseRoot(text: string, fullMatch = false): RootInfo | null {
  const regex = fullMatch ? /^([A-Ga-g])([#b♯♭]?)$/ : /^([A-Ga-g])([#b♯♭]?)/;
  const match = regex.exec((text || '').trim());
  if (!match) return null;
  const letter = match[1].toUpperCase();
  let accidental = match[2] || '';
  if (accidental === '♯') accidental = '#';
  if (accidental === '♭') accidental = 'b';
  const pc = mod12(NOTE_PC[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0));
  return {
    letter,
    accidental,
    ascii: letter + accidental,
    pretty: letter + accidental,
    pc,
  };
}

function identifyQuality(raw: string): string | null {
  const value = (raw || '').trim();
  for (let i = 0; i < QUALITY_RULES.length; i += 1) {
    if (QUALITY_RULES[i][0].test(value)) {
      return QUALITY_RULES[i][1];
    }
  }
  return null;
}

export function isNoChord(input: string): boolean {
  const value = (input || '').trim();
  if (!value) return false;
  const simplified = value.replace(/[\s.]/g, '').toLowerCase();
  return simplified === 'nc' || simplified === 'nochord';
}

export function isRepeatSymbol(input: string): boolean {
  const value = (input || '').trim();
  return value === '%' || value === '𝄎';
}

function spellChord(root: RootInfo, quality: QualityDef): NoteSpelling[] {
  return quality.intervals.map((interval, index) => {
    const degree = quality.degrees[index];
    const letterIndex = (LETTERS.indexOf(root.letter) + degree) % 7;
    const letter = LETTERS[letterIndex];
    const naturalPc = LETTER_PC[letterIndex];
    const targetPc = mod12(root.pc + interval);
    let difference = mod12(targetPc - naturalPc);
    if (difference > 6) difference -= 12;
    const accidental =
      difference > 0 ? '#'.repeat(difference) : 'b'.repeat(Math.abs(difference));
    return {
      letter,
      accidental,
      name: letter + accidental,
      pretty: letter + accidental,
      interval,
      pc: targetPc,
    };
  });
}

export function parseChord(input: string): ParsedChord | null {
  const source = (input || '').trim();
  if (!source) return null;
  const rootMatch = parseRoot(source, false);
  if (!rootMatch) return null;

  let rest = source.slice(rootMatch.ascii.length).replace(/♯/g, '#').replace(/♭/g, 'b');
  let bass: RootInfo | null = null;

  // Handle "6/9" so the slash inside "6/9" isn't mistaken for a bass note
  const sixNinePrefix = /^6\/9/.test(rest);
  const slashSearchStart = sixNinePrefix ? 3 : 0;
  const slash = rest.indexOf('/', slashSearchStart);
  if (slash !== -1) {
    const bassSource = rest.slice(slash + 1).trim();
    rest = rest.slice(0, slash);
    bass = parseRoot(bassSource, true);
    if (!bass) return null;
  }

  const qualityKey = identifyQuality(rest);
  if (!qualityKey) return null;
  const quality = QUALITY_DEFS[qualityKey];
  const display = rootMatch.pretty + quality.suffix + (bass ? '/' + bass.pretty : '');
  const ascii = rootMatch.ascii + quality.suffix + (bass ? '/' + bass.ascii : '');
  const bassPc = bass ? bass.pc : null;

  return {
    input: source,
    root: rootMatch,
    rootPc: rootMatch.pc,
    qualityKey,
    quality,
    bass,
    bassPc,
    ascii,
    label: display,
    notes: spellChord(rootMatch, quality),
    identity: `${rootMatch.pc}|${qualityKey}|${bassPc === null ? '' : bassPc}`,
  };
}

/**
 * Parses a progression slot cell. Supports empty, NC, % (repeat bar),
 * single chord, or split bars separated by "|" or spaces (e.g. "G | D" or "C G").
 */
export function parseBarCell(raw: string): BarCellParsed {
  const trimmed = (raw || '').trim();
  if (!trimmed) return { kind: 'empty', raw: '', chords: [], tokens: [] };
  if (isNoChord(trimmed)) return { kind: 'nc', raw: 'NC', chords: [], tokens: ['NC'] };
  if (isRepeatSymbol(trimmed)) return { kind: 'repeat', raw: '%', chords: [], tokens: ['%'] };

  // Check if single chord first
  const single = parseChord(trimmed);
  if (single) {
    return { kind: 'chords', raw: single.ascii, chords: [single], tokens: [single.ascii] };
  }

  // Split bar e.g. "G | D" or "G  D" or "C, G"
  const parts = trimmed
    .split(/\s*\|\s*|\s+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length > 1 && parts.length <= 4) {
    const parsed: ParsedChord[] = [];
    for (const part of parts) {
      const c = parseChord(part);
      if (!c) {
        return { kind: 'invalid', raw: trimmed, chords: [], tokens: [] };
      }
      parsed.push(c);
    }
    return {
      kind: 'chords',
      raw: parsed.map((c) => c.ascii).join(' | '),
      chords: parsed,
      tokens: parsed.map((c) => c.ascii),
    };
  }

  return { kind: 'invalid', raw: trimmed, chords: [], tokens: [] };
}

export function transposeRoot(pc: number, semitones: number, preferFlat = false): string {
  const target = mod12(pc + semitones);
  return preferFlat ? FLAT_NAMES[target] : SHARP_NAMES[target];
}

export function shouldPreferFlatsForTranspose(sourceChord: ParsedChord, semitones: number): boolean {
  const targetPc = mod12(sourceChord.rootPc + semitones);
  const flatKeyPcs = [1, 3, 5, 8, 10]; // Db, Eb, F, Ab, Bb
  if (sourceChord.root.accidental === 'b') {
    return flatKeyPcs.includes(targetPc) || targetPc === 6;
  }
  return flatKeyPcs.includes(targetPc);
}

export function transposeChord(chord: ParsedChord, semitones: number, preferFlat?: boolean): ParsedChord {
  if (mod12(semitones) === 0) return chord;
  const useFlat = preferFlat ?? shouldPreferFlatsForTranspose(chord, semitones);
  const newRoot = transposeRoot(chord.rootPc, semitones, useFlat);
  const newBass = chord.bassPc !== null ? '/' + transposeRoot(chord.bassPc, semitones, useFlat) : '';
  return parseChord(newRoot + chord.quality.suffix + newBass) || chord;
}

export function transposeCellText(raw: string, semitones: number, preferFlat?: boolean): string {
  const parsed = parseBarCell(raw);
  if (parsed.kind === 'empty' || parsed.kind === 'nc' || parsed.kind === 'repeat' || parsed.kind === 'invalid') {
    return raw;
  }
  return parsed.chords.map((c) => transposeChord(c, semitones, preferFlat).ascii).join(' | ');
}

export function enharmonicLabel(note: NoteSpelling): string {
  const sharp = SHARP_NAMES[note.pc];
  const flat = FLAT_NAMES[note.pc];
  if (sharp === flat) {
    return note.name === sharp ? note.name : `${note.name}/${sharp}`;
  }
  if (note.name === flat) return `${flat}/${sharp}`;
  return `${sharp}/${flat}`;
}

const MAX_VOICING_FRET = 15;
const FOUR_STRING_STRINGS = [2, 3, 4, 5];
const MAX_FOUR_STRING_SPAN = 4;
const THREE_STRING_GROUPS = [
  { name: 'DGB', strings: [2, 3, 4] },
  { name: 'GBE', strings: [3, 4, 5] },
];
const MAX_THREE_STRING_SPAN = 4;
const INVERSION_NAMES = ['root', '1st inv', '2nd inv', '3rd inv', '4th inv'];

function shapeSignature(shape: FretShape): string {
  return shape.frets.join(',') + '|' + (shape.baseFret || 1);
}

function voicingCore(quality: QualityDef): number[] {
  const intervals = quality.intervals;
  const hasThird = intervals.includes(3) || intervals.includes(4);
  if (!hasThird) return intervals;
  return intervals.filter((i) => i !== 7);
}

function buildMovable(template: (number | null)[], fret: number): FretShape {
  const frets = template.map((offset) => (offset === null ? -1 : offset + fret));
  const fingers = [0, 0, 0, 0, 0, 0];
  let barre: BarreInfo | null = null;

  if (fret > 0) {
    const atRoot: number[] = [];
    frets.forEach((value, stringIndex) => {
      if (value === fret) atRoot.push(stringIndex);
    });
    if (atRoot.length > 1) {
      barre = {
        fret,
        from: Math.min(...atRoot),
        to: Math.max(...atRoot),
        finger: 1,
      };
      for (let s = barre.from; s <= barre.to; s += 1) {
        if (frets[s] === fret) fingers[s] = 1;
      }
    }
  }

  const remaining: { stringIndex: number; fret: number }[] = [];
  frets.forEach((value, stringIndex) => {
    if (value <= 0 || fingers[stringIndex]) return;
    remaining.push({ stringIndex, fret: value });
  });
  remaining.sort((a, b) => a.fret - b.fret || a.stringIndex - b.stringIndex);

  let nextFinger = barre ? 2 : 1;
  remaining.forEach((note) => {
    fingers[note.stringIndex] = Math.min(4, nextFinger);
    nextFinger += 1;
  });

  const positive = frets.filter((v) => v > 0);
  const lowest = positive.length ? Math.min(...positive) : 1;
  return {
    frets,
    fingers,
    barre,
    baseFret: fret > 0 ? fret : lowest > 4 ? lowest : 1,
  };
}

/**
 * Shared partial-shape builder for 3- and 4-string voicings.
 * Fixes the barre-finger bug: only applies a finger-1 barre when the repeated
 * fret is at the lowest fretted position, avoiding finger 1 above finger 2.
 */
function buildPartialShape(stringIndexes: number[], frets: number[], totalStrings = 6): FretShape {
  const allFrets = new Array(totalStrings).fill(-1);
  const fingers = new Array(totalStrings).fill(0);

  stringIndexes.forEach((stringIndex, position) => {
    allFrets[stringIndex] = frets[position];
  });

  const positiveFrets = frets.filter((f) => f > 0);
  const lowestFret = positiveFrets.length ? Math.min(...positiveFrets) : 1;

  const runs: { fret: number; from: number; to: number }[] = [];
  let position = 0;
  while (position < stringIndexes.length) {
    const fret = frets[position];
    if (fret <= 0) {
      position += 1;
      continue;
    }
    let end = position;
    while (end + 1 < frets.length && frets[end + 1] === fret) end += 1;
    if (end > position && fret === lowestFret) {
      runs.push({
        fret,
        from: stringIndexes[position],
        to: stringIndexes[end],
      });
    }
    position = end + 1;
  }

  runs.sort((a, b) => b.to - b.from - (a.to - a.from) || a.fret - b.fret);

  let barre: BarreInfo | null = null;
  if (runs.length) {
    barre = { fret: runs[0].fret, from: runs[0].from, to: runs[0].to, finger: 1 };
    for (let index = barre.from; index <= barre.to; index += 1) {
      if (allFrets[index] === barre.fret) fingers[index] = 1;
    }
  }

  const remaining: { stringIndex: number; fret: number }[] = [];
  stringIndexes.forEach((stringIndex) => {
    if (allFrets[stringIndex] <= 0 || fingers[stringIndex]) return;
    remaining.push({ stringIndex, fret: allFrets[stringIndex] });
  });
  remaining.sort((a, b) => a.fret - b.fret || a.stringIndex - b.stringIndex);

  let nextFinger = barre ? 2 : 1;
  remaining.forEach((note) => {
    fingers[note.stringIndex] = Math.min(4, nextFinger);
    nextFinger += 1;
  });

  const highestFret = positiveFrets.length ? Math.max(...positiveFrets) : 1;
  const baseFret = highestFret <= 4 ? 1 : lowestFret;
  return {
    frets: allFrets,
    fingers,
    barre,
    baseFret,
  };
}

function describeVoicing(shape: FretShape, family: string): string {
  const baseFret = shape.baseFret || 1;
  const familyName = family === 'Open' ? 'Open shape' : `${family} shape`;
  if (shape.barre) return `Barre · ${baseFret}fr · ${familyName}`;
  if (baseFret === 1) return 'Open shape';
  return `${baseFret}fr · ${familyName}`;
}

function getLowestSoundingPc(shape: FretShape): number | null {
  for (let s = 0; s < shape.frets.length; s += 1) {
    if (shape.frets[s] >= 0) {
      return mod12(STRING_OPEN_PC[s] + shape.frets[s]);
    }
  }
  return null;
}

function fourStringVoicings(chord: ParsedChord): GuitarVoicing[] {
  const chordPcs = chord.notes.map((n) => n.pc);
  const corePcs = voicingCore(chord.quality).map((i) => mod12(chord.rootPc + i));
  const rootFret = D_ROOT_FRET[chord.rootPc];
  const lowest = Math.max(0, rootFret - MAX_FOUR_STRING_SPAN);
  const highest = rootFret + MAX_FOUR_STRING_SPAN;
  const candidates: {
    frets: number[];
    hits: number;
    distinct: number;
    span: number;
    lowest: number;
  }[] = [];
  const seen = new Set<string>();

  for (let gFret = lowest; gFret <= highest; gFret += 1) {
    for (let bFret = lowest; bFret <= highest; bFret += 1) {
      for (let eFret = lowest; eFret <= highest; eFret += 1) {
        const frets = [rootFret, gFret, bFret, eFret];
        const pos = frets.filter((f) => f > 0);
        const span = pos.length ? Math.max(...pos) - Math.min(...pos) : 0;
        if (span > MAX_FOUR_STRING_SPAN) continue;

        const pcs = frets.map((fret, idx) => mod12(STRING_OPEN_PC[FOUR_STRING_STRINGS[idx]] + fret));
        if (!pcs.every((pc) => chordPcs.includes(pc))) continue;
        const sig = frets.join(',');
        if (seen.has(sig)) continue;
        seen.add(sig);

        const hits = new Set(pcs.filter((pc) => corePcs.includes(pc))).size;
        candidates.push({
          frets,
          hits,
          distinct: new Set(pcs).size,
          span,
          lowest: pos.length ? Math.min(...pos) : 0,
        });
      }
    }
  }

  candidates.sort(
    (a, b) =>
      b.hits - a.hits ||
      b.distinct - a.distinct ||
      a.span - b.span ||
      a.lowest - b.lowest
  );

  const usedPositions = new Set<number>();
  const chosen: typeof candidates = [];
  for (let i = 0; i < candidates.length && chosen.length < 2; i += 1) {
    if (usedPositions.has(candidates[i].lowest)) continue;
    usedPositions.add(candidates[i].lowest);
    chosen.push(candidates[i]);
  }

  return chosen.map((cand) => ({
    id: 'd' + cand.frets.join('-'),
    label: '4-string · ' + (cand.lowest > 0 ? cand.lowest + 'fr' : 'open'),
    shape: buildPartialShape([2, 3, 4, 5], cand.frets),
  }));
}

function threeStringVoicings(chord: ParsedChord): GuitarVoicing[] {
  const quality = chord.quality;
  const chordPcs = chord.notes.map((n) => n.pc);
  const corePcs = voicingCore(quality).map((i) => mod12(chord.rootPc + i));
  const requiredHits = corePcs.length <= 3 ? corePcs.length : corePcs.length - 1;
  const requiredNotes = Math.min(3, new Set(chordPcs).size);
  const voicings: GuitarVoicing[] = [];

  THREE_STRING_GROUPS.forEach((group) => {
    const bestForInversion = new Map<
      number,
      { frets: number[]; hits: number; highestInterval: number; span: number; lowest: number }
    >();

    for (let start = 0; start + MAX_THREE_STRING_SPAN <= MAX_VOICING_FRET; start += 1) {
      const options = group.strings.map((stringIndex) => {
        const frets: number[] = [];
        for (let fret = start; fret <= start + MAX_THREE_STRING_SPAN; fret += 1) {
          if (chordPcs.includes(mod12(STRING_OPEN_PC[stringIndex] + fret))) {
            frets.push(fret);
          }
        }
        return frets;
      });

      options[0].forEach((f1) => {
        options[1].forEach((f2) => {
          options[2].forEach((f3) => {
            const frets = [f1, f2, f3];
            const pcs = frets.map((fret, idx) => mod12(STRING_OPEN_PC[group.strings[idx]] + fret));
            if (new Set(pcs).size < requiredNotes) return;
            const hits = new Set(pcs.filter((pc) => corePcs.includes(pc))).size;
            if (hits < requiredHits) return;
            if (!pcs.includes(chord.rootPc)) return;

            const bassPc = pcs[0];
            const inversion = quality.intervals.findIndex(
              (interval) => mod12(chord.rootPc + interval) === bassPc
            );
            if (inversion < 0) return;

            const matchingIntervals = quality.intervals.filter((interval) =>
              pcs.includes(mod12(chord.rootPc + interval))
            );
            const highestInterval = matchingIntervals.length ? Math.max(...matchingIntervals) : 0;
            const pos = frets.filter((f) => f > 0);
            const span = pos.length ? Math.max(...pos) - Math.min(...pos) : 0;
            const lowest = pos.length ? Math.min(...pos) : 0;

            const cand = { frets, hits, highestInterval, span, lowest };
            const prev = bestForInversion.get(inversion);
            if (
              !prev ||
              cand.hits > prev.hits ||
              (cand.hits === prev.hits && cand.highestInterval < prev.highestInterval) ||
              (cand.hits === prev.hits &&
                cand.highestInterval === prev.highestInterval &&
                (cand.span < prev.span || (cand.span === prev.span && cand.lowest < prev.lowest)))
            ) {
              bestForInversion.set(inversion, cand);
            }
          });
        });
      });
    }

    Array.from(bestForInversion.keys())
      .sort((a, b) => a - b)
      .slice(0, 3)
      .forEach((inversion) => {
        const cand = bestForInversion.get(inversion)!;
        voicings.push({
          id: `t${group.name.toLowerCase()}-${inversion}-${cand.frets.join('-')}`,
          label: `3-string · ${group.name} · ${INVERSION_NAMES[inversion] || `${inversion}th inv`} · ${
            cand.lowest > 0 ? `${cand.lowest}fr` : 'open'
          }`,
          shape: buildPartialShape(group.strings, cand.frets),
        });
      });
  });

  return voicings;
}

/**
 * Generates guitar voicings that explicitly place chord.bassPc as the lowest sounding note
 * when a slash chord is requested (e.g. G/B, D/F#, F/A, Am/G, C/Bb).
 */
function slashBassVoicings(chord: ParsedChord): GuitarVoicing[] {
  if (chord.bassPc === null) return [];
  const bassPc = chord.bassPc;
  const chordPcs = new Set(chord.notes.map((n) => n.pc));
  chordPcs.add(bassPc);
  const corePcs = voicingCore(chord.quality).map((i) => mod12(chord.rootPc + i));

  // Search bass string (0=E, 1=A, 2=D) + upper strings
  const candidates: { strings: number[]; frets: number[]; span: number; lowest: number; hits: number }[] = [];

  for (const bassString of [0, 1, 2]) {
    const bassFret = mod12(bassPc - STRING_OPEN_PC[bassString]);
    const upperStrings = bassString === 0 ? [2, 3, 4, 5] : bassString === 1 ? [2, 3, 4, 5] : [3, 4, 5];
    const windowLow = Math.max(0, bassFret - 2);
    const windowHigh = Math.min(MAX_VOICING_FRET, bassFret + 3);

    const optPerUpper = upperStrings.map((s) => {
      const opts: number[] = [];
      for (let f = 0; f <= windowHigh; f += 1) {
        if (f > 0 && f < windowLow) continue;
        if (chordPcs.has(mod12(STRING_OPEN_PC[s] + f))) opts.push(f);
      }
      return opts;
    });

    if (upperStrings.length === 4) {
      for (const f1 of optPerUpper[0]) {
        for (const f2 of optPerUpper[1]) {
          for (const f3 of optPerUpper[2]) {
            for (const f4 of optPerUpper[3]) {
              const allStrings = [bassString, ...upperStrings];
              const frets = [bassFret, f1, f2, f3, f4];
              const pos = frets.filter((f) => f > 0);
              const span = pos.length ? Math.max(...pos) - Math.min(...pos) : 0;
              if (span > 4) continue;
              const pcs = frets.map((f, i) => mod12(STRING_OPEN_PC[allStrings[i]] + f));
              if (!pcs.includes(chord.rootPc)) continue;
              const hits = new Set(pcs.filter((pc) => corePcs.includes(pc))).size;
              if (hits < Math.min(2, corePcs.length)) continue;
              candidates.push({
                strings: allStrings,
                frets,
                span,
                lowest: pos.length ? Math.min(...pos) : 0,
                hits,
              });
            }
          }
        }
      }
    } else {
      for (const f1 of optPerUpper[0]) {
        for (const f2 of optPerUpper[1]) {
          for (const f3 of optPerUpper[2]) {
            const allStrings = [bassString, ...upperStrings];
            const frets = [bassFret, f1, f2, f3];
            const pos = frets.filter((f) => f > 0);
            const span = pos.length ? Math.max(...pos) - Math.min(...pos) : 0;
            if (span > 4) continue;
            const pcs = frets.map((f, i) => mod12(STRING_OPEN_PC[allStrings[i]] + f));
            if (!pcs.includes(chord.rootPc)) continue;
            const hits = new Set(pcs.filter((pc) => corePcs.includes(pc))).size;
            if (hits < Math.min(2, corePcs.length)) continue;
            candidates.push({
              strings: allStrings,
              frets,
              span,
              lowest: pos.length ? Math.min(...pos) : 0,
              hits,
            });
          }
        }
      }
    }
  }

  candidates.sort(
    (a, b) =>
      b.hits - a.hits ||
      a.span - b.span ||
      a.lowest - b.lowest
  );

  const results: GuitarVoicing[] = [];
  const seen = new Set<string>();
  for (const cand of candidates) {
    const shape = buildPartialShape(cand.strings, cand.frets);
    const sig = shapeSignature(shape);
    if (seen.has(sig)) continue;
    seen.add(sig);
    results.push({
      id: `slash-${cand.strings.join('')}-${cand.frets.join('-')}`,
      label: `Slash bass (${chord.bass?.pretty}) · ${cand.lowest > 0 ? `${cand.lowest}fr` : 'open'}`,
      shape,
    });
    if (results.length >= 3) break;
  }
  return results;
}

export function getGuitarShape(chord: ParsedChord | null): FretShape | null {
  if (!chord) return null;
  if (OPEN_SHAPES[chord.ascii]) {
    return OPEN_SHAPES[chord.ascii];
  }
  const baseKey = chord.root.ascii + chord.quality.suffix;
  if (chord.bassPc === null && OPEN_SHAPES[baseKey]) {
    return OPEN_SHAPES[baseKey];
  }
  if (chord.bassPc !== null) {
    const slash = slashBassVoicings(chord);
    if (slash.length) return slash[0].shape;
  }
  const quality = chord.quality;
  const choices: { template: (number | null)[]; fret: number; order: number }[] = [];
  if (quality.eShape) {
    choices.push({ template: quality.eShape, fret: E_ROOT_FRET[chord.rootPc], order: quality.preferA ? 1 : 0 });
  }
  if (quality.aShape) {
    choices.push({ template: quality.aShape, fret: A_ROOT_FRET[chord.rootPc], order: quality.preferA ? 0 : 1 });
  }
  if (!choices.length) return null;
  choices.sort((a, b) => {
    if (a.fret === 0 && b.fret !== 0) return -1;
    if (b.fret === 0 && a.fret !== 0) return 1;
    if (a.fret !== b.fret) return a.fret - b.fret;
    return a.order - b.order;
  });
  return buildMovable(choices[0].template, choices[0].fret);
}

export function getGuitarVoicings(chord: ParsedChord | null): GuitarVoicing[] {
  if (!chord) return [];
  const quality = chord.quality;
  const candidates: { id: string; label?: string; family?: string; shape: FretShape }[] = [];

  if (chord.bassPc !== null) {
    if (OPEN_SHAPES[chord.ascii]) {
      candidates.push({ id: 'open-slash', family: 'Open', label: `Open slash (${chord.label})`, shape: OPEN_SHAPES[chord.ascii] });
    }
    slashBassVoicings(chord).forEach((v) => {
      candidates.push({ id: v.id, label: v.label, shape: v.shape });
    });
  }

  const baseKey = chord.root.ascii + chord.quality.suffix;
  if (OPEN_SHAPES[baseKey]) {
    candidates.push({ id: 'open', family: 'Open', shape: OPEN_SHAPES[baseKey] });
  }

  [
    { family: 'E', template: quality.eShape, roots: E_ROOT_FRET },
    { family: 'A', template: quality.aShape, roots: A_ROOT_FRET },
  ].forEach((choice) => {
    if (!choice.template) return;
    const baseFret = choice.roots[chord.rootPc];
    const positions = [baseFret];
    if (baseFret + 12 <= MAX_VOICING_FRET) positions.push(baseFret + 12);
    positions.forEach((fret) => {
      candidates.push({
        id: choice.family.toLowerCase() + fret,
        family: choice.family,
        shape: buildMovable(choice.template!, fret),
      });
    });
  });

  fourStringVoicings(chord).forEach((v) => candidates.push(v));
  threeStringVoicings(chord).forEach((v) => candidates.push(v));

  const defaultShape = getGuitarShape(chord);
  const defaultKey = defaultShape ? shapeSignature(defaultShape) : null;
  const seen = new Set<string>();
  const voicings: GuitarVoicing[] = [];

  candidates.forEach((candidate) => {
    const key = shapeSignature(candidate.shape);
    if (seen.has(key)) return;
    seen.add(key);
    voicings.push({
      id: candidate.id,
      label: candidate.label || describeVoicing(candidate.shape, candidate.family || 'Barre'),
      shape: candidate.shape,
    });
  });

  // Put default shape first, or prioritize shapes matching slash bassPc
  if (chord.bassPc !== null) {
    voicings.sort((a, b) => {
      const aMatch = getLowestSoundingPc(a.shape) === chord.bassPc ? 0 : 1;
      const bMatch = getLowestSoundingPc(b.shape) === chord.bassPc ? 0 : 1;
      return aMatch - bMatch;
    });
  } else if (defaultKey) {
    const idx = voicings.findIndex((v) => shapeSignature(v.shape) === defaultKey);
    if (idx > 0) {
      voicings.unshift(voicings.splice(idx, 1)[0]);
    }
  }

  return voicings;
}

export function guitarShapeToMidi(shape: FretShape): number[] {
  const midi: number[] = [];
  shape.frets.forEach((fret, stringIndex) => {
    if (fret >= 0) {
      midi.push(GUITAR_OPEN_MIDI[stringIndex] + fret);
    }
  });
  return midi;
}

/**
 * Ukulele chord voicings (4 strings: G4-C4-E4-A4).
 */
export function getUkuleleVoicings(chord: ParsedChord | null): UkuleleVoicing[] {
  if (!chord) return [];
  const baseKey = chord.root.ascii + chord.quality.suffix;
  const voicings: UkuleleVoicing[] = [];
  const seen = new Set<string>();

  const pushVoicing = (id: string, label: string, shape: FretShape) => {
    const sig = shapeSignature(shape);
    if (seen.has(sig)) return;
    seen.add(sig);
    voicings.push({ id, label, shape });
  };

  if (UKE_OPEN_SHAPES[baseKey]) {
    pushVoicing('uke-open', 'Open shape', UKE_OPEN_SHAPES[baseKey]);
  }

  // Generate 4-string ukulele shapes across frets 0..10
  const chordPcs = chord.notes.map((n) => n.pc);
  const corePcs = voicingCore(chord.quality).map((i) => mod12(chord.rootPc + i));
  const candidates: { frets: number[]; hits: number; distinct: number; span: number; lowest: number }[] = [];

  for (let start = 0; start <= 8; start += 1) {
    const options = UKE_OPEN_PC.map((openPc) => {
      const valid: number[] = [];
      for (let f = start; f <= start + 4; f += 1) {
        if (chordPcs.includes(mod12(openPc + f))) valid.push(f);
      }
      if (start > 0 && chordPcs.includes(openPc)) valid.unshift(0);
      return valid;
    });

    for (const f0 of options[0]) {
      for (const f1 of options[1]) {
        for (const f2 of options[2]) {
          for (const f3 of options[3]) {
            const frets = [f0, f1, f2, f3];
            const pos = frets.filter((f) => f > 0);
            const span = pos.length ? Math.max(...pos) - Math.min(...pos) : 0;
            if (span > 4) continue;
            const pcs = frets.map((f, i) => mod12(UKE_OPEN_PC[i] + f));
            if (!pcs.includes(chord.rootPc)) continue;
            const required = Math.min(chordPcs.length, 3);
            const distinct = new Set(pcs).size;
            if (distinct < required) continue;
            const hits = new Set(pcs.filter((pc) => corePcs.includes(pc))).size;
            candidates.push({
              frets,
              hits,
              distinct,
              span,
              lowest: pos.length ? Math.min(...pos) : 0,
            });
          }
        }
      }
    }
  }

  candidates.sort(
    (a, b) =>
      b.hits - a.hits ||
      b.distinct - a.distinct ||
      a.span - b.span ||
      a.lowest - b.lowest
  );

  const usedPos = new Set<number>();
  for (const cand of candidates) {
    if (usedPos.has(cand.lowest)) continue;
    usedPos.add(cand.lowest);
    const shape = buildPartialShape([0, 1, 2, 3], cand.frets, 4);
    pushVoicing(
      `uke-${cand.frets.join('-')}`,
      cand.lowest === 0 ? 'Open voicing' : `${cand.lowest}fr voicing`,
      shape
    );
    if (voicings.length >= 4) break;
  }

  return voicings;
}

export function ukuleleShapeToMidi(shape: FretShape): number[] {
  const midi: number[] = [];
  shape.frets.forEach((fret, stringIndex) => {
    if (fret >= 0) {
      midi.push(UKULELE_OPEN_MIDI[stringIndex] + fret);
    }
  });
  return midi;
}

/**
 * Keyboard engine: 2 full octaves (C4=60 to B5=83) so root position never wraps upper tones below root!
 * Also supports inversions + explicit slash bass notes.
 */
const PIANO_LOW = 60; // C4
const PIANO_HIGH = 83; // B5
const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];

function fingerPattern(count: number): number[] {
  if (count <= 1) return [1];
  if (count === 2) return [1, 5];
  if (count === 3) return [1, 3, 5];
  if (count === 4) return [1, 2, 3, 5];
  return [1, 2, 3, 4, 5].slice(0, count);
}

function buildPianoVoicingFromMidi(
  id: string,
  label: string,
  rawNotes: { midi: number; pc: number; name: string }[],
  hand: HandSide
): PianoVoicing {
  const seen = new Set<number>();
  const deduped = rawNotes
    .filter((n) => {
      if (seen.has(n.midi)) return false;
      seen.add(n.midi);
      return true;
    })
    .sort((a, b) => a.midi - b.midi);

  const baseFingers = fingerPattern(deduped.length);
  const notes: PianoNote[] = deduped.map((note, index) => ({
    midi: note.midi,
    pc: note.pc,
    name: note.name,
    black: !WHITE_PCS.includes(note.pc),
    finger: hand === 'left' ? baseFingers[baseFingers.length - 1 - index] : baseFingers[index],
  }));

  return {
    id,
    label,
    notes,
    hand,
    noteText: notes.map((n) => n.name).join(' · '),
    fingerText: notes.map((n) => n.finger).join(' · '),
  };
}

export function getPianoVoicings(chord: ParsedChord | null, hand: HandSide): PianoVoicing[] {
  if (!chord) return [];
  const rootMidiBase = PIANO_LOW + chord.rootPc; // C4..B4 (60..71)

  // Root-position voicing stacked upwards from rootMidiBase
  const rootNotes = chord.notes.map((note) => {
    let midi = rootMidiBase + note.interval;
    while (midi > PIANO_HIGH) midi -= 12;
    return { midi, pc: note.pc, name: note.pretty };
  });

  const voicings: PianoVoicing[] = [];
  const rootVoicing = buildPianoVoicingFromMidi('root', 'Root position', rootNotes, hand);
  voicings.push(rootVoicing);

  // Generate inversions by raising the bottom notes an octave (kept inside C4..B5)
  const count = rootVoicing.notes.length;
  for (let inv = 1; inv < Math.min(count, 4); inv += 1) {
    const shifted = rootVoicing.notes.map((n, idx) => ({
      midi: idx < inv ? n.midi + 12 : n.midi,
      pc: n.pc,
      name: n.name,
    }));
    // Pull everything down an octave if the whole inversion fits lower
    const maxM = Math.max(...shifted.map((n) => n.midi));
    const minM = Math.min(...shifted.map((n) => n.midi));
    const normalized =
      minM >= PIANO_LOW + 12 && maxM - 12 <= PIANO_HIGH
        ? shifted.map((n) => ({ ...n, midi: n.midi - 12 }))
        : shifted;

    if (normalized.every((n) => n.midi >= PIANO_LOW && n.midi <= PIANO_HIGH)) {
      const invLabel = INVERSION_NAMES[inv] || `${inv}th inv`;
      voicings.push(buildPianoVoicingFromMidi(`inv-${inv}`, invLabel, normalized, hand));
    }
  }

  // If slash chord, prioritize inversion with bassPc on bottom or construct slash bass voicing
  if (chord.bassPc !== null && chord.bass) {
    const bassPc = chord.bassPc;
    const bassName = chord.bass.pretty;
    const matchingIdx = voicings.findIndex((v) => v.notes[0]?.pc === bassPc);
    if (matchingIdx >= 0) {
      const [matched] = voicings.splice(matchingIdx, 1);
      matched.label = `${matched.label} (${bassName} bass)`;
      voicings.unshift(matched);
    } else {
      // Bass note is outside the triad (e.g., C/Bb or D/F# or Am/G) -> place bass note lowest
      const bassMidi = PIANO_LOW + bassPc;
      const upper = rootVoicing.notes
        .filter((n) => n.pc !== bassPc)
        .map((n) => ({
          midi: n.midi <= bassMidi ? n.midi + 12 : n.midi,
          pc: n.pc,
          name: n.name,
        }))
        .filter((n) => n.midi <= PIANO_HIGH);
      const slashNotes = [{ midi: bassMidi, pc: bassPc, name: bassName }, ...upper];
      voicings.unshift(buildPianoVoicingFromMidi('slash-bass', `Slash (${bassName} bass)`, slashNotes, hand));
    }
  }

  return voicings;
}

export function getPianoVoicing(chord: ParsedChord | null, hand: HandSide): PianoVoicing | null {
  const list = getPianoVoicings(chord, hand);
  return list[0] || null;
}

export function inferKeyLabel(rows: { slots: string[] }[]): string {
  for (const row of rows) {
    for (const slot of row.slots) {
      const parsed = parseBarCell(slot);
      if (parsed.kind === 'chords' && parsed.chords.length) {
        const first = parsed.chords[0];
        const isMinor = first.qualityKey.startsWith('m') && !first.qualityKey.startsWith('maj');
        return first.root.pretty + (isMinor ? 'm' : '');
      }
    }
  }
  return 'C';
}

export const CHORD_SUGGESTIONS = [
  'NC', '%',
  'C', 'Cm', 'C7', 'Cmaj7', 'Cm7', 'Cadd9', 'Csus2', 'Csus4', 'C6', 'Cm6', 'Cdim', 'Caug', 'C/G',
  'D', 'Dm', 'D7', 'Dmaj7', 'Dm7', 'Dsus2', 'Dsus4', 'D/F#',
  'E', 'Em', 'E7', 'Emaj7', 'Em7', 'Esus4',
  'F', 'Fm', 'F7', 'Fmaj7', 'Fm7', 'F/A',
  'G', 'Gm', 'G7', 'Gmaj7', 'Gm7', 'Gadd9', 'Gsus4', 'G/B',
  'A', 'Am', 'A7', 'Amaj7', 'Am7', 'Asus2', 'Asus4', 'Am/G',
  'B', 'Bm', 'B7', 'Bmaj7', 'Bm7', 'Bm7b5',
  'Bb', 'Bbm', 'Bb7', 'Eb', 'Ebm', 'Ab', 'Abm', 'Db', 'Dbm',
  'F#', 'F#m', 'F#m7', 'C#', 'C#m', 'C#m7', 'G#m', 'Bbmaj7', 'Ebmaj7',
];
