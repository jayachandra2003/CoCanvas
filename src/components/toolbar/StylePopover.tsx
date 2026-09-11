'use client';

import React from 'react';
import {
  PRESET_COLORS,
  STROKE_WIDTH_PRESETS,
  CanvasStyleConfig,
  ToolType,
} from '@/types/canvas';

interface StylePopoverProps {
  activeTool: ToolType;
  styleConfig: CanvasStyleConfig;
  onChangeStyle: (partial: Partial<CanvasStyleConfig>) => void;
}

export const StylePopover: React.FC<StylePopoverProps> = ({
  activeTool,
  styleConfig,
  onChangeStyle,
}) => {
  // Only show style controls when a drawable tool or select tool is active
  if (activeTool === 'pan' || activeTool === 'eraser') {
    return null;
  }

  const supportsFill = activeTool === 'rectangle' || activeTool === 'ellipse';

  return (
    <div className="fixed top-20 left-6 z-20 flex flex-col gap-3 p-3.5 rounded-2xl bg-surface-900/95 backdrop-blur-md border border-border-muted shadow-popover w-60 text-xs">
      {/* Stroke Color */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-surface-200/60 uppercase tracking-wider">
          Stroke Color
        </label>
        <div className="grid grid-cols-5 gap-1.5">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onChangeStyle({ strokeColor: color })}
              className={`w-7 h-7 rounded-lg transition-transform duration-100 flex items-center justify-center ${
                styleConfig.strokeColor === color
                  ? 'scale-110 ring-2 ring-accent-blue ring-offset-2 ring-offset-surface-900'
                  : 'hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Fill Color (for Rect & Ellipse) */}
      {supportsFill && (
        <div className="space-y-1.5 pt-2 border-t border-border-subtle">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium text-surface-200/60 uppercase tracking-wider">
              Fill Style
            </label>
            <button
              type="button"
              onClick={() =>
                onChangeStyle({
                  fillColor:
                    styleConfig.fillColor === 'transparent'
                      ? styleConfig.strokeColor
                      : 'transparent',
                })
              }
              className="text-[11px] text-accent-blue hover:underline"
            >
              {styleConfig.fillColor === 'transparent' ? 'Enable Fill' : 'Transparent'}
            </button>
          </div>
          {styleConfig.fillColor !== 'transparent' && (
            <div className="grid grid-cols-5 gap-1.5">
              {PRESET_COLORS.map((color) => (
                <button
                  key={`fill-${color}`}
                  type="button"
                  onClick={() => onChangeStyle({ fillColor: color })}
                  className={`w-7 h-7 rounded-lg transition-transform duration-100 ${
                    styleConfig.fillColor === color
                      ? 'scale-110 ring-2 ring-accent-blue ring-offset-2 ring-offset-surface-900'
                      : 'hover:scale-105 opacity-80'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stroke Width */}
      {activeTool !== 'text' && (
        <div className="space-y-1.5 pt-2 border-t border-border-subtle">
          <label className="text-[11px] font-medium text-surface-200/60 uppercase tracking-wider">
            Stroke Width
          </label>
          <div className="flex items-center gap-1.5">
            {STROKE_WIDTH_PRESETS.map((width) => (
              <button
                key={width}
                type="button"
                onClick={() => onChangeStyle({ strokeWidth: width })}
                className={`flex-1 py-1.5 rounded-lg border text-center font-mono text-[11px] transition-colors ${
                  styleConfig.strokeWidth === width
                    ? 'border-accent-blue bg-accent-blue/15 text-accent-blue font-semibold'
                    : 'border-border-muted bg-surface-850 text-surface-200/70 hover:bg-surface-800'
                }`}
              >
                {width}px
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Font Size (for Text) */}
      {activeTool === 'text' && (
        <div className="space-y-1.5 pt-2 border-t border-border-subtle">
          <label className="text-[11px] font-medium text-surface-200/60 uppercase tracking-wider">
            Font Size ({styleConfig.fontSize}px)
          </label>
          <div className="flex items-center gap-1.5">
            {[16, 20, 28, 36].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onChangeStyle({ fontSize: size })}
                className={`flex-1 py-1.5 rounded-lg border text-center font-mono text-[11px] transition-colors ${
                  styleConfig.fontSize === size
                    ? 'border-accent-blue bg-accent-blue/15 text-accent-blue font-semibold'
                    : 'border-border-muted bg-surface-850 text-surface-200/70 hover:bg-surface-800'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Opacity */}
      <div className="space-y-1.5 pt-2 border-t border-border-subtle">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-surface-200/60 uppercase tracking-wider">
            Opacity
          </label>
          <span className="font-mono text-[11px] text-surface-200/60">
            {Math.round(styleConfig.opacity * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0.1"
          max="1.0"
          step="0.05"
          value={styleConfig.opacity}
          onChange={(e) => onChangeStyle({ opacity: parseFloat(e.target.value) })}
          className="w-full accent-accent-blue cursor-pointer h-1.5 bg-surface-800 rounded-lg appearance-none"
        />
      </div>
    </div>
  );
};
