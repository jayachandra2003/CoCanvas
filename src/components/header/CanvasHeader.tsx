'use client';

import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Download,
  Maximize2,
  Wifi,
  WifiOff,
  Users,
} from 'lucide-react';
import { ViewportTransform } from '@/types/canvas';
import { PeerAwarenessState, ConnectionStatus, UserPresenceData } from '@/types/presence';

interface CanvasHeaderProps {
  roomName?: string;
  transform: ViewportTransform;
  canUndo?: boolean;
  canRedo?: boolean;
  connectionStatus?: ConnectionStatus;
  localUser?: UserPresenceData;
  peers?: PeerAwarenessState[];
  peerCount?: number;
  onUndo?: () => void;
  onRedo?: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onZoomToFit: () => void;
  onExportPng: () => void;
}

export const CanvasHeader: React.FC<CanvasHeaderProps> = ({
  roomName = 'Untitled Board',
  transform,
  canUndo = false,
  canRedo = false,
  connectionStatus = 'connected',
  localUser,
  peers = [],
  peerCount = 1,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onZoomToFit,
  onExportPng,
}) => {
  const zoomPercentage = Math.round(transform.scale * 100);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-emerald-500';
      case 'connecting':
        return 'bg-amber-500 animate-pulse';
      case 'offline':
        return 'bg-rose-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return `${peerCount} online`;
      case 'connecting':
        return 'Connecting...';
      case 'offline':
        return 'Offline';
    }
  };

  return (
    <header className="fixed top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
      {/* Left: Room Title, Status, and Undo/Redo */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Title & Connection Status Pill */}
        <div className="flex items-center gap-2.5 p-1.5 px-3 rounded-2xl bg-surface-900/90 backdrop-blur-md border border-border-muted shadow-dock">
          <span className="text-xs font-semibold tracking-tight text-surface-100">
            {roomName}
          </span>
          <span className="w-1 h-1 rounded-full bg-border-muted" />

          {/* Connection Status Pill */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-surface-200/70">
            <span className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
            <span>{getStatusText()}</span>
          </div>
        </div>

        {/* Undo / Redo buttons */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-surface-900/90 backdrop-blur-md border border-border-muted shadow-dock">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className={`p-1.5 rounded-xl transition-colors ${
              canUndo
                ? 'text-surface-100 hover:bg-surface-800'
                : 'text-surface-200/30 cursor-not-allowed'
            }`}
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
            className={`p-1.5 rounded-xl transition-colors ${
              canRedo
                ? 'text-surface-100 hover:bg-surface-800'
                : 'text-surface-200/30 cursor-not-allowed'
            }`}
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right: Presence Avatars, Zoom & Export Controls */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* User Avatars Stack */}
        <div className="flex items-center -space-x-2 p-1 px-2 rounded-2xl bg-surface-900/90 backdrop-blur-md border border-border-muted shadow-dock">
          {localUser && (
            <div
              title={`${localUser.name} (You)`}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-surface-900"
              style={{ backgroundColor: localUser.color }}
            >
              {localUser.name.charAt(0)}
            </div>
          )}
          {peers.slice(0, 4).map((peer, idx) => (
            <div
              key={`${peer.user.clientId}-${idx}`}
              title={peer.user.name}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-surface-900"
              style={{ backgroundColor: peer.user.color }}
            >
              {peer.user.name.charAt(0)}
            </div>
          ))}
          {peers.length > 4 && (
            <div className="w-6 h-6 rounded-full bg-surface-800 border border-border-muted flex items-center justify-center text-[9px] font-mono text-surface-200 ring-2 ring-surface-900">
              +{peers.length - 4}
            </div>
          )}
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-surface-900/90 backdrop-blur-md border border-border-muted shadow-dock">
          <button
            type="button"
            onClick={onZoomOut}
            title="Zoom Out (Ctrl -)"
            className="p-1.5 rounded-xl text-surface-200/70 hover:text-surface-100 hover:bg-surface-800 transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onResetZoom}
            title="Reset Zoom (100%)"
            className="px-2 py-1 rounded-lg text-[11px] font-mono font-medium text-surface-100 hover:bg-surface-800 transition-colors min-w-[50px] text-center"
          >
            {zoomPercentage}%
          </button>

          <button
            type="button"
            onClick={onZoomIn}
            title="Zoom In (Ctrl +)"
            className="p-1.5 rounded-xl text-surface-200/70 hover:text-surface-100 hover:bg-surface-800 transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-border-subtle mx-0.5" />

          <button
            type="button"
            onClick={onZoomToFit}
            title="Zoom to Fit"
            className="p-1.5 rounded-xl text-surface-200/70 hover:text-surface-100 hover:bg-surface-800 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Export Button */}
        <button
          type="button"
          onClick={onExportPng}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-surface-900/90 backdrop-blur-md border border-border-muted shadow-dock text-xs font-medium text-surface-100 hover:bg-surface-800 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-accent-blue" />
          <span>Export PNG</span>
        </button>
      </div>
    </header>
  );
};
