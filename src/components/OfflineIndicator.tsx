import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="no-print fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-[#b9ae9e] bg-[#211f1b] px-3.5 py-2 text-xs font-medium text-[#fffdf8] shadow-lg"
    >
      <WifiOff className="h-3.5 w-3.5 text-[#e88a78]" aria-hidden="true" />
      <span>Offline Mode — Cached charts available</span>
    </div>
  );
};
