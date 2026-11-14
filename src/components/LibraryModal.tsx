import React, { useRef, useState } from 'react';
import { Download, FolderOpen, Plus, RotateCcw, Trash2, Upload, X } from 'lucide-react';
import type { SavedChart, SheetState } from '../types';

interface LibraryModalProps {
  open: boolean;
  charts: SavedChart[];
  currentState: SheetState;
  onSaveNew: (title: string) => void;
  onLoadChart: (chart: SavedChart) => void;
  onDeleteChart: (id: string) => void;
  onImportState: (state: unknown) => void;
  onResetExample: () => void;
  onClose: () => void;
}

export const LibraryModal: React.FC<LibraryModalProps> = ({
  open,
  charts,
  currentState,
  onSaveNew,
  onLoadChart,
  onDeleteChart,
  onImportState,
  onResetExample,
  onClose,
}) => {
  const [saveTitle, setSaveTitle] = useState(currentState.title || 'Untitled Song');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  if (!open) return null;

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(currentState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (currentState.title || 'chord-sheet')
      .trim()
      .replace(/[^\w\- ]+/g, '')
      .replace(/\s+/g, '-');
    a.href = url;
    a.download = `${safeName || 'chord-sheet'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ''));
        onImportState(parsed);
        onClose();
      } catch {
        setImportError('Could not read that JSON file. Please choose an exported Chord Sheet Studio file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="library-modal-title"
    >
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-xl border border-[#dcd3c6] bg-[#fffdf8] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#dcd3c6] px-6 py-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-[#c84b36]">Chart Library</p>
            <h2 id="library-modal-title" className="font-display text-xl font-semibold text-[#211f1b]">
              Saved charts &amp; backup
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chart library"
            className="rounded-lg p-1.5 text-[#6f675c] hover:bg-[#f1ece3] hover:text-[#211f1b] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Save current sheet */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSaveNew(saveTitle.trim() || 'Untitled Song');
            }}
            className="space-y-2"
          >
            <label htmlFor="save-chart-name" className="block text-xs font-semibold text-[#4a463f]">
              Save current sheet to browser library
            </label>
            <div className="flex gap-2">
              <input
                id="save-chart-name"
                type="text"
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                maxLength={80}
                className="flex-1 rounded-lg border border-[#b9ae9e] bg-white px-3 py-2 text-sm text-[#211f1b]"
                placeholder="Song title"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#211f1b] px-4 py-2 text-xs font-semibold text-[#fffdf8] transition hover:bg-[#38342d] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Save
              </button>
            </div>
          </form>

          {/* Saved list */}
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[#4a463f]">
                Saved charts ({charts.length})
              </h3>
            </div>

            {charts.length === 0 ? (
              <p className="mt-2 rounded-lg border border-dashed border-[#dcd3c6] bg-[#f8f2e8]/60 px-4 py-5 text-center text-xs text-[#6f675c]">
                No saved charts yet. Save your active sheet above to keep multiple songs ready for class.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-[#dcd3c6] rounded-lg border border-[#dcd3c6] bg-white">
                {charts.map((chart) => (
                  <li key={chart.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#211f1b]">{chart.title}</p>
                      <p className="text-xs text-[#6f675c] tabular-nums">
                        {chart.state.keyLabel ? `Key ${chart.state.keyLabel} · ` : ''}
                        {chart.state.rows.length} rows · {new Date(chart.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onLoadChart(chart);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md border border-[#b9ae9e] bg-[#fffdf8] px-2.5 py-1.5 text-xs font-semibold text-[#211f1b] hover:bg-[#f8f2e8] cursor-pointer"
                      >
                        <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteChart(chart.id)}
                        aria-label={`Delete ${chart.title}`}
                        className="rounded-md p-1.5 text-[#6f675c] hover:bg-red-50 hover:text-[#c84b36] cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* File export / import */}
          <div className="border-t border-[#dcd3c6] pt-4">
            <h3 className="text-xs font-semibold text-[#4a463f]">Backup &amp; transfer</h3>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#b9ae9e] bg-[#fffdf8] px-3.5 py-2 text-xs font-semibold text-[#211f1b] hover:bg-[#f8f2e8] cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Export JSON
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#b9ae9e] bg-[#fffdf8] px-3.5 py-2 text-xs font-semibold text-[#211f1b] hover:bg-[#f8f2e8] cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                Import JSON
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetExample();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#dcd3c6] px-3.5 py-2 text-xs font-semibold text-[#6f675c] hover:bg-[#f1ece3] hover:text-[#211f1b] cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Reset example
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            {importError && <p className="mt-2 text-xs font-medium text-[#c84b36]">{importError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
