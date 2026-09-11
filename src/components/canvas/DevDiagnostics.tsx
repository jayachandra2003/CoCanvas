'use client';

import React, { useState } from 'react';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { ConnectionStatus } from '@/types/presence';

interface DevDiagnosticsProps {
  roomId: string;
  clientId: number;
  peerCount: number;
  status: ConnectionStatus;
}

export const DevDiagnostics: React.FC<DevDiagnosticsProps> = ({
  roomId,
  clientId,
  peerCount,
  status,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end pointer-events-auto select-none font-mono text-[11px]">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-900/90 backdrop-blur-md border border-border-muted text-surface-200/80 hover:text-surface-100 hover:bg-surface-850 shadow-dock transition-colors"
      >
        <Activity className={`w-3.5 h-3.5 ${status === 'connected' ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`} />
        <span className="font-semibold">P2P: {status}</span>
        <span className="text-surface-200/40">|</span>
        <span>{peerCount} {peerCount === 1 ? 'client' : 'clients'}</span>
        {isExpanded ? <ChevronDown className="w-3 h-3 ml-0.5" /> : <ChevronUp className="w-3 h-3 ml-0.5" />}
      </button>

      {isExpanded && (
        <div className="mt-2 p-3 rounded-xl bg-surface-900/95 backdrop-blur-md border border-border-muted shadow-popover w-64 space-y-1.5 text-surface-200/80 animate-fade-in">
          <div className="flex justify-between">
            <span className="text-surface-200/50">Room:</span>
            <span className="text-accent-blue truncate max-w-[140px]">{roomId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-200/50">Client ID:</span>
            <span className="text-surface-100">{clientId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-200/50">Transport:</span>
            <span className="text-emerald-400">WebRTC DataChannel</span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-200/50">Signaling:</span>
            <span className="text-surface-100 truncate max-w-[130px]">fly.dev + local</span>
          </div>
        </div>
      )}
    </div>
  );
};
