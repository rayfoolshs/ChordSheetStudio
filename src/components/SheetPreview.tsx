import React from 'react';
import { Volume2 } from 'lucide-react';
import {
  enharmonicLabel,
  getGuitarVoicings,
  getPianoVoicings,
  getUkuleleVoicings,
  guitarShapeToMidi,
  parseBarCell,
  transposeChord,
  ukuleleShapeToMidi,
} from '../lib/chords';
import { playPianoMidi, playStrumMidi } from '../lib/audio';
import type { ParsedChord, SheetState } from '../types';
import { GuitarDiagramSVG, PianoDiagramSVG, UkuleleDiagramSVG } from './Diagrams';

interface SheetPreviewProps {
  paperRef: React.RefObject<HTMLDivElement | null>;
  state: SheetState;
  printZoom: number;
  activePlaybackCell: { rowIdx: number; colIdx: number } | null;
  onSelectGuitarVoicing: (key: string, voicingId: string) => void;
  onSelectPianoVoicing: (key: string, voicingId: string) => void;
  onSelectUkuleleVoicing: (key: string, voicingId: string) => void;
}

interface UniqueChartItem {
  key: string;
  raw: string;
  chord: ParsedChord | null;
  noChord?: boolean;
}

function diagramsPerRow(count: number): number {
  if (count <= 20) return 5;
  if (count <= 32) return 6;
  if (count <= 45) return 7;
  return 8;
}

