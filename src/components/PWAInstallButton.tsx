import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="inline-flex items-center gap-2 rounded-lg border border-[#b9ae9e] bg-[#fffdf8] px-3.5 py-2 text-xs font-semibold text-[#211f1b] transition hover:bg-[#f8f2e8] whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        Install App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-[#b9ae9e] bg-[#fffdf8] px-3.5 py-2 text-xs font-semibold text-[#211f1b] transition hover:bg-[#f8f2e8] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
          Install on iPad
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="w-full max-w-sm rounded-xl border border-[#dcd3c6] bg-[#fffdf8] p-6 shadow-xl">
              <h3 id="ios-install-title" className="font-display text-lg font-semibold text-[#211f1b]">
                Install Chord Sheet Studio
              </h3>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[#4a463f]">
                <li>
                  Tap the <strong>Share</strong> button in Safari&apos;s toolbar.
                </li>
                <li>
                  Scroll down and tap <strong>Add to Home Screen</strong> for full offline classroom access.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-lg bg-[#211f1b] py-2.5 text-xs font-semibold text-[#fffdf8] transition hover:bg-[#3a3630] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
