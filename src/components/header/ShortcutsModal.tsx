'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'V', desc: 'Select / Move element' },
  { key: 'H / Space+Drag', desc: 'Hand / Pan canvas' },
  { key: 'P', desc: 'Pen tool (freehand)' },
  { key: 'R', desc: 'Rectangle shape' },
  { key: 'O', desc: 'Ellipse / Circle shape' },
  { key: 'L', desc: 'Line segment' },
  { key: 'A', desc: 'Arrow pointer' },
  { key: 'T', desc: 'Text tool' },
  { key: 'E', desc: 'Object eraser' },
  { key: 'Ctrl / Cmd + Z', desc: 'Undo' },
  { key: 'Ctrl / Cmd + Y', desc: 'Redo' },
  { key: 'Delete / Backspace', desc: 'Delete selected object' },
  { key: 'Ctrl / Cmd + 0', desc: 'Reset zoom to 100%' },
  { key: 'Wheel / Pinch', desc: 'Zoom centered at cursor' },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md p-6 rounded-2xl bg-surface-900 border border-border-muted shadow-popover space-y-4 text-surface-100"
        >
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-accent-blue/15 text-accent-blue">
                <Keyboard className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold tracking-tight">Keyboard Shortcuts</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-surface-200/60 hover:text-surface-100 hover:bg-surface-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 max-h-[360px] overflow-y-auto pr-1">
            {SHORTCUTS.map((sc) => (
              <div
                key={sc.key}
                className="flex items-center justify-between p-2 rounded-xl bg-surface-850/60 border border-border-subtle text-xs"
              >
                <span className="text-surface-200/80">{sc.desc}</span>
                <kbd className="px-2 py-1 rounded-md bg-surface-800 border border-border-muted font-mono text-[11px] text-accent-blue font-medium">
                  {sc.key}
                </kbd>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
