'use client';

import React from 'react';
import { WifiOff, Database } from 'lucide-react';
import { ConnectionStatus } from '@/types/presence';

interface OfflineBannerProps {
  status: ConnectionStatus;
  isIndexedDbSynced: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  status,
  isIndexedDbSynced,
}) => {
  if (status !== 'offline') return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-surface-900/95 backdrop-blur-md border border-rose-500/30 text-rose-300 shadow-popover animate-fade-in text-xs pointer-events-none select-none">
      <WifiOff className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
      <span>Working Offline</span>
      <span className="w-1 h-1 rounded-full bg-rose-500/40" />
      <span className="text-[11px] text-surface-200/60 flex items-center gap-1">
        <Database className="w-3 h-3 text-emerald-400" />
        Saved locally to IndexedDB
      </span>
    </div>
  );
};
