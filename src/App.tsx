import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  FolderOpen,
  Link2,
  Play,
  Plus,
  Printer,
  Square,
  Trash2,
  Volume2,
} from 'lucide-react';
import { LibraryModal } from './components/LibraryModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PrintHelpModal } from './components/PrintHelpModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { SheetPreview } from './components/SheetPreview';
import {
  ALL_GM_OPTIONS,
  getSoundfontState,
  onSoundfontStatus,
  playMetronomeClick,
  playSoundfontChord,
  POPULAR_GM_OPTIONS,
  preloadSoundfont,
  stopAllAudio,
  type SoundfontKit,
  type SoundfontStatus,
} from './lib/audio';
import {
  CHORD_SUGGESTIONS,
  getGuitarVoicings,
  getPianoVoicings,
  getUkuleleVoicings,
  guitarShapeToMidi,
  inferKeyLabel,
  isNoChord,
  isRepeatSymbol,
  parseBarCell,
  parseChord,
  transposeCellText,
  transposeRoot,
  ukuleleShapeToMidi,
} from './lib/chords';
import { computePrintZoom, isStandaloneIOS, renderElementToA4Pdf } from './lib/pdf';
import {
  createDefaultState,
  loadActiveState,
  loadSavedCharts,
  makeRow,
  MAX_COLUMNS,
  MAX_ROWS,
  persistSavedCharts,
  sanitizeSheetState,
  saveActiveState,
  encodeShareUrl,
} from './lib/storage';
import type { ParsedChord, SavedChart, SheetState, TimeSignature } from './types';

const SECTION_LABEL_SUGGESTIONS = ['Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Bridge', 'Solo', 'Outro'];

