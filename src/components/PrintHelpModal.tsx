import React from 'react';
import { Download, Share2, X } from 'lucide-react';

interface PrintHelpModalProps {
  open: boolean;
  previewUrl: string | null;
  pdfUrl: string | null;
  fileName: string;
  onShare: () => void;
  onClose: () => void;
}

export const PrintHelpModal: React.FC<PrintHelpModalProps> = ({
  open,
  previewUrl,
  pdfUrl,
  fileName,
  onShare,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-help-title"
    >
      <div className="w-full max-w-md rounded-xl border border-[#dcd3c6] bg-[#fffdf8] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-[#c84b36]">iPad Home Screen PDF</p>
            <h2 id="print-help-title" className="font-display text-xl font-semibold text-[#211f1b]">
              Your printable A4 PDF is ready
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close print dialog"
            className="rounded-lg p-1.5 text-[#6f675c] hover:bg-[#f1ece3] hover:text-[#211f1b] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-sm text-[#4a463f]">
          Home Screen apps on iPadOS print via a generated A4 PDF. Tap <strong>Share / Print PDF</strong> to open
          AirPrint or Save to Files, or tap <strong>Download PDF</strong>.
        </p>

        {previewUrl && (
          <div className="mt-4 overflow-hidden rounded-lg border border-[#dcd3c6] bg-[#f8f2e8] p-2">
            <img
              src={previewUrl}
              alt="Preview of the printable A4 chord sheet"
              className="mx-auto max-h-64 w-auto rounded border border-[#dcd3c6] object-contain"
            />
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onShare}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#c84b36] px-4 py-2.5 text-xs font-semibold text-[#fffdf8] transition hover:bg-[#a53625] cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
            Share / Print PDF
          </button>

          {pdfUrl && (
            <a
              href={pdfUrl}
              download={fileName}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#b9ae9e] bg-[#fffdf8] px-4 py-2.5 text-xs font-semibold text-[#211f1b] transition hover:bg-[#f8f2e8]"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Download PDF
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
