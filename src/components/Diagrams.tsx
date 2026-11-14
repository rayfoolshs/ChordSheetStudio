import React from 'react';
import type { FretShape, HandSide, ParsedChord, PianoVoicing } from '../types';

interface GuitarDiagramProps {
  shape: FretShape | null;
  chord: ParsedChord | null;
  hand: HandSide;
}

export const GuitarDiagramSVG: React.FC<GuitarDiagramProps> = ({ shape, chord, hand }) => {
  const width = 170;
  const height = 192;
  const left = 30;
  const right = 148;
  const top = 31;
  const bottom = 164;
  const fretCount = 5;
  const gap = (bottom - top) / fretCount;
  const stringGap = (right - left) / 5;
  const blank = !shape;
  const baseFret = blank ? 1 : shape.baseFret || 1;
  const isLeft = hand === 'left';

  const visualIndex = (stringIdx: number) => (isLeft ? 5 - stringIdx : stringIdx);
  const stringX = (stringIdx: number) => left + visualIndex(stringIdx) * stringGap;
  const fretY = (fret: number) => top + (fret - baseFret + 0.5) * gap;

  const ariaLabel = blank
    ? 'Empty guitar fretboard for a bar with no chord'
    : `${chord?.label || ''} guitar chord diagram (${isLeft ? 'left-handed' : 'right-handed'}). Frets ${shape.frets.join(
        ','
      )}. Fingering ${shape.fingers.join(',')}.`;

  return (
    <svg className="block w-full h-auto" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
      {[0, 1, 2, 3, 4, 5].map((s) => {
        const x = stringX(s);
        const thickness = s === 0 ? 1.7 : s === 5 ? 0.9 : 1.15;
        return (
          <line
            key={`str-${s}`}
            x1={x}
            y1={top}
            x2={x}
            y2={bottom}
            stroke="#1e1d1a"
            strokeWidth={thickness}
          />
        );
      })}

      {Array.from({ length: fretCount + 1 }).map((_, fretLine) => {
        const y = top + fretLine * gap;
        const isNut = fretLine === 0 && baseFret === 1;
        return (
          <line
            key={`fret-${fretLine}`}
            x1={left}
            y1={y}
            x2={right}
            y2={y}
            stroke="#1e1d1a"
            strokeWidth={isNut ? 4.2 : 1.1}
            strokeLinecap={isNut ? 'round' : undefined}
          />
        );
      })}

      {!blank && shape && (
        <>
          {baseFret > 1 && (
            <text
              x={left - 7}
              y={top + gap * 0.5 + 3.2}
              textAnchor="end"
              fill="#4a463f"
              fontSize="10"
              fontWeight="700"
              fontFamily="IBM Plex Mono, monospace"
            >
              {baseFret}fr
            </text>
          )}

          {shape.frets.map((fret, s) => {
            const x = stringX(s);
            if (fret === -1) {
              return (
                <g key={`mk-${s}`} stroke="#1e1d1a" strokeWidth="1.6" strokeLinecap="round">
                  <line x1={x - 4.4} y1={11.6} x2={x + 4.4} y2={20.4} />
                  <line x1={x + 4.4} y1={11.6} x2={x - 4.4} y2={20.4} />
                </g>
              );
            }
            if (fret === 0) {
              return (
                <circle
                  key={`mk-${s}`}
                  cx={x}
                  cy={16}
                  r={4.7}
                  fill="#fffdf8"
                  stroke="#1e1d1a"
                  strokeWidth={1.5}
                />
              );
            }
            return null;
          })}

          {shape.barre && (() => {
            const y = fretY(shape.barre.fret);
            const xa = stringX(shape.barre.from);
            const xb = stringX(shape.barre.to);
            const x1 = Math.min(xa, xb) - 7;
            const x2 = Math.max(xa, xb) + 7;
            return (
              <g>
                <rect x={x1} y={y - 8} width={x2 - x1} height={16} rx={8} fill="#1e1d1a" />
                <text
                  x={(x1 + x2) / 2}
                  y={y + 3.5}
                  textAnchor="middle"
                  fill="#fffdf8"
                  fontSize="10"
                  fontWeight="700"
                >
                  {shape.barre.finger || 1}
                </text>
              </g>
            );
          })()}

          {shape.frets.map((fret, s) => {
            if (fret <= 0) return null;
            if (
              shape.barre &&
              s >= shape.barre.from &&
              s <= shape.barre.to &&
              fret === shape.barre.fret
            ) {
              return null;
            }
            const x = stringX(s);
            const y = fretY(fret);
            return (
              <g key={`dot-${s}`}>
                <circle cx={x} cy={y} r={9.2} fill="#fffdf8" stroke="#1e1d1a" strokeWidth={1.5} />
                {shape.fingers[s] > 0 && (
                  <text
                    x={x}
                    y={y + 3.5}
                    textAnchor="middle"
                    fill="#1e1d1a"
                    fontSize="10"
                    fontWeight="700"
                  >
                    {shape.fingers[s]}
                  </text>
                )}
              </g>
            );
          })}
        </>
      )}
    </svg>
  );
};

