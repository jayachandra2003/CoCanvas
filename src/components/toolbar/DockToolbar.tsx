'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  MousePointer,
  Hand,
  Pencil,
  Square,
  Circle,
  Minus,
  MoveRight,
  Type,
  Eraser,
} from 'lucide-react';
import { ToolType } from '@/types/canvas';

interface DockToolbarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
}

const TOOLS: { type: ToolType; label: string; shortcut: string; icon: React.FC<{ className?: string }> }[] = [
  { type: 'select', label: 'Select', shortcut: 'V', icon: MousePointer },
  { type: 'pan', label: 'Hand / Pan', shortcut: 'H', icon: Hand },
  { type: 'pen', label: 'Pen', shortcut: 'P', icon: Pencil },
  { type: 'rectangle', label: 'Rectangle', shortcut: 'R', icon: Square },
  { type: 'ellipse', label: 'Ellipse', shortcut: 'O', icon: Circle },
  { type: 'line', label: 'Line', shortcut: 'L', icon: Minus },
  { type: 'arrow', label: 'Arrow', shortcut: 'A', icon: MoveRight },
  { type: 'text', label: 'Text', shortcut: 'T', icon: Type },
  { type: 'eraser', label: 'Eraser', shortcut: 'E', icon: Eraser },
];

export const DockToolbar: React.FC<DockToolbarProps> = ({
  activeTool,
  onSelectTool,
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 p-1.5 rounded-2xl bg-surface-900/90 backdrop-blur-md border border-border-muted shadow-dock">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.type;

        return (
          <button
            key={tool.type}
            type="button"
            onClick={() => onSelectTool(tool.type)}
            title={`${tool.label} (${tool.shortcut})`}
            className={`relative flex items-center justify-center w-10 h-10 rounded-xl text-sm transition-colors duration-150 ${
              isActive
                ? 'text-accent-blue font-medium'
                : 'text-surface-200/70 hover:text-surface-100 hover:bg-surface-800'
            }`}
          >
            {/* Framer Motion Active Indicator Pill */}
            {isActive && (
              <motion.div
                layoutId="active-tool-dock-pill"
                className="absolute inset-0 rounded-xl bg-accent-blue/20 border border-accent-blue/30"
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              />
            )}

            <Icon className="w-4 h-4 relative z-10" />

            {isActive && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-accent-blue z-10" />
            )}
          </button>
        );
      })}
    </div>
  );
};
