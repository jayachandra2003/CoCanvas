'use client';

import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Download, Maximize2 } from 'lucide-react';
import { ViewportTransform } from '@/types/canvas';

interface CanvasHeaderProps {
  roomName?: string;
  transform: ViewportTransform;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onZoomToFit: () => void;
  onExportPng: () => void;
}

export const CanvasHeader: React.FC<CanvasHeaderProps> = ({
  roomName = 'Untitled Board',
  transform,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onZoomToFit,
  onExportPng,
}) => {
  const zoomPercentage = Math.round(transform.scale * 100);

  return (
    <header className="fixed top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
      {/* Left: Room Title & Badge */}
      <div className="flex items-center gap-3 p-1.5 px-3 rounded-2xl bg-surface-900/90 backdrop-blur-md border border-border-muted shadow-dock pointer-events-auto">
        <span className="text-xs font-semibold tracking-tight text-surface-100">
          {roomName}
        </span>
        <span className="w-1 h-1 rounded-full bg-border-muted" />
        <span className="text-[11px] text-surface-200/50 font-mono">
          Phase 2 Core
        </span>
      </div>

      {/* Right: Zoom & Export Controls */}
      <div className="flex items-center gap-2 pointer-events-auto">
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
