'use client';

import React from 'react';
import {
  MousePointer,
  Pencil,
  Eraser,
  Minus,
  MoveRight,
  Square,
  Circle,
  Type,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { ToolType } from '../../types';
import { Tooltip } from '../ui/Tooltip';

interface MainToolbarProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export function MainToolbar({
  currentTool,
  onSelectTool,
  onUndo,
  onRedo,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}: MainToolbarProps) {
  const tools: { id: ToolType; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'select', label: 'Select & Move', icon: <MousePointer className="w-4 h-4" />, shortcut: 'V' },
    { id: 'pencil', label: 'Pencil / Brush', icon: <Pencil className="w-4 h-4" />, shortcut: 'P' },
    { id: 'eraser', label: 'Object Eraser', icon: <Eraser className="w-4 h-4" />, shortcut: 'E' },
    { id: 'line', label: 'Line', icon: <Minus className="w-4 h-4" />, shortcut: 'L' },
    { id: 'arrow', label: 'Arrow', icon: <MoveRight className="w-4 h-4" />, shortcut: 'A' },
    { id: 'rectangle', label: 'Rectangle', icon: <Square className="w-4 h-4" />, shortcut: 'R' },
    { id: 'circle', label: 'Circle / Ellipse', icon: <Circle className="w-4 h-4" />, shortcut: 'O' },
    { id: 'text', label: 'Text', icon: <Type className="w-4 h-4" />, shortcut: 'T' },
  ];

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
      <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-white/95 shadow-floating border border-slate-200/90 backdrop-blur-md">
        {/* Drawing Tools */}
        <div className="flex items-center gap-1">
          {tools.map((t) => {
            const isActive = currentTool === t.id;
            return (
              <Tooltip key={t.id} content={t.label} shortcut={t.shortcut}>
                <button
                  onClick={() => onSelectTool(t.id)}
                  className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150 active:scale-95 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {t.icon}
                </button>
              </Tooltip>
            );
          })}
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-slate-200 mx-1" />

        {/* Undo / Redo */}
        <div className="flex items-center gap-1">
          <Tooltip content="Undo" shortcut="Ctrl+Z">
            <button
              onClick={onUndo}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors active:scale-95"
            >
              <Undo2 className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="Redo" shortcut="Ctrl+Y">
            <button
              onClick={onRedo}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors active:scale-95"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

        {/* Zoom Controls */}
        <div className="hidden sm:flex items-center gap-1">
          <Tooltip content="Zoom Out">
            <button
              onClick={onZoomOut}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Reset View (100%)">
            <button
              onClick={onResetZoom}
              className="px-1.5 py-0.5 rounded text-[11px] font-mono font-medium text-slate-600 hover:bg-slate-100 min-w-[42px] text-center"
            >
              {Math.round(zoom * 100)}%
            </button>
          </Tooltip>
          <Tooltip content="Zoom In">
            <button
              onClick={onZoomIn}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
