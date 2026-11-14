export type HandSide = 'right' | 'left';
export type TimeSignature = '4/4' | '3/4' | '6/8' | '2/4';

export interface NoteSpelling {
  letter: string;
  accidental: string;
  name: string;
  pretty: string;
  interval: number;
  pc: number;
}

export interface QualityDef {
  suffix: string;
  intervals: number[];
  degrees: number[];
  preferA?: boolean;
  eShape?: (number | null)[];
  aShape?: (number | null)[];
  ukeShape?: number[];
}

export interface RootInfo {
  letter: string;
  accidental: string;
  ascii: string;
  pretty: string;
  pc: number;
}

export interface ParsedChord {
  input: string;
  root: RootInfo;
  rootPc: number;
  qualityKey: string;
  quality: QualityDef;
  bass: RootInfo | null;
  bassPc: number | null;
  ascii: string;
  label: string;
  notes: NoteSpelling[];
  identity: string;
}

export interface BarreInfo {
  fret: number;
  from: number;
  to: number;
  finger: number;
}

export interface FretShape {
  frets: number[]; // -1 = muted, 0 = open, >0 = fret
  fingers: number[]; // 0 = open/muted, 1..4 = finger
  barre: BarreInfo | null;
  baseFret: number;
}

export interface GuitarVoicing {
  id: string;
  label: string;
  shape: FretShape;
}

export interface UkuleleVoicing {
  id: string;
  label: string;
  shape: FretShape;
}

export interface PianoNote {
  midi: number;
  pc: number;
  name: string;
  black: boolean;
  finger: number;
}

export interface PianoVoicing {
  id: string;
  label: string;
  notes: PianoNote[];
  hand: HandSide;
  noteText: string;
  fingerText: string;
}

export interface BarCellParsed {
  kind: 'empty' | 'nc' | 'repeat' | 'chords' | 'invalid';
  raw: string;
  chords: ParsedChord[];
  tokens: string[];
}

export interface ProgressionRow {
  id: string;
  label: string; // e.g. Intro, Verse, Chorus, Bridge
  slots: string[];
}

export interface SheetState {
  title: string;
  keyLabel: string;
  tempo: number;
  timeSignature: TimeSignature;
  gmInstrument: string;
  soundfontKit: 'FluidR3_GM' | 'MusyngKite';
  capo: number;
  showCapoShapes: boolean;
  columns: number;
  pianoHand: HandSide;
  guitarHand: HandSide;
  showGuitar: boolean;
  showKeyboard: boolean;
  showUkulele: boolean;
  showProgression: boolean;
  guitarVoicings: Record<string, string>;
  pianoVoicings: Record<string, string>;
  ukuleleVoicings: Record<string, string>;
  rows: ProgressionRow[];
}

export interface SavedChart {
  id: string;
  title: string;
  updatedAt: number;
  state: SheetState;
}
