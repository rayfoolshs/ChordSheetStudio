import type { ProgressionRow, SavedChart, SheetState, TimeSignature } from '../types';

export const MAX_COLUMNS = 8;
export const MAX_ROWS = 12;
const STORAGE_KEY_V2 = 'chord-sheet-studio:v2';
const STORAGE_KEY_V1 = 'chord-sheet-studio:v1';
const LIBRARY_KEY = 'chord-sheet-studio:library:v1';
const HASH_PREFIX = '#sheet=';

let rowCounter = 1;
export function nextRowId(): string {
  rowCounter += 1;
  return `row-${Date.now().toString(36)}-${rowCounter}`;
}

export function makeSlots(values: string[] = []): string[] {
  const slots = Array.isArray(values) ? values.slice(0, MAX_COLUMNS) : [];
  while (slots.length < MAX_COLUMNS) slots.push('');
  return slots.map((v) => (typeof v === 'string' ? v : ''));
}

export function makeRow(values: string[] = [], label = ''): ProgressionRow {
  return {
    id: nextRowId(),
    label,
    slots: makeSlots(values),
  };
}

export function createDefaultState(): SheetState {
  return {
    title: 'I Got A Feeling',
    keyLabel: 'G',
    tempo: 120,
    timeSignature: '4/4',
    gmInstrument: 'acoustic_grand_piano',
    soundfontKit: 'FluidR3_GM',
    capo: 0,
    showCapoShapes: false,
    columns: 4,
    pianoHand: 'right',
    guitarHand: 'right',
    showGuitar: true,
    showKeyboard: true,
    showUkulele: false,
    showProgression: true,
    guitarVoicings: {},
    pianoVoicings: {},
    ukuleleVoicings: {},
    rows: [
      makeRow(['G', 'G', 'C', 'C'], 'Verse'),
      makeRow(['Em', 'Em', 'C', 'C'], 'Chorus'),
    ],
  };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function sanitizeRecord(val: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!val || typeof val !== 'object') return out;
  Object.entries(val as Record<string, unknown>).forEach(([k, v]) => {
    if (typeof v === 'string' && v) out[k] = v;
  });
  return out;
}

function sanitizeTimeSignature(val: unknown): TimeSignature {
  if (val === '3/4' || val === '6/8' || val === '2/4') return val;
  return '4/4';
}

export function sanitizeSheetState(raw: unknown): SheetState {
  const def = createDefaultState();
  if (!raw || typeof raw !== 'object') return def;
  const s = raw as Record<string, unknown>;

  const columns = clamp(Number(s.columns) || 4, 1, MAX_COLUMNS);
  let rows: ProgressionRow[] = def.rows;

  if (Array.isArray(s.rows) && s.rows.length) {
    rows = s.rows.slice(0, MAX_ROWS).map((r) => {
      if (Array.isArray(r)) {
        return makeRow(r as string[], '');
      }
      if (r && typeof r === 'object') {
        const obj = r as { id?: unknown; label?: unknown; slots?: unknown };
        return {
          id: typeof obj.id === 'string' && obj.id ? obj.id : nextRowId(),
          label: typeof obj.label === 'string' ? obj.label.slice(0, 24) : '',
          slots: makeSlots(Array.isArray(obj.slots) ? (obj.slots as string[]) : []),
        };
      }
      return makeRow([]);
    });
  }

  return {
    title: typeof s.title === 'string' ? s.title : def.title,
    keyLabel: typeof s.keyLabel === 'string' ? s.keyLabel.slice(0, 12) : def.keyLabel,
    tempo: clamp(Number(s.tempo) || 120, 40, 240),
    timeSignature: sanitizeTimeSignature(s.timeSignature),
    gmInstrument:
      typeof s.gmInstrument === 'string' && s.gmInstrument ? s.gmInstrument : def.gmInstrument,
    soundfontKit: s.soundfontKit === 'MusyngKite' ? 'MusyngKite' : 'FluidR3_GM',
    capo: clamp(Number(s.capo) || 0, 0, 11),
    showCapoShapes: Boolean(s.showCapoShapes),
    columns,
    pianoHand: s.pianoHand === 'left' || s.hand === 'left' ? 'left' : 'right',
    guitarHand: s.guitarHand === 'left' ? 'left' : 'right',
    showGuitar: s.showGuitar !== false,
    showKeyboard: s.showKeyboard !== false,
    showUkulele: Boolean(s.showUkulele),
    showProgression: s.showProgression !== false,
    guitarVoicings: sanitizeRecord(s.guitarVoicings || s.voicings),
    pianoVoicings: sanitizeRecord(s.pianoVoicings),
    ukuleleVoicings: sanitizeRecord(s.ukuleleVoicings),
    rows,
  };
}

export function loadActiveState(): SheetState {
  // Priority 1: URL hash share link
  if (typeof window !== 'undefined' && window.location.hash.startsWith(HASH_PREFIX)) {
    const shared = decodeShareHash(window.location.hash);
    if (shared) return shared;
  }

  // Priority 2: v2 or v1 localStorage
  try {
    const rawV2 = window.localStorage.getItem(STORAGE_KEY_V2);
    if (rawV2) return sanitizeSheetState(JSON.parse(rawV2));
    const rawV1 = window.localStorage.getItem(STORAGE_KEY_V1);
    if (rawV1) return sanitizeSheetState(JSON.parse(rawV1));
  } catch {
    // ignore storage errors
  }

  return createDefaultState();
}

export function saveActiveState(state: SheetState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export function loadSavedCharts(): SavedChart[] {
  try {
    const raw = window.localStorage.getItem(LIBRARY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((item) => item && typeof item === 'object' && typeof item.id === 'string')
      .map((item) => ({
        id: item.id,
        title: typeof item.title === 'string' && item.title.trim() ? item.title : 'Untitled Song',
        updatedAt: Number(item.updatedAt) || Date.now(),
        state: sanitizeSheetState(item.state),
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function persistSavedCharts(charts: SavedChart[]): void {
  try {
    window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(charts));
  } catch {
    // ignore
  }
}

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64: string): string {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeShareUrl(state: SheetState): string {
  const compact = {
    ...state,
    rows: state.rows.map((r) => ({
      label: r.label,
      slots: r.slots.slice(0, state.columns),
    })),
  };
  const encoded = toBase64Url(JSON.stringify(compact));
  const url = new URL(window.location.href);
  url.hash = HASH_PREFIX + encoded;
  return url.toString();
}

export function decodeShareHash(hash: string): SheetState | null {
  if (!hash || !hash.startsWith(HASH_PREFIX)) return null;
  try {
    const json = fromBase64Url(hash.slice(HASH_PREFIX.length));
    return sanitizeSheetState(JSON.parse(json));
  } catch {
    return null;
  }
}