export default function App() {
  const [state, setState] = useState<SheetState>(() => loadActiveState());
  const [savedCharts, setSavedCharts] = useState<SavedChart[]>(() => loadSavedCharts());
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [printZoom, setPrintZoom] = useState(1);
  const [toast, setToast] = useState<string | null>(null);

  // Playback & GM SoundFont state
  const [isPlaying, setIsPlaying] = useState(false);
  const [metronomeOn, setMetronomeOn] = useState(true);
  const [activeCell, setActiveCell] = useState<{ rowIdx: number; colIdx: number } | null>(null);
  const [soundfontStatus, setSoundfontStatus] = useState<SoundfontStatus>(() =>
    getSoundfontState('acoustic_grand_piano', 'FluidR3_GM')
  );

  // Standalone iPad PDF modal state
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [isBuildingPdf, setIsBuildingPdf] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState('chord-sheet.pdf');
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  const paperRef = useRef<HTMLDivElement | null>(null);
  const slotRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const toastTimerRef = useRef<number | null>(null);
  const playbackTimerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  // Persist active state on change
  useEffect(() => {
    saveActiveState(state);
  }, [state]);

  // Listen to hash changes (e.g., pasting another shared link)
  useEffect(() => {
    const onHashChange = () => {
      const loaded = loadActiveState();
      setState(loaded);
      showToast('Loaded shared chart from link');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [showToast]);

  // Recompute single-page A4 print zoom whenever sheet content changes
  useLayoutEffect(() => {
    setPrintZoom(computePrintZoom(paperRef.current));
  }, [state]);

  useEffect(() => {
    const onBeforePrint = () => {
      setPrintZoom(computePrintZoom(paperRef.current));
    };
    window.addEventListener('beforeprint', onBeforePrint);
    return () => window.removeEventListener('beforeprint', onBeforePrint);
  }, []);

  // Cleanup PDF blob URLs on unmount
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [pdfBlobUrl]);

  // Subscribe to GM SoundFont loading state
  useEffect(() => {
    const activeKey = `${state.soundfontKit}:${state.gmInstrument}`;
    setSoundfontStatus(getSoundfontState(state.gmInstrument, state.soundfontKit));
    return onSoundfontStatus((key, status) => {
      if (key === activeKey) {
        setSoundfontStatus(status);
      }
    });
  }, [state.gmInstrument, state.soundfontKit]);

  // Playback engine
  const stopPlayback = useCallback(() => {
    if (playbackTimerRef.current) {
      window.clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    stopAllAudio();
    setIsPlaying(false);
    setActiveCell(null);
  }, []);

  useEffect(() => {
    return () => {
      if (playbackTimerRef.current) window.clearInterval(playbackTimerRef.current);
      stopAllAudio();
    };
  }, []);

  const playChordAudio = useCallback(
    (chord: ParsedChord) => {
      const isStrumPatch =
        state.gmInstrument.includes('guitar') ||
        state.gmInstrument.includes('banjo') ||
        state.gmInstrument.includes('harp') ||
        state.gmInstrument.includes('ukulele');

      let midiNotes: number[] = [];
      if (state.showGuitar && (isStrumPatch || !state.showKeyboard)) {
        const voicings = getGuitarVoicings(chord);
        const sel = voicings.find((v) => v.id === state.guitarVoicings[chord.identity]) || voicings[0];
        if (sel) midiNotes = guitarShapeToMidi(sel.shape);
      } else if (state.showUkulele && !state.showKeyboard && !state.showGuitar) {
        const voicings = getUkuleleVoicings(chord);
        const sel = voicings.find((v) => v.id === state.ukuleleVoicings[chord.identity]) || voicings[0];
        if (sel) midiNotes = ukuleleShapeToMidi(sel.shape);
      }

      if (!midiNotes.length) {
        const pVoicings = getPianoVoicings(chord, state.pianoHand);
        const pSel = pVoicings.find((v) => v.id === state.pianoVoicings[chord.identity]) || pVoicings[0];
        if (pSel) midiNotes = pSel.notes.map((n) => n.midi);
      }

      if (midiNotes.length) {
        playSoundfontChord(midiNotes, {
          instrument: state.gmInstrument,
          kit: state.soundfontKit,
          duration: 1.65,
          strumGap: isStrumPatch ? 0.03 : 0.01,
          fallbackStyle: isStrumPatch ? 'strum' : 'piano',
        });
      }
    },
    [state]
  );

  const togglePlayback = () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    // Ensure the selected GM SoundFont begins loading immediately
    void preloadSoundfont(state.gmInstrument, state.soundfontKit);

    // Build flattened sequence of playable bars (resolving "%" repeat bars)
    const sequence: { rowIdx: number; colIdx: number; chords: ParsedChord[] }[] = [];
    let lastBarChords: ParsedChord[] = [];

    state.rows.forEach((row, rowIdx) => {
      const sliced = row.slots.slice(0, state.columns);
      while (sliced.length && !sliced[sliced.length - 1].trim()) sliced.pop();
      sliced.forEach((raw, colIdx) => {
        const parsed = parseBarCell(raw);
        if (parsed.kind === 'empty') return;
        if (parsed.kind === 'nc') {
          lastBarChords = [];
          sequence.push({ rowIdx, colIdx, chords: [] });
        } else if (parsed.kind === 'repeat') {
          sequence.push({ rowIdx, colIdx, chords: lastBarChords });
        } else if (parsed.kind === 'chords') {
          lastBarChords = parsed.chords;
          sequence.push({ rowIdx, colIdx, chords: parsed.chords });
        }
      });
    });

    if (!sequence.length) {
      showToast('Add chords to the progression to play');
      return;
    }

    const beatsPerBar =
      state.timeSignature === '3/4' ? 3 : state.timeSignature === '2/4' ? 2 : state.timeSignature === '6/8' ? 6 : 4;
    const beatMs =
      state.timeSignature === '6/8' ? (60000 / state.tempo) * 0.5 : 60000 / state.tempo;

    let step = 0;
    setIsPlaying(true);

    const tick = () => {
      const barIdx = Math.floor(step / beatsPerBar) % sequence.length;
      const beatInBar = step % beatsPerBar;
      const item = sequence[barIdx];

      setActiveCell({ rowIdx: item.rowIdx, colIdx: item.colIdx });
      if (metronomeOn) {
        playMetronomeClick(beatInBar === 0);
      }

      if (item.chords.length > 0) {
        const splitInterval = Math.max(1, Math.floor(beatsPerBar / item.chords.length));
        if (beatInBar % splitInterval === 0) {
          const chordIdx = Math.min(item.chords.length - 1, Math.floor(beatInBar / splitInterval));
          if (beatInBar === chordIdx * splitInterval) {
            playChordAudio(item.chords[chordIdx]);
          }
        }
      }
      step += 1;
    };

    tick();
    playbackTimerRef.current = window.setInterval(tick, beatMs);
  };

  // Stop playback if tempo, time signature, or progression changes while playing
  useEffect(() => {
    if (isPlaying) {
      stopPlayback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tempo, state.timeSignature, state.columns]);

  // Grid helpers
  const focusSlot = (rowIdx: number, colIdx: number) => {
    const el = slotRefs.current[`${rowIdx}-${colIdx}`];
    if (el) {
      el.focus();
      el.select();
    }
  };

  const updateSlotValue = (rowIdx: number, colIdx: number, value: string) => {
    setState((prev) => {
      const rows = prev.rows.map((r, i) =>
        i === rowIdx ? { ...r, slots: r.slots.map((s, c) => (c === colIdx ? value : s)) } : r
      );
      return { ...prev, rows };
    });
  };

  const handleSlotBlur = (rowIdx: number, colIdx: number) => {
    setState((prev) => {
      const raw = prev.rows[rowIdx]?.slots[colIdx] || '';
      const trimmed = raw.trim();
      if (!trimmed) return prev;
      const parsed = parseBarCell(trimmed);
      let normalized = trimmed;
      if (parsed.kind === 'nc') normalized = 'NC';
      else if (parsed.kind === 'repeat') normalized = '%';
      else if (parsed.kind === 'chords') normalized = parsed.raw;

      if (normalized === raw) return prev;
      const rows = prev.rows.map((r, i) =>
        i === rowIdx ? { ...r, slots: r.slots.map((s, c) => (c === colIdx ? normalized : s)) } : r
      );
      return { ...prev, rows };
    });
  };

  const handleSlotKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIdx: number,
    colIdx: number
  ) => {
    const val = e.currentTarget.value;
    if (e.key === 'Enter' || (e.key === ' ' && val.trim() && !val.trim().endsWith('|'))) {
      e.preventDefault();
      if (colIdx + 1 < state.columns) {
        focusSlot(rowIdx, colIdx + 1);
      } else if (rowIdx + 1 < state.rows.length) {
        focusSlot(rowIdx + 1, 0);
      } else if (state.rows.length < MAX_ROWS) {
        setState((prev) => ({ ...prev, rows: [...prev.rows, makeRow([])] }));
        window.setTimeout(() => focusSlot(rowIdx + 1, 0), 20);
      }
      return;
    }

    if (e.key === 'Backspace' && !val) {
      e.preventDefault();
      if (colIdx > 0) focusSlot(rowIdx, colIdx - 1);
      else if (rowIdx > 0) focusSlot(rowIdx - 1, state.columns - 1);
      return;
    }

    if (e.key === 'ArrowRight' && e.currentTarget.selectionStart === val.length) {
      if (colIdx + 1 < state.columns) {
        e.preventDefault();
        focusSlot(rowIdx, colIdx + 1);
      }
    } else if (e.key === 'ArrowLeft' && e.currentTarget.selectionStart === 0) {
      if (colIdx > 0) {
        e.preventDefault();
        focusSlot(rowIdx, colIdx - 1);
      }
    } else if (e.key === 'ArrowDown' && rowIdx + 1 < state.rows.length) {
      e.preventDefault();
      focusSlot(rowIdx + 1, colIdx);
    } else if (e.key === 'ArrowUp' && rowIdx > 0) {
      e.preventDefault();
      focusSlot(rowIdx - 1, colIdx);
    }
  };

  const handleSlotPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startRow: number,
    startCol: number
  ) => {
    const text = e.clipboardData.getData('text');
    if (!text) return;
    const rawLines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const singleLineTokens = text.split(/[\s,|]+/).filter(Boolean);

    // Let normal single-chord paste happen natively
    if (rawLines.length <= 1 && singleLineTokens.length <= 1) return;

    e.preventDefault();
    setState((prev) => {
      const nextRows = prev.rows.map((r) => ({ ...r, slots: [...r.slots] }));
      let nextCols = prev.columns;

      const normalizeToken = (tok: string) => {
        if (isNoChord(tok)) return 'NC';
        if (isRepeatSymbol(tok)) return '%';
        const c = parseChord(tok);
        return c ? c.ascii : tok;
      };

      if (rawLines.length > 1) {
        // Multi-line paste: treat each line as a row
        rawLines.forEach((line, lineOffset) => {
          const targetRow = startRow + lineOffset;
          if (targetRow >= MAX_ROWS) return;
          while (nextRows.length <= targetRow) nextRows.push(makeRow([]));
          const tokens = line
            .split(/[\s,|]+/)
            .map((t) => t.trim())
            .filter(Boolean);
          const colStart = lineOffset === 0 ? startCol : 0;
          if (colStart + tokens.length > nextCols) {
            nextCols = Math.min(MAX_COLUMNS, colStart + tokens.length);
          }
          tokens.slice(0, MAX_COLUMNS - colStart).forEach((tok, idx) => {
            nextRows[targetRow].slots[colStart + idx] = normalizeToken(tok);
          });
        });
      } else {
        // Single-line multi-chord paste: wrap across rows if needed
        let r = startRow;
        let c = startCol;
        if (startRow === 0 && startCol === 0 && singleLineTokens.length <= MAX_COLUMNS) {
          nextCols = Math.max(nextCols, singleLineTokens.length);
        }
        singleLineTokens.forEach((tok) => {
          if (c >= nextCols) {
            r += 1;
            c = 0;
          }
          if (r >= MAX_ROWS) return;
          while (nextRows.length <= r) nextRows.push(makeRow([]));
          nextRows[r].slots[c] = normalizeToken(tok);
          c += 1;
        });
      }

      return { ...prev, columns: nextCols, rows: nextRows };
    });
    showToast('Pasted progression into grid');
  };

  const handleTranspose = (semitones: number) => {
    setState((prev) => {
      const parsedKey = parseChord(prev.keyLabel);
      const preferFlat = parsedKey
        ? [1, 3, 5, 8, 10].includes((parsedKey.rootPc + semitones + 12) % 12)
        : false;
      const nextKey = parsedKey
        ? transposeRoot(parsedKey.rootPc, semitones, preferFlat) +
          (parsedKey.qualityKey.startsWith('m') && !parsedKey.qualityKey.startsWith('maj') ? 'm' : '')
        : prev.keyLabel;

      const rows = prev.rows.map((row) => ({
        ...row,
        slots: row.slots.map((slot) => transposeCellText(slot, semitones, preferFlat)),
      }));

      return {
        ...prev,
        keyLabel: nextKey,
        rows,
      };
    });
    showToast(semitones > 0 ? 'Transposed +1 semitone' : 'Transposed -1 semitone');
  };

  const handleCopyShareLink = async () => {
    const url = encodeShareUrl(state);
    window.history.replaceState(null, '', new URL(url).hash);
    try {
      await navigator.clipboard.writeText(url);
      showToast('Shareable chart link copied to clipboard');
    } catch {
      showToast('Shareable link updated in address bar');
    }
  };

  const handlePrint = async () => {
    setPrintZoom(computePrintZoom(paperRef.current));

    if (isStandaloneIOS() && paperRef.current) {
      setIsBuildingPdf(true);
      showToast('Preparing A4 PDF…');
      try {
        const result = await renderElementToA4Pdf(paperRef.current, state.title);
        if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
        const url = URL.createObjectURL(result.blob);
        setPdfBlob(result.blob);
        setPdfBlobUrl(url);
        setPdfPreviewUrl(result.previewUrl);
        setPdfFileName(result.fileName);
        setPdfModalOpen(true);
      } catch {
        showToast('Could not generate PDF');
      } finally {
        setIsBuildingPdf(false);
      }
      return;
    }

    // Native vector print (desktop & regular iPad Safari)
    window.requestAnimationFrame(() => {
      window.print();
    });
  };

  const handleSharePdf = async () => {
    if (!pdfBlob) return;
    const file = new File([pdfBlob], pdfFileName, { type: 'application/pdf' });
    const data: ShareData = {
      files: [file],
      title: state.title.trim() || 'Chord Sheet',
    };
    if (typeof navigator.share === 'function' && (!navigator.canShare || navigator.canShare(data))) {
      try {
        await navigator.share(data);
        setPdfModalOpen(false);
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          showToast('Use Download PDF below');
        }
      }
    } else if (pdfBlobUrl) {
      window.open(pdfBlobUrl, '_blank');
    }
  };

  const handleSaveToLibrary = (title: string) => {
    const newEntry: SavedChart = {
      id: `chart-${Date.now().toString(36)}`,
      title,
      updatedAt: Date.now(),
      state: { ...state, title },
    };
    const next = [newEntry, ...savedCharts];
    setSavedCharts(next);
    persistSavedCharts(next);
    setState((prev) => ({ ...prev, title }));
    showToast(`Saved "${title}" to browser library`);
  };

  const handleDeleteFromLibrary = (id: string) => {
    const next = savedCharts.filter((c) => c.id !== id);
    setSavedCharts(next);
    persistSavedCharts(next);
    showToast('Deleted chart from library');
  };

  return (
    <div className="min-h-screen pb-16">
      {/* Top Bar: Clean 3-zone contract */}
      <header className="no-print mx-auto flex w-[min(100%-32px,1320px)] items-center justify-between gap-6 border-b border-[#dcd3c6] py-4">
        {/* Zone 1: Single-line brand wordmark */}
        <a
          href="/"
          className="inline-flex items-center gap-3 text-[#211f1b] no-underline whitespace-nowrap shrink-0"
        >
          <img
            src="/icon.svg"
            alt=""
            className="h-9 w-9 rounded-lg shadow-sm"
            aria-hidden="true"
          />
          <span className="font-display text-xl font-bold tracking-tight text-[#211f1b]">
            Chord Sheet <em className="text-[#c84b36] italic">Studio</em>
          </span>
        </a>

        {/* Zone 2: Clean single-line utility actions */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#4a463f]">
          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            className="inline-flex items-center gap-1.5 hover:text-[#211f1b] hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FolderOpen className="h-4 w-4" aria-hidden="true" />
            Saved Charts ({savedCharts.length})
          </button>
          <button
            type="button"
            onClick={() => void handleCopyShareLink()}
            className="inline-flex items-center gap-1.5 hover:text-[#211f1b] hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Link2 className="h-4 w-4" aria-hidden="true" />
            Copy Share Link
          </button>
          <a
            href="#sheet-preview"
            className="hover:text-[#211f1b] hover:underline underline-offset-4 whitespace-nowrap shrink-0"
          >
            Live A4 Preview
          </a>
        </nav>

        {/* Zone 3: Install + Primary Print CTA */}
        <div className="flex items-center gap-2.5 shrink-0">
          <PWAInstallButton />
          <button
            type="button"
            onClick={() => void handlePrint()}
            disabled={isBuildingPdf}
            className="inline-flex items-center gap-2 rounded-lg bg-[#c84b36] px-4 py-2 text-xs font-semibold text-[#fffdf8] shadow-sm transition hover:bg-[#a53625] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            {isBuildingPdf ? 'Preparing PDF…' : 'Print / Save PDF'}
          </button>
        </div>
      </header>

      <main className="mx-auto mt-6 w-[min(100%-32px,1320px)] space-y-6">
        {/* Mobile quick bar */}
        <div className="no-print flex flex-wrap items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#b9ae9e] bg-[#fffdf8] px-3 py-2 text-xs font-semibold text-[#211f1b] cursor-pointer"
          >
            <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
            Saved ({savedCharts.length})
          </button>
          <button
            type="button"
            onClick={() => void handleCopyShareLink()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#b9ae9e] bg-[#fffdf8] px-3 py-2 text-xs font-semibold text-[#211f1b] cursor-pointer"
          >
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
            Share Link
          </button>
        </div>

        {/* Workspace Editor Card */}
        <section
          className="no-print rounded-xl border border-[#dcd3c6] bg-[#fffdf8] p-5 shadow-sm sm:p-6"
          aria-labelledby="editor-heading"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#dcd3c6] pb-3.5">
            <div>
              <p className="text-xs font-semibold text-[#c84b36]">Build your chart</p>
              <h2 id="editor-heading" className="font-display text-xl font-bold text-[#211f1b]">
                Song, tuning &amp; progression
              </h2>
            </div>
            <p className="text-xs text-[#6f675c]">
              Supports slash chords (G/B), split bars (G | D), repeats (%), and no chord (NC)
            </p>
          </div>

          {/* Song Metadata + Transpose + Capo */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
            <label className="block lg:col-span-4">
              <span className="mb-1 block text-xs font-semibold text-[#4a463f]">Song title</span>
              <input
                type="text"
                maxLength={80}
                value={state.title}
                onChange={(e) => setState((prev) => ({ ...prev, title: e.target.value }))}
                onBlur={() => {
                  if (!state.title.trim()) {
                    setState((prev) => ({ ...prev, title: 'Untitled Song' }));
                  }
                }}
                className="w-full rounded-lg border border-[#b9ae9e] bg-white px-3 py-2 text-sm font-medium text-[#211f1b]"
                placeholder="Untitled Song"
              />
            </label>

            <label className="block lg:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-[#4a463f]">Key</span>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  maxLength={10}
                  value={state.keyLabel}
                  onChange={(e) => setState((prev) => ({ ...prev, keyLabel: e.target.value }))}
                  className="w-full rounded-lg border border-[#b9ae9e] bg-white px-3 py-2 text-sm font-medium text-[#211f1b]"
                  placeholder="G"
                />
                <button
                  type="button"
                  onClick={() =>
                    setState((prev) => ({ ...prev, keyLabel: inferKeyLabel(prev.rows) }))
                  }
                  title="Detect key from first chord"
                  className="rounded-lg border border-[#dcd3c6] bg-[#f8f2e8] px-2.5 text-[11px] font-semibold text-[#4a463f] hover:bg-[#ede4d6] whitespace-nowrap cursor-pointer"
                >
                  Auto
                </button>
              </div>
            </label>

            <label className="block lg:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-[#4a463f]">Time signature</span>
              <select
                value={state.timeSignature}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, timeSignature: e.target.value as TimeSignature }))
                }
                className="w-full rounded-lg border border-[#b9ae9e] bg-white px-3 py-2 text-sm font-medium text-[#211f1b] cursor-pointer"
              >
                <option value="4/4">4/4</option>
                <option value="3/4">3/4</option>
                <option value="6/8">6/8</option>
                <option value="2/4">2/4</option>
              </select>
            </label>

            <label className="block lg:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-[#4a463f]">
                Tempo ({state.tempo} BPM)
              </span>
              <input
                type="number"
                min={40}
                max={240}
                value={state.tempo}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    tempo: Math.max(40, Math.min(240, Number(e.target.value) || 120)),
                  }))
                }
                className="font-mono-tabular w-full rounded-lg border border-[#b9ae9e] bg-white px-3 py-2 text-sm font-medium text-[#211f1b]"
              />
            </label>

            <div className="lg:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-[#4a463f]">Transpose</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleTranspose(-1)}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#b9ae9e] bg-[#f8f2e8] py-2 text-xs font-semibold text-[#211f1b] hover:bg-[#ede4d6] cursor-pointer"
                >
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                  -1
                </button>
                <button
                  type="button"
                  onClick={() => handleTranspose(1)}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#b9ae9e] bg-[#f8f2e8] py-2 text-xs font-semibold text-[#211f1b] hover:bg-[#ede4d6] cursor-pointer"
                >
                  <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                  +1
                </button>
              </div>
            </div>
          </div>

          {/* Instrument Toggles + Handedness + Capo + Columns */}
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[#dcd3c6] pt-4">
            {/* Sections */}
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Visible sections">
              <span className="mr-1 text-xs font-semibold text-[#4a463f]">Sections:</span>
              {(
                [
                  { key: 'showGuitar', label: 'Guitar' },
                  { key: 'showKeyboard', label: 'Keyboard' },
                  { key: 'showUkulele', label: 'Ukulele' },
                  { key: 'showProgression', label: 'Progression' },
                ] as const
              ).map((sec) => {
                const active = state[sec.key];
                return (
                  <button
                    key={sec.key}
                    type="button"
                    role="switch"
                    aria-checked={active}
                    onClick={() => setState((prev) => ({ ...prev, [sec.key]: !prev[sec.key] }))}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      active
                        ? 'border-[#a53625] bg-[#c84b36] text-[#fffdf8]'
                        : 'border-[#dcd3c6] bg-[#f8f2e8] text-[#4a463f] hover:bg-[#ede4d6]'
                    }`}
                  >
                    {sec.label}
                  </button>
                );
              })}
            </div>

            {/* Piano & Guitar Handedness */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 rounded-lg bg-[#f1ece3] p-1">
                <span className="px-2 text-[11px] font-semibold text-[#4a463f]">Piano:</span>
                {(['right', 'left'] as const).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setState((prev) => ({ ...prev, pianoHand: h }))}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                      state.pianoHand === h
                        ? 'bg-white text-[#211f1b] shadow-sm'
                        : 'text-[#6f675c] hover:text-[#211f1b]'
                    }`}
                  >
                    {h === 'right' ? 'RH' : 'LH'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 rounded-lg bg-[#f1ece3] p-1">
                <span className="px-2 text-[11px] font-semibold text-[#4a463f]">Guitar:</span>
                {(['right', 'left'] as const).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setState((prev) => ({ ...prev, guitarHand: h }))}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                      state.guitarHand === h
                        ? 'bg-white text-[#211f1b] shadow-sm'
                        : 'text-[#6f675c] hover:text-[#211f1b]'
                    }`}
                  >
                    {h === 'right' ? 'RH' : 'LH'}
                  </button>
                ))}
              </div>
            </div>

            {/* Capo */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#4a463f]">
                <span>Capo:</span>
                <select
                  value={state.capo}
                  onChange={(e) => setState((prev) => ({ ...prev, capo: Number(e.target.value) }))}
                  className="rounded-lg border border-[#b9ae9e] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#211f1b] cursor-pointer"
                >
                  <option value={0}>None</option>
                  {Array.from({ length: 11 }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Fret {i + 1}
                    </option>
                  ))}
                </select>
              </label>

              {state.capo > 0 && (
                <label className="flex items-center gap-1.5 text-xs font-medium text-[#4a463f] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.showCapoShapes}
                    onChange={(e) =>
                      setState((prev) => ({ ...prev, showCapoShapes: e.target.checked }))
                    }
                    className="h-3.5 w-3.5 accent-[#c84b36]"
                  />
                  <span>Show capo shapes</span>
                </label>
              )}
            </div>

            {/* Columns */}
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#4a463f]">Bars/row:</span>
              <div className="flex items-center rounded-lg bg-[#f1ece3] p-1">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setState((prev) => ({ ...prev, columns: n }))}
                    className={`font-mono-tabular h-7 w-7 rounded-md text-xs font-semibold transition cursor-pointer ${
                      state.columns === n
                        ? 'bg-white text-[#211f1b] shadow-sm'
                        : 'text-[#6f675c] hover:text-[#211f1b]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Progression Grid */}
          <div className="mt-5 rounded-xl border border-[#dcd3c6] bg-[#f8f2e8]/65 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={togglePlayback}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                    isPlaying
                      ? 'bg-[#211f1b] text-[#fffdf8]'
                      : 'bg-[#c84b36] text-[#fffdf8] hover:bg-[#a53625]'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      Play progression
                    </>
                  )}
                </button>

                <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4a463f] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={metronomeOn}
                    onChange={(e) => setMetronomeOn(e.target.checked)}
                    className="h-3.5 w-3.5 accent-[#c84b36]"
                  />
                  <Volume2 className="h-3.5 w-3.5 text-[#6f675c]" aria-hidden="true" />
                  <span>Click</span>
                </label>

                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4a463f]">
                  <span>SoundFont:</span>
                  <select
                    value={state.gmInstrument}
                    onChange={(e) => {
                      const nextInst = e.target.value;
                      setState((prev) => ({ ...prev, gmInstrument: nextInst }));
                      void preloadSoundfont(nextInst, state.soundfontKit);
                    }}
                    aria-label="General MIDI SoundFont instrument"
                    className="max-w-[210px] rounded-lg border border-[#b9ae9e] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#211f1b] cursor-pointer"
                  >
                    <optgroup label="Popular chord instruments">
                      {POPULAR_GM_OPTIONS.map((opt) => (
                        <option key={`pop-${opt.id}`} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="All 128 General MIDI">
                      {ALL_GM_OPTIONS.map((opt) => (
                        <option key={`all-${opt.id}`} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </label>

                <select
                  value={state.soundfontKit}
                  onChange={(e) => {
                    const nextKit = e.target.value as SoundfontKit;
                    setState((prev) => ({ ...prev, soundfontKit: nextKit }));
                    void preloadSoundfont(state.gmInstrument, nextKit);
                  }}
                  aria-label="General MIDI SoundFont bank"
                  className="rounded-lg border border-[#dcd3c6] bg-white px-2 py-1.5 text-xs font-medium text-[#4a463f] cursor-pointer"
                >
                  <option value="FluidR3_GM">FluidR3 GM</option>
                  <option value="MusyngKite">MusyngKite</option>
                </select>

                {soundfontStatus === 'loading' && (
                  <span className="text-[11px] font-medium text-[#6f675c]">
                    Loading GM SoundFont…
                  </span>
                )}
                {soundfontStatus === 'ready' && (
                  <span className="text-[11px] font-medium text-[#4a463f]">
                    GM SoundFont cached
                  </span>
                )}
                {soundfontStatus === 'fallback' && (
                  <span className="text-[11px] font-medium text-[#6f675c]">
                    Using built-in synth (offline)
                  </span>
                )}
              </div>

              <span className="font-mono-tabular text-xs text-[#6f675c]">
                {state.rows.length} / {MAX_ROWS} rows · {state.columns} bars/row
              </span>
            </div>

            <div className="space-y-2.5 overflow-x-auto pb-1">
              {state.rows.map((row, rowIdx) => (
                <div key={row.id} className="flex min-w-[600px] items-center gap-2">
                  {/* Optional section label */}
                  <input
                    type="text"
                    list="sectionLabelSuggestions"
                    maxLength={20}
                    value={row.label}
                    onChange={(e) => {
                      const val = e.target.value;
                      setState((prev) => ({
                        ...prev,
                        rows: prev.rows.map((r, i) => (i === rowIdx ? { ...r, label: val } : r)),
                      }));
                    }}
                    placeholder="Section"
                    aria-label={`Row ${rowIdx + 1} section label`}
                    className="w-24 shrink-0 rounded-lg border border-[#dcd3c6] bg-white/85 px-2.5 py-2 text-xs font-semibold text-[#4a463f] placeholder:font-normal placeholder:text-[#9c9387]"
                  />

                  <div
                    className="grid flex-1 gap-2"
                    style={{
                      gridTemplateColumns: `repeat(${state.columns}, minmax(0, 1fr))`,
                    }}
                  >
                    {Array.from({ length: state.columns }).map((_, colIdx) => {
                      const val = row.slots[colIdx] || '';
                      const parsed = parseBarCell(val);
                      const isInvalid = parsed.kind === 'invalid';
                      const isPlayingHere =
                        activeCell?.rowIdx === rowIdx && activeCell?.colIdx === colIdx;

                      return (
                        <div key={`${row.id}-${colIdx}`} className="relative">
                          <input
                            ref={(el) => {
                              slotRefs.current[`${rowIdx}-${colIdx}`] = el;
                            }}
                            type="text"
                            list="chordSuggestions"
                            autoComplete="off"
                            spellCheck={false}
                            value={val}
                            aria-label={`Row ${rowIdx + 1} bar ${colIdx + 1}`}
                            aria-invalid={isInvalid}
                            title={
                              isInvalid
                                ? `Unrecognized chord "${val}". Try C, Am, F#m7, Bb, G/B, NC, or %`
                                : undefined
                            }
                            onChange={(e) => updateSlotValue(rowIdx, colIdx, e.target.value)}
                            onBlur={() => handleSlotBlur(rowIdx, colIdx)}
                            onKeyDown={(e) => handleSlotKeyDown(e, rowIdx, colIdx)}
                            onPaste={(e) => handleSlotPaste(e, rowIdx, colIdx)}
                            placeholder={rowIdx === 0 && colIdx === 0 ? 'G' : ''}
                            className={`w-full rounded-lg border px-2.5 py-2 text-center text-sm font-semibold transition ${
                              isInvalid
                                ? 'border-[#c84b36] bg-red-50 text-[#a53625]'
                                : isPlayingHere
                                  ? 'border-[#c84b36] bg-[#c84b36]/15 text-[#a53625] ring-2 ring-[#c84b36]/30'
                                  : 'border-[#b9ae9e] bg-white text-[#211f1b]'
                            }`}
                          />
                          {isInvalid && (
                            <span className="mt-0.5 block text-center text-[10px] font-medium text-[#c84b36]">
                              Invalid chord
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={state.rows.length <= 1}
                    onClick={() => {
                      setState((prev) => ({
                        ...prev,
                        rows: prev.rows.filter((_, i) => i !== rowIdx),
                      }));
                    }}
                    aria-label={`Remove row ${rowIdx + 1}`}
                    className="rounded-lg p-2 text-[#6f675c] transition hover:bg-white hover:text-[#c84b36] disabled:opacity-30 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[#6f675c]">
                Tip: Paste multi-line progressions directly into any slot. Use <strong>%</strong> to repeat the
                previous bar, <strong>G | D</strong> for split bars, or <strong>NC</strong> for a silent bar.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (state.rows.length >= MAX_ROWS) {
                    showToast(`Up to ${MAX_ROWS} rows`);
                    return;
                  }
                  const nextIdx = state.rows.length;
                  setState((prev) => ({ ...prev, rows: [...prev.rows, makeRow([])] }));
                  window.setTimeout(() => focusSlot(nextIdx, 0), 20);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#b9ae9e] bg-white px-3.5 py-2 text-xs font-semibold text-[#211f1b] hover:bg-[#f1ece3] cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add row
              </button>
            </div>
          </div>
        </section>

        {/* Live A4 Sheet Preview */}
        <section id="sheet-preview" className="print-container space-y-3" aria-labelledby="preview-heading">
          <div className="no-print flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-[#c84b36]">Live A4 preview</p>
              <h2 id="preview-heading" className="font-display text-xl font-bold text-[#211f1b]">
                Printable chord sheet
              </h2>
            </div>
            <span className="text-xs text-[#6f675c]">
              A4 portrait · scales cleanly to fit one page on print
            </span>
          </div>

          <SheetPreview
            paperRef={paperRef}
            state={state}
            printZoom={printZoom}
            activePlaybackCell={activeCell}
            onSelectGuitarVoicing={(key, voicingId) =>
              setState((prev) => ({
                ...prev,
                guitarVoicings: { ...prev.guitarVoicings, [key]: voicingId },
              }))
            }
            onSelectPianoVoicing={(key, voicingId) =>
              setState((prev) => ({
                ...prev,
                pianoVoicings: { ...prev.pianoVoicings, [key]: voicingId },
              }))
            }
            onSelectUkuleleVoicing={(key, voicingId) =>
              setState((prev) => ({
                ...prev,
                ukuleleVoicings: { ...prev.ukuleleVoicings, [key]: voicingId },
              }))
            }
          />
        </section>
      </main>

      <datalist id="chordSuggestions">
        {CHORD_SUGGESTIONS.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <datalist id="sectionLabelSuggestions">
        {SECTION_LABEL_SUGGESTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <LibraryModal
        open={libraryOpen}
        charts={savedCharts}
        currentState={state}
        onSaveNew={handleSaveToLibrary}
        onLoadChart={(chart) => {
          setState(sanitizeSheetState(chart.state));
          showToast(`Loaded "${chart.title}"`);
        }}
        onDeleteChart={handleDeleteFromLibrary}
        onImportState={(raw) => {
          const imported = sanitizeSheetState(raw);
          setState(imported);
          showToast(`Imported "${imported.title}"`);
        }}
        onResetExample={() => {
          setState(createDefaultState());
          window.history.replaceState(null, '', window.location.pathname);
          showToast('Reset to example progression');
        }}
        onClose={() => setLibraryOpen(false)}
      />

      <PrintHelpModal
        open={pdfModalOpen}
        previewUrl={pdfPreviewUrl}
        pdfUrl={pdfBlobUrl}
        fileName={pdfFileName}
        onShare={() => void handleSharePdf()}
        onClose={() => setPdfModalOpen(false)}
      />

      <OfflineIndicator />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="no-print fixed bottom-4 right-4 z-50 rounded-lg border border-[#b9ae9e] bg-[#211f1b] px-4 py-2.5 text-xs font-semibold text-[#fffdf8] shadow-xl"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