function chunkItems<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export const SheetPreview: React.FC<SheetPreviewProps> = ({
  paperRef,
  state,
  printZoom,
  activePlaybackCell,
  onSelectGuitarVoicing,
  onSelectPianoVoicing,
  onSelectUkuleleVoicing,
}) => {
  const visibleRows = state.rows
    .map((row, rowIdx) => {
      const sliced = row.slots.slice(0, state.columns).map((v) => v.trim());
      while (sliced.length && !sliced[sliced.length - 1]) sliced.pop();
      return { id: row.id, label: row.label.trim(), slots: sliced, originalRowIdx: rowIdx };
    })
    .filter((row) => row.slots.some(Boolean));

  const uniqueChords: UniqueChartItem[] = [];
  const seen = new Set<string>();

  visibleRows.forEach((row) => {
    row.slots.forEach((raw) => {
      if (!raw) return;
      const parsed = parseBarCell(raw);
      if (parsed.kind === 'empty' || parsed.kind === 'repeat') return;
      if (parsed.kind === 'nc') {
        if (!seen.has('no-chord')) {
          seen.add('no-chord');
          uniqueChords.push({ key: 'no-chord', raw: 'NC', chord: null, noChord: true });
        }
        return;
      }
      if (parsed.kind === 'invalid') {
        const invKey = `invalid|${raw.toLowerCase()}`;
        if (!seen.has(invKey)) {
          seen.add(invKey);
          uniqueChords.push({ key: invKey, raw, chord: null });
        }
        return;
      }
      parsed.chords.forEach((chord) => {
        if (!seen.has(chord.identity)) {
          seen.add(chord.identity);
          uniqueChords.push({ key: chord.identity, raw: chord.ascii, chord });
        }
      });
    });
  });

  const title = state.title.trim() || 'Untitled Song';
  const handName = state.pianoHand === 'left' ? 'left-hand' : 'right-hand';
  const hasRowLabels = visibleRows.some((r) => Boolean(r.label));
  const maxCols = visibleRows.length
    ? Math.max(...visibleRows.map((r) => r.slots.length))
    : state.columns;

  const perRow = diagramsPerRow(uniqueChords.length);
  const gridCols = Math.min(perRow, uniqueChords.length) || 1;
  const rowsOfChords = chunkItems(uniqueChords, perRow);

  const metaParts: string[] = [];
  if (state.keyLabel.trim()) metaParts.push(`Key: ${state.keyLabel.trim()}`);
  metaParts.push(state.timeSignature);
  metaParts.push(`${state.tempo} BPM`);
  if (state.capo > 0) {
    metaParts.push(
      state.showCapoShapes
        ? `Capo ${state.capo} (diagram shapes transposed)`
        : `Capo ${state.capo}`
    );
  }

  const enabledSections = [
    state.showGuitar && 'guitar diagrams',
    state.showKeyboard && 'keyboard diagrams',
    state.showUkulele && 'ukulele diagrams',
    state.showProgression && 'the chord progression table',
  ].filter(Boolean) as string[];

  const emptyMessage = !enabledSections.length
    ? 'Turn on at least one section above to display your chart.'
    : enabledSections.length === 1
      ? `Add a chord or two to the progression above to create ${enabledSections[0]}.`
      : `Add a chord or two to the progression above to create ${enabledSections
          .slice(0, -1)
          .join(', ')} and ${enabledSections[enabledSections.length - 1]}.`;

  const activeSections: React.ReactNode[] = [];

  if (state.showGuitar) {
    activeSections.push(
      <section key="guitar" className="diagram-section mt-5" aria-labelledby="guitarHeading">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="guitarHeading" className="font-display text-lg font-bold tracking-tight text-[#211f1b]">
            Guitar{state.guitarHand === 'left' ? ' (LH)' : ''}
            {state.capo > 0 && state.showCapoShapes ? ` · Capo ${state.capo} Shapes` : ''}
          </h2>
          <span className="text-[11px] text-[#6f675c]">
            Fretting fingers in dots · enharmonic names · click play or pick a shape
          </span>
        </div>

        <div className="space-y-4">
          {rowsOfChords.map((chunk, chunkIdx) => (
            <div
              key={`g-chunk-${chunkIdx}`}
              className="chord-grid"
              style={{ '--cols': gridCols } as React.CSSProperties}
            >
              {chunk.map((item) => {
                if (item.noChord) {
                  return (
                    <article
                      key={`g-${item.key}`}
                      className="chord-card flex flex-col items-center text-center"
                      aria-label="Empty guitar fretboard for a bar with no chord"
                    >
                      <h3 className="mb-1 text-base font-bold text-[#211f1b] opacity-0" aria-hidden="true">
                        NC
                      </h3>
                      <div className="w-full max-w-[140px]">
                        <GuitarDiagramSVG shape={null} chord={null} hand={state.guitarHand} />
                      </div>
                      <div className="screen-spacer h-[28px]" aria-hidden="true" />
                      <p className="text-[10.5px] text-[#6f675c]" aria-hidden="true">
                        &nbsp;
                      </p>
                    </article>
                  );
                }

                if (!item.chord) {
                  return (
                    <article
                      key={`g-${item.key}`}
                      className="chord-card flex flex-col items-center rounded-lg border border-dashed border-[#c84b36]/50 p-2 text-center"
                    >
                      <h3 className="mb-2 text-base font-bold text-[#c84b36]">{item.raw}</h3>
                      <div className="flex h-28 w-full flex-col items-center justify-center text-xs text-[#6f675c]">
                        <span className="text-lg font-bold text-[#c84b36]">?</span>
                        <span>Unknown chord</span>
                      </div>
                    </article>
                  );
                }

                const displayChord =
                  state.capo > 0 && state.showCapoShapes
                    ? transposeChord(item.chord, -state.capo)
                    : item.chord;
                const voicings = getGuitarVoicings(displayChord);
                const selectedId = state.guitarVoicings[item.key];
                const voicing = voicings.find((v) => v.id === selectedId) || voicings[0];
                const noteLabels = item.chord.notes.map(enharmonicLabel).join(' · ');

                if (!voicing) {
                  return (
                    <article key={`g-${item.key}`} className="chord-card text-center">
                      <h3 className="text-base font-bold text-[#211f1b]">{item.chord.label}</h3>
                      <p className="mt-4 text-xs text-[#6f675c]">No shape</p>
                    </article>
                  );
                }

                return (
                  <article
                    key={`g-${item.key}`}
                    className="chord-card flex flex-col items-center text-center"
                  >
                    <div className="mb-0.5 flex items-center justify-center gap-1.5">
                      <h3 className="text-base font-bold tracking-tight text-[#211f1b]">
                        {state.capo > 0 && state.showCapoShapes
                          ? `${displayChord.label}`
                          : item.chord.label}
                      </h3>
                      <button
                        type="button"
                        onClick={() =>
                          playStrumMidi(
                            guitarShapeToMidi(voicing.shape).map(
                              (m) => m + (state.showCapoShapes ? state.capo : 0)
                            ),
                            1.6,
                            0.03,
                            2400,
                            'acoustic_guitar_steel',
                            state.soundfontKit
                          )
                        }
                        title={`Play ${item.chord.label} guitar voicing`}
                        aria-label={`Play ${item.chord.label} guitar voicing`}
                        className="screen-only inline-flex h-6 w-6 items-center justify-center rounded-md text-[#6f675c] transition hover:bg-[#f1ece3] hover:text-[#c84b36] cursor-pointer"
                      >
                        <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>

                    {state.capo > 0 && state.showCapoShapes && (
                      <p className="text-[10px] font-medium text-[#6f675c]">
                        Sounds {item.chord.label}
                      </p>
                    )}

                    <div className="w-full max-w-[140px]">
                      <GuitarDiagramSVG
                        shape={voicing.shape}
                        chord={displayChord}
                        hand={state.guitarHand}
                      />
                    </div>

                    {voicings.length > 1 ? (
                      <div className="screen-only mt-1 w-full max-w-[140px]">
                        <select
                          value={voicing.id}
                          onChange={(e) => onSelectGuitarVoicing(item.key, e.target.value)}
                          aria-label={`Guitar shape for ${item.chord.label}`}
                          className="w-full truncate rounded-md border border-[#dcd3c6] bg-[#f8f2e8] px-2 py-1 text-[11px] font-medium text-[#211f1b] cursor-pointer"
                        >
                          {voicings.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="screen-spacer h-[28px]" aria-hidden="true" />
                    )}

                    <p className="mt-1 text-[10.5px] leading-snug text-[#6f675c]">{noteLabels}</p>
                  </article>
                );
              })}
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (state.showKeyboard) {
    activeSections.push(
      <section key="keyboard" className="diagram-section mt-5" aria-labelledby="keyboardHeading">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="keyboardHeading" className="font-display text-lg font-bold tracking-tight text-[#211f1b]">
            Keyboard
          </h2>
          <span className="text-[11px] text-[#6f675c]">
            Suggested {handName} fingering · 2-octave root/inversion view · enharmonic names
          </span>
        </div>

        <div className="space-y-4">
          {rowsOfChords.map((chunk, chunkIdx) => (
            <div
              key={`k-chunk-${chunkIdx}`}
              className="chord-grid"
              style={{ '--cols': gridCols } as React.CSSProperties}
            >
              {chunk.map((item) => {
                if (item.noChord) {
                  return (
                    <article
                      key={`k-${item.key}`}
                      className="chord-card flex flex-col items-center text-center"
                      aria-label="Empty keyboard for a bar with no chord"
                    >
                      <div className="w-full max-w-[180px]">
                        <PianoDiagramSVG voicing={null} chord={null} />
                      </div>
                      <h3 className="mt-1 text-base font-bold text-[#211f1b] opacity-0" aria-hidden="true">
                        NC
                      </h3>
                      <div className="screen-spacer h-[26px]" aria-hidden="true" />
                      <p className="text-[10.5px] text-[#6f675c]" aria-hidden="true">
                        &nbsp;
                      </p>
                      <p className="text-[10.5px] text-[#6f675c]" aria-hidden="true">
                        &nbsp;
                      </p>
                    </article>
                  );
                }

                if (!item.chord) {
                  return (
                    <article
                      key={`k-${item.key}`}
                      className="chord-card flex flex-col items-center rounded-lg border border-dashed border-[#c84b36]/50 p-2 text-center"
                    >
                      <h3 className="mb-1 text-base font-bold text-[#c84b36]">{item.raw}</h3>
                      <span className="text-xs text-[#6f675c]">Unknown chord</span>
                    </article>
                  );
                }

                const voicings = getPianoVoicings(item.chord, state.pianoHand);
                const selectedId = state.pianoVoicings[item.key];
                const voicing = voicings.find((v) => v.id === selectedId) || voicings[0];
                const noteLabels = item.chord.notes.map(enharmonicLabel).join(' · ');

                if (!voicing) return null;

                return (
                  <article
                    key={`k-${item.key}`}
                    className="chord-card flex flex-col items-center text-center"
                  >
                    <div className="w-full max-w-[180px]">
                      <PianoDiagramSVG voicing={voicing} chord={item.chord} />
                    </div>

                    <div className="mt-1 flex items-center justify-center gap-1.5">
                      <h3 className="text-base font-bold tracking-tight text-[#211f1b]">
                        {item.chord.label}
                      </h3>
                      <button
                        type="button"
                        onClick={() =>
                          playPianoMidi(
                            voicing.notes.map((n) => n.midi),
                            1.6,
                            'acoustic_grand_piano',
                            state.soundfontKit
                          )
                        }
                        title={`Play ${item.chord.label} keyboard voicing`}
                        aria-label={`Play ${item.chord.label} keyboard voicing`}
                        className="screen-only inline-flex h-6 w-6 items-center justify-center rounded-md text-[#6f675c] transition hover:bg-[#f1ece3] hover:text-[#c84b36] cursor-pointer"
                      >
                        <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>

                    {voicings.length > 1 ? (
                      <div className="screen-only mt-1 w-full max-w-[155px]">
                        <select
                          value={voicing.id}
                          onChange={(e) => onSelectPianoVoicing(item.key, e.target.value)}
                          aria-label={`Keyboard voicing for ${item.chord.label}`}
                          className="w-full truncate rounded-md border border-[#dcd3c6] bg-[#f8f2e8] px-2 py-1 text-[11px] font-medium text-[#211f1b] cursor-pointer"
                        >
                          {voicings.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="screen-spacer h-[26px]" aria-hidden="true" />
                    )}

                    <p className="mt-1 text-[10.5px] leading-snug text-[#6f675c]">{noteLabels}</p>
                    <p className="font-mono-tabular text-[10.5px] font-medium text-[#4a463f]">
                      {state.pianoHand === 'left' ? 'LH' : 'RH'}: {voicing.fingerText}
                    </p>
                  </article>
                );
              })}
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (state.showUkulele) {
    activeSections.push(
      <section key="ukulele" className="diagram-section mt-5" aria-labelledby="ukuleleHeading">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="ukuleleHeading" className="font-display text-lg font-bold tracking-tight text-[#211f1b]">
            Ukulele (G–C–E–A)
          </h2>
          <span className="text-[11px] text-[#6f675c]">
            Standard tuning · click play or pick a voicing
          </span>
        </div>

        <div className="space-y-4">
          {rowsOfChords.map((chunk, chunkIdx) => (
            <div
              key={`u-chunk-${chunkIdx}`}
              className="chord-grid"
              style={{ '--cols': gridCols } as React.CSSProperties}
            >
              {chunk.map((item) => {
                if (item.noChord) {
                  return (
                    <article
                      key={`u-${item.key}`}
                      className="chord-card flex flex-col items-center text-center"
                      aria-label="Empty ukulele fretboard for a bar with no chord"
                    >
                      <h3 className="mb-1 text-base font-bold text-[#211f1b] opacity-0" aria-hidden="true">
                        NC
                      </h3>
                      <div className="w-full max-w-[125px]">
                        <UkuleleDiagramSVG shape={null} chord={null} />
                      </div>
                      <div className="screen-spacer h-[28px]" aria-hidden="true" />
                      <p className="text-[10.5px] text-[#6f675c]" aria-hidden="true">
                        &nbsp;
                      </p>
                    </article>
                  );
                }

                if (!item.chord) {
                  return (
                    <article
                      key={`u-${item.key}`}
                      className="chord-card flex flex-col items-center rounded-lg border border-dashed border-[#c84b36]/50 p-2 text-center"
                    >
                      <h3 className="mb-2 text-base font-bold text-[#c84b36]">{item.raw}</h3>
                      <span className="text-xs text-[#6f675c]">Unknown chord</span>
                    </article>
                  );
                }

                const displayChord =
                  state.capo > 0 && state.showCapoShapes
                    ? transposeChord(item.chord, -state.capo)
                    : item.chord;
                const voicings = getUkuleleVoicings(displayChord);
                const selectedId = state.ukuleleVoicings[item.key];
                const voicing = voicings.find((v) => v.id === selectedId) || voicings[0];
                const noteLabels = item.chord.notes.map(enharmonicLabel).join(' · ');

                if (!voicing) return null;

                return (
                  <article
                    key={`u-${item.key}`}
                    className="chord-card flex flex-col items-center text-center"
                  >
                    <div className="mb-0.5 flex items-center justify-center gap-1.5">
                      <h3 className="text-base font-bold tracking-tight text-[#211f1b]">
                        {displayChord.label}
                      </h3>
                      <button
                        type="button"
                        onClick={() =>
                          playStrumMidi(
                            ukuleleShapeToMidi(voicing.shape),
                            1.4,
                            0.026,
                            3000,
                            'acoustic_guitar_nylon',
                            state.soundfontKit
                          )
                        }
                        title={`Play ${item.chord.label} ukulele voicing`}
                        aria-label={`Play ${item.chord.label} ukulele voicing`}
                        className="screen-only inline-flex h-6 w-6 items-center justify-center rounded-md text-[#6f675c] transition hover:bg-[#f1ece3] hover:text-[#c84b36] cursor-pointer"
                      >
                        <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="w-full max-w-[125px]">
                      <UkuleleDiagramSVG shape={voicing.shape} chord={displayChord} />
                    </div>

                    {voicings.length > 1 ? (
                      <div className="screen-only mt-1 w-full max-w-[130px]">
                        <select
                          value={voicing.id}
                          onChange={(e) => onSelectUkuleleVoicing(item.key, e.target.value)}
                          aria-label={`Ukulele voicing for ${item.chord.label}`}
                          className="w-full truncate rounded-md border border-[#dcd3c6] bg-[#f8f2e8] px-2 py-1 text-[11px] font-medium text-[#211f1b] cursor-pointer"
                        >
                          {voicings.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="screen-spacer h-[28px]" aria-hidden="true" />
                    )}

                    <p className="mt-1 text-[10.5px] leading-snug text-[#6f675c]">{noteLabels}</p>
                  </article>
                );
              })}
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div
      ref={paperRef}
      className="paper-sheet mx-auto flex min-h-[295mm] w-full max-w-[210mm] flex-col justify-between rounded-sm px-6 py-8 sm:px-11 sm:py-10"
      style={{ '--print-zoom': printZoom.toFixed(3) } as React.CSSProperties}
    >
      <div className="sheet-body">
        <header className="border-b border-[#211f1b] pb-3.5">
          <h1 className="font-display text-3xl font-bold tracking-tight text-[#211f1b] sm:text-4xl [text-wrap:balance]">
            {title}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-[#6f675c] tabular-nums">
            {metaParts.map((part, idx) => (
              <React.Fragment key={part}>
                {idx > 0 && <span aria-hidden="true">·</span>}
                <span>{part}</span>
              </React.Fragment>
            ))}
          </div>
        </header>

        {!uniqueChords.length && !visibleRows.length ? (
          <div className="my-16 flex flex-col items-center justify-center text-center">
            <span className="font-display text-5xl font-bold text-[#dcd3c6]" aria-hidden="true">
              G
            </span>
            <h2 className="mt-3 font-display text-xl font-semibold text-[#211f1b]">
              Your chart will appear here
            </h2>
            <p className="mt-1 max-w-md text-sm text-[#6f675c]">{emptyMessage}</p>
          </div>
        ) : (
          <>
            {activeSections.map((section, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <div className="sheet-rule my-5 border-t border-[#dcd3c6]" aria-hidden="true" />}
                {section}
              </React.Fragment>
            ))}

            {state.showProgression && visibleRows.length > 0 && (
              <section className="progression-section mt-6" aria-labelledby="progressionHeading">
                <h2
                  id="progressionHeading"
                  className="mb-2.5 font-display text-lg font-bold tracking-tight text-[#211f1b]"
                >
                  Chord Progression
                </h2>
                <table className="progression-table">
                  <tbody>
                    {visibleRows.map((row) => (
                      <tr key={row.id}>
                        {hasRowLabels && (
                          <th scope="row" className="row-label-cell">
                            {row.label}
                          </th>
                        )}
                        {Array.from({ length: maxCols }).map((_, colIdx) => {
                          const raw = row.slots[colIdx] || '';
                          const parsed = parseBarCell(raw);
                          const isPlaying =
                            activePlaybackCell?.rowIdx === row.originalRowIdx &&
                            activePlaybackCell?.colIdx === colIdx;

                          let cellDisplay: React.ReactNode = '';
                          if (parsed.kind === 'nc') {
                            cellDisplay = '';
                          } else if (parsed.kind === 'repeat') {
                            cellDisplay = <span className="text-base font-bold text-[#4a463f]">%</span>;
                          } else if (parsed.kind === 'chords') {
                            cellDisplay = parsed.chords.map((c) => c.label).join('  /  ');
                          } else if (parsed.kind === 'invalid') {
                            cellDisplay = <span className="text-[#c84b36]">{raw}</span>;
                          }

                          return (
                            <td
                              key={`cell-${row.id}-${colIdx}`}
                              className={`text-sm font-bold tracking-tight text-[#211f1b] transition-colors ${
                                isPlaying ? 'bg-[#c84b36]/15 text-[#a53625]' : ''
                              }`}
                            >
                              {cellDisplay}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </>
        )}
      </div>

      <footer className="sheet-footer mt-8 flex items-center justify-center gap-2 border-t border-[#dcd3c6] pt-3 text-[11px] text-[#6f675c]">
        <span>Created by Ray Foo</span>
        <span aria-hidden="true">·</span>
        <a
          href="https://www.rayfooproductions.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#c84b36]"
        >
          www.rayfooproductions.com
        </a>
      </footer>
    </div>
  );
};
