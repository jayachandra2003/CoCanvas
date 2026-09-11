'use client';

import React from 'react';
import { ToolType, StrokeStyle, FillStyle } from '../../types';

interface StyleToolbarProps {
  currentTool: ToolType;
  strokeColor: string;
  onChangeStrokeColor: (color: string) => void;
  strokeWidth: number;
  onChangeStrokeWidth: (width: number) => void;
  fillColor: string;
  onChangeFillColor: (fill: string) => void;
  strokeStyle: StrokeStyle;
  onChangeStrokeStyle: (style: StrokeStyle) => void;
  opacity: number;
  onChangeOpacity: (op: number) => void;
}

const COLOR_PRESETS = [
  '#0f172a', // Slate 900
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#ffffff', // White
];

const STROKE_WIDTHS = [
  { label: 'S', value: 2 },
  { label: 'M', value: 4 },
  { label: 'L', value: 8 },
  { label: 'XL', value: 16 },
];

export function StyleToolbar({
  currentTool,
  strokeColor,
  onChangeStrokeColor,
  strokeWidth,
  onChangeStrokeWidth,
  fillColor,
  onChangeFillColor,
  strokeStyle,
  onChangeStrokeStyle,
  opacity,
  onChangeOpacity,
}: StyleToolbarProps) {
  // Hide styling when eraser is selected
  if (currentTool === 'eraser') return null;

  const showFillOptions = currentTool === 'rectangle' || currentTool === 'circle';

  return (
    <aside className="absolute left-4 top-20 z-20 pointer-events-auto hidden md:block">
      <div className="w-56 p-3 rounded-2xl bg-white/95 shadow-floating border border-slate-200/90 backdrop-blur-md space-y-4 text-xs animate-fade-in">
        {/* Stroke Color */}
        <div className="space-y-2">
          <label className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block">
            Stroke Color
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                onClick={() => onChangeStrokeColor(color)}
                className={`w-7 h-7 rounded-lg border transition-transform ${
                  strokeColor === color
                    ? 'ring-2 ring-indigo-500 ring-offset-1 scale-105'
                    : 'border-slate-200 hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          {/* Custom Color Input */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="color"
              value={strokeColor.startsWith('#') ? strokeColor : '#0f172a'}
              onChange={(e) => onChangeStrokeColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
            />
            <input
              type="text"
              value={strokeColor}
              onChange={(e) => onChangeStrokeColor(e.target.value)}
              className="w-full text-[11px] font-mono rounded bg-slate-50 px-2 py-1 border border-slate-200"
            />
          </div>
        </div>

        {/* Stroke Width */}
        <div className="space-y-2">
          <label className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block">
            Stroke Width
          </label>
          <div className="grid grid-cols-4 gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200/80">
            {STROKE_WIDTHS.map((sw) => (
              <button
                key={sw.value}
                onClick={() => onChangeStrokeWidth(sw.value)}
                className={`py-1 rounded-lg font-medium transition-all ${
                  strokeWidth === sw.value
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sw.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stroke Style */}
        <div className="space-y-2">
          <label className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block">
            Stroke Style
          </label>
          <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200/80">
            {(['solid', 'dashed', 'dotted'] as StrokeStyle[]).map((style) => (
              <button
                key={style}
                onClick={() => onChangeStrokeStyle(style)}
                className={`py-1 capitalize rounded-lg font-medium text-[11px] transition-all ${
                  strokeStyle === style
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* Fill Color (for shapes) */}
        {showFillOptions && (
          <div className="space-y-2">
            <label className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block">
              Fill Style
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200/80">
              <button
                onClick={() => onChangeFillColor('none')}
                className={`py-1 text-[11px] font-medium rounded-lg ${
                  fillColor === 'none'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                None
              </button>
              <button
                onClick={() => onChangeFillColor(`${strokeColor}25`)}
                className={`py-1 text-[11px] font-medium rounded-lg ${
                  fillColor !== 'none' && fillColor.endsWith('25')
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semi
              </button>
              <button
                onClick={() => onChangeFillColor(strokeColor)}
                className={`py-1 text-[11px] font-medium rounded-lg ${
                  fillColor === strokeColor
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Solid
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
