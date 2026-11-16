import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react';

const BASE_URL = import.meta.env.BASE_URL;

interface Chapter {
  page: number;
  short: string;
  title: string;
}

const CHAPTERS: Chapter[] = [
  { page: 1, short: 'Cover', title: 'Cover & Directory' },
  { page: 2, short: 'Workspace', title: 'Workspace Tour & A4 Sheet Anatomy' },
  { page: 3, short: 'Progression', title: 'Bar Grid Syntax & Supported Chord Qualities' },
  { page: 4, short: 'Voicings', title: 'Guitar, Keyboard & Ukulele Voicings' },
  { page: 5, short: 'Harmony', title: 'Transposition, Key Detection & Capo' },
  { page: 6, short: 'Audio', title: 'Audio Playback, SoundFonts & Metronome' },
  { page: 7, short: 'Drums', title: 'Built-In Drum Machine & Groove Guide' },
  { page: 8, short: 'Save & Share', title: 'Saving, Sharing, Offline PWA & PDF Print' },
];

const PAGE_COUNT = CHAPTERS.length;

function pageImage(page: number): string {
  return `${BASE_URL}manual/page-${String(page).padStart(2, '0')}.webp`;
}

interface ManualModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * In-app reference manual viewer. Pages are pre-rendered WebP images so the
 * manual works offline through the service worker, and the full PDF stays
 * available as a download.
 */
export const ManualModal: React.FC<ManualModalProps> = ({ open, onClose }) => {
  const [page, setPage] = useState(1);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const go = useCallback((next: number) => {
    setPage(Math.min(PAGE_COUNT, Math.max(1, next)));
  }, []);

  // Start from the cover each time the manual is opened.
  useEffect(() => {
    if (open) setPage(1);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') setPage((prev) => Math.min(PAGE_COUNT, prev + 1));
      if (event.key === 'ArrowLeft') setPage((prev) => Math.max(1, prev - 1));
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  // Reset scroll and warm up the next page.
  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: 0 });
    if (page < PAGE_COUNT) {
      const image = new Image();
      image.src = pageImage(page + 1);
    }
  }, [open, page]);

  if (!open) return null;

  const chapter = CHAPTERS[page - 1];

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-title"
    >
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[#dcd3c6] bg-[#fffdf8] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#dcd3c6] px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-wide text-[#c84b36]">
              Reference Manual · {PAGE_COUNT} pages
            </p>
            <h2
              id="manual-title"
              className="truncate font-display text-lg font-semibold text-[#211f1b] sm:text-xl"
            >
              Chord Sheet Studio Handbook
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`${BASE_URL}manual/chord-sheet-studio-manual.pdf`}
              download="Chord-Sheet-Studio-Manual.pdf"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#b9ae9e] bg-[#fffdf8] px-3 py-2 text-xs font-semibold text-[#211f1b] transition hover:bg-[#f8f2e8] whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Download PDF</span>
            </a>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close manual"
              className="rounded-lg p-2 text-[#6f675c] transition hover:bg-[#f1ece3] hover:text-[#211f1b] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto border-b border-[#dcd3c6] bg-[#f8f2e8]/70 px-3 py-2 sm:px-4">
          {CHAPTERS.map((entry) => (
            <button
              key={entry.page}
              type="button"
              onClick={() => go(entry.page)}
              aria-current={entry.page === page ? 'page' : undefined}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition cursor-pointer ${
                entry.page === page
                  ? 'bg-[#211f1b] text-[#fffdf8]'
                  : 'border border-[#dcd3c6] bg-[#fffdf8] text-[#4a463f] hover:bg-[#f1ece3]'
              }`}
            >
              <span className="tabular-nums opacity-70">{String(entry.page).padStart(2, '0')}</span>
              {entry.short}
            </button>
          ))}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[#f1ece3] px-3 py-4 sm:px-6 sm:py-6">
          <img
            src={pageImage(page)}
            alt={`Manual page ${page} of ${PAGE_COUNT}: ${chapter.title}`}
            className="mx-auto block w-full max-w-[840px] rounded-md border border-[#dcd3c6] bg-white shadow-lg"
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#dcd3c6] px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => go(page - 1)}
            disabled={page === 1}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#b9ae9e] bg-[#fffdf8] px-3 py-2 text-xs font-semibold text-[#211f1b] transition hover:bg-[#f8f2e8] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Previous
          </button>

          <p className="min-w-0 truncate text-center text-[11px] text-[#6f675c]">
            <span className="font-semibold tabular-nums text-[#211f1b]">
              Page {String(page).padStart(2, '0')} / {String(PAGE_COUNT).padStart(2, '0')}
            </span>
            <span className="hidden sm:inline"> · {chapter.title}</span>
          </p>

          <button
            type="button"
            onClick={() => go(page + 1)}
            disabled={page === PAGE_COUNT}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#b9ae9e] bg-[#fffdf8] px-3 py-2 text-xs font-semibold text-[#211f1b] transition hover:bg-[#f8f2e8] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
