import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileJson, FileText, Image as ImageIcon, Loader2, Upload } from 'lucide-react';

interface SaveMenuProps {
  busy: 'pdf' | 'png' | null;
  onSavePdf: () => void;
  onSavePng: () => void;
  onSaveJson: () => void;
  onOpenJson: (file: File) => void;
}

/**
 * Header "Save" dropdown: downloads the A4 sheet as a PDF or PNG, saves the
 * project as a .json file, and re-opens a previously saved .json project.
 */
export const SaveMenu: React.FC<SaveMenuProps> = ({
  busy,
  onSavePdf,
  onSavePng,
  onSaveJson,
  onOpenJson,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  const itemClass =
    'flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition hover:bg-[#f8f2e8] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Save chord sheet to a file"
        className="inline-flex items-center gap-2 rounded-lg border border-[#b9ae9e] bg-[#fffdf8] px-3 py-2 text-xs font-semibold text-[#211f1b] shadow-sm transition hover:bg-[#f8f2e8] whitespace-nowrap shrink-0 cursor-pointer"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="h-4 w-4" aria-hidden="true" />
        )}
        <span className="hidden sm:inline">{busy === 'pdf' ? 'Preparing PDF…' : busy === 'png' ? 'Preparing PNG…' : 'Save'}</span>
        <ChevronDown className="h-3.5 w-3.5 text-[#6f675c]" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Save chord sheet"
          className="absolute right-0 z-40 mt-2 w-72 rounded-xl border border-[#dcd3c6] bg-[#fffdf8] p-1.5 shadow-2xl"
        >
          <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#8a7f70]">
            Save to file
          </p>

          <button
            type="button"
            role="menuitem"
            onClick={() => run(onSavePdf)}
            disabled={busy !== null}
            className={itemClass}
          >
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#c84b36]" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-[#211f1b]">Download PDF</span>
              <span className="block text-[11px] leading-snug text-[#6f675c]">
                A4 sheet file, ready to print or share
              </span>
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => run(onSavePng)}
            disabled={busy !== null}
            className={itemClass}
          >
            <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#c84b36]" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-[#211f1b]">Download PNG</span>
              <span className="block text-[11px] leading-snug text-[#6f675c]">
                High-resolution image for chats and slides
              </span>
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => run(onSaveJson)}
            disabled={busy !== null}
            className={itemClass}
          >
            <FileJson className="mt-0.5 h-4 w-4 shrink-0 text-[#c84b36]" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-[#211f1b]">Save project (.json)</span>
              <span className="block text-[11px] leading-snug text-[#6f675c]">
                Keep every setting so you can edit it later
              </span>
            </span>
          </button>

          <div className="my-1 border-t border-[#dcd3c6]" role="separator" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              fileInputRef.current?.click();
            }}
            className={itemClass}
          >
            <Upload className="mt-0.5 h-4 w-4 shrink-0 text-[#6f675c]" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-[#211f1b]">Open project (.json)</span>
              <span className="block text-[11px] leading-snug text-[#6f675c]">
                Load a chord sheet file from this device
              </span>
            </span>
          </button>
        </div>
      )}

      {/* Kept mounted so the change event still fires after the menu closes. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) onOpenJson(file);
        }}
      />
    </div>
  );
};
