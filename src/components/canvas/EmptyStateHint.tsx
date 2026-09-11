'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Users, MousePointerClick } from 'lucide-react';

interface EmptyStateHintProps {
  isVisible: boolean;
  onDismiss?: () => void;
}

export const EmptyStateHint: React.FC<EmptyStateHintProps> = ({
  isVisible,
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.96 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none select-none"
        >
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-surface-900/80 backdrop-blur-md border border-border-muted shadow-dock text-xs text-surface-200/70">
            <div className="flex items-center gap-1.5 text-accent-blue font-medium">
              <Pencil className="w-3.5 h-3.5 animate-bounce" />
              <span>Draw anything</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-border-subtle" />
            <div className="flex items-center gap-1.5 text-surface-200/50">
              <Users className="w-3.5 h-3.5" />
              <span>or share the link to collaborate</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