interface UkuleleDiagramProps {
  shape: FretShape | null;
  chord: ParsedChord | null;
}

export const UkuleleDiagramSVG: React.FC<UkuleleDiagramProps> = ({ shape, chord }) => {
  const width = 152;
  const height = 186;
  const left = 34;
  const right = 124;
  const top = 31;
  const bottom = 160;
  const fretCount = 5;
  const gap = (bottom - top) / fretCount;
  const stringGap = (right - left) / 3;
  const blank = !shape;
  const baseFret = blank ? 1 : shape.baseFret || 1;

  const stringX = (s: number) => left + s * stringGap;
  const fretY = (fret: number) => top + (fret - baseFret + 0.5) * gap;

  const ariaLabel = blank
    ? 'Empty ukulele fretboard for a bar with no chord'
    : `${chord?.label || ''} ukulele chord diagram. Frets ${shape.frets.join(',')}.`;

  return (
    <svg className="block w-full h-auto" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
      {[0, 1, 2, 3].map((s) => (
        <line
          key={`ustr-${s}`}
          x1={stringX(s)}
          y1={top}
          x2={stringX(s)}
          y2={bottom}
          stroke="#1e1d1a"
          strokeWidth={1.2}
        />
      ))}

      {Array.from({ length: fretCount + 1 }).map((_, fretLine) => {
        const y = top + fretLine * gap;
        const isNut = fretLine === 0 && baseFret === 1;
        return (
          <line
            key={`ufret-${fretLine}`}
            x1={left}
            y1={y}
            x2={right}
            y2={y}
            stroke="#1e1d1a"
            strokeWidth={isNut ? 4.2 : 1.1}
            strokeLinecap={isNut ? 'round' : undefined}
          />
        );
      })}

      {!blank && shape && (
        <>
          {baseFret > 1 && (
            <text
              x={left - 7}
              y={top + gap * 0.5 + 3.2}
              textAnchor="end"
              fill="#4a463f"
              fontSize="10"
              fontWeight="700"
              fontFamily="IBM Plex Mono, monospace"
            >
              {baseFret}fr
            </text>
          )}

          {shape.frets.map((fret, s) => {
            const x = stringX(s);
            if (fret === -1) {
              return (
                <g key={`umk-${s}`} stroke="#1e1d1a" strokeWidth="1.6" strokeLinecap="round">
                  <line x1={x - 4.2} y1={11.8} x2={x + 4.2} y2={20.2} />
                  <line x1={x + 4.2} y1={11.8} x2={x - 4.2} y2={20.2} />
                </g>
              );
            }
            if (fret === 0) {
              return (
                <circle
                  key={`umk-${s}`}
                  cx={x}
                  cy={16}
                  r={4.5}
                  fill="#fffdf8"
                  stroke="#1e1d1a"
                  strokeWidth={1.5}
                />
              );
            }
            return null;
          })}

          {shape.barre && (() => {
            const y = fretY(shape.barre.fret);
            const x1 = stringX(shape.barre.from) - 7;
            const x2 = stringX(shape.barre.to) + 7;
            return (
              <g>
                <rect x={x1} y={y - 8} width={x2 - x1} height={16} rx={8} fill="#1e1d1a" />
                <text
                  x={(x1 + x2) / 2}
                  y={y + 3.5}
                  textAnchor="middle"
                  fill="#fffdf8"
                  fontSize="10"
                  fontWeight="700"
                >
                  {shape.barre.finger || 1}
                </text>
              </g>
            );
          })()}

          {shape.frets.map((fret, s) => {
            if (fret <= 0) return null;
            if (
              shape.barre &&
              s >= shape.barre.from &&
              s <= shape.barre.to &&
              fret === shape.barre.fret
            ) {
              return null;
            }
            const x = stringX(s);
            const y = fretY(fret);
            return (
              <g key={`udot-${s}`}>
                <circle cx={x} cy={y} r={9} fill="#fffdf8" stroke="#1e1d1a" strokeWidth={1.5} />
                {shape.fingers[s] > 0 && (
                  <text
                    x={x}
                    y={y + 3.5}
                    textAnchor="middle"
                    fill="#1e1d1a"
                    fontSize="10"
                    fontWeight="700"
                  >
                    {shape.fingers[s]}
                  </text>
                )}
              </g>
            );
          })}
        </>
      )}
    </svg>
  );
};

interface PianoDiagramProps {
  voicing: PianoVoicing | null;
  chord: ParsedChord | null;
}

// 2 full octaves: C4 (60) through B5 (83) -> 14 white keys, 10 black keys
const WHITE_MIDI = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83];
const BLACK_KEYS = [
  { after: 0, midi: 61 },
  { after: 1, midi: 63 },
  { after: 3, midi: 66 },
  { after: 4, midi: 68 },
  { after: 5, midi: 70 },
  { after: 7, midi: 73 },
  { after: 8, midi: 75 },
  { after: 10, midi: 78 },
  { after: 11, midi: 80 },
  { after: 12, midi: 82 },
];

export const PianoDiagramSVG: React.FC<PianoDiagramProps> = ({ voicing, chord }) => {
  const width = 308;
  const height = 116;
  const keyTop = 8;
  const keyHeight = 96;
  const whiteWidth = width / WHITE_MIDI.length;
  const blackWidth = 12.6;
  const blackHeight = 57;

  const noteByMidi = new Map(voicing ? voicing.notes.map((n) => [n.midi, n]) : []);

  const ariaLabel = voicing
    ? `${chord?.label || ''} keyboard chord (${voicing.label}). Notes ${voicing.noteText}. ${
        voicing.hand === 'left' ? 'Left' : 'Right'
      }-hand fingering ${voicing.fingerText}.`
    : 'Empty keyboard for a bar with no chord';

  return (
    <svg className="block w-full h-auto" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
      {WHITE_MIDI.map((midi, index) => (
        <rect
          key={`wk-${midi}`}
          x={index * whiteWidth + 0.5}
          y={keyTop}
          width={whiteWidth - 1}
          height={keyHeight}
          rx={2.2}
          fill="#fffdf8"
          stroke="#817d73"
          strokeWidth={1}
        />
      ))}

      {BLACK_KEYS.map((key) => (
        <rect
          key={`bk-${key.midi}`}
          x={(key.after + 1) * whiteWidth - blackWidth / 2}
          y={keyTop}
          width={blackWidth}
          height={blackHeight}
          rx={1.8}
          fill="#1e1d1a"
        />
      ))}

      {WHITE_MIDI.map((midi, index) => {
        const note = noteByMidi.get(midi);
        if (!note) return null;
        const x = index * whiteWidth + whiteWidth / 2;
        const y = 82;
        return (
          <g key={`wn-${midi}`}>
            <circle cx={x} cy={y} r={8.0} fill="#c84b36" stroke="#fffdf8" strokeWidth={1.4} />
            <text
              x={x}
              y={y + 3.4}
              textAnchor="middle"
              fill="#fffdf8"
              fontSize="9.5"
              fontWeight="700"
            >
              {note.finger}
            </text>
          </g>
        );
      })}

      {BLACK_KEYS.map((key) => {
        const note = noteByMidi.get(key.midi);
        if (!note) return null;
        const x = (key.after + 1) * whiteWidth;
        const y = 41;
        return (
          <g key={`bn-${key.midi}`}>
            <circle cx={x} cy={y} r={7.2} fill="#c84b36" stroke="#fffdf8" strokeWidth={1.3} />
            <text
              x={x}
              y={y + 3.2}
              textAnchor="middle"
              fill="#fffdf8"
              fontSize="9"
              fontWeight="700"
            >
              {note.finger}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
