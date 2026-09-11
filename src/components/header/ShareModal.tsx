'use client';

import React, { useState } from 'react';
import { Copy, Check, X, Share2, Link as LinkIcon } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  roomId,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in pointer-events-auto">
      <div className="relative w-full max-w-md p-6 rounded-2xl bg-surface-900 border border-border-muted shadow-popover space-y-5 text-surface-100">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent-blue/15 text-accent-blue">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Share Canvas</h3>
              <p className="text-[11px] text-surface-200/60">
                Anyone with this link can join and draw in real-time.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-200/60 hover:text-surface-100 hover:bg-surface-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Room Link Input with Copy Button */}
        <div className="space-y-2">
          <label className="text-[11px] font-medium text-surface-200/60 uppercase tracking-wider">
            Shareable Link
          </label>
          <div className="flex items-center gap-2 p-1.5 pl-3 rounded-xl bg-surface-850 border border-border-muted">
            <LinkIcon className="w-3.5 h-3.5 text-surface-200/50 flex-shrink-0" />
            <input
              type="text"
              readOnly
              value={currentUrl}
              className="w-full bg-transparent text-xs font-mono text-surface-100 outline-none select-all"
            />
            <button
              type="button"
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                copied
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-accent-blue text-white hover:bg-accent-blue/90 shadow-sm'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Room Code Quick Info */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-surface-850/50 border border-border-subtle text-xs">
          <span className="text-surface-200/70">Room Code:</span>
          <span className="font-mono font-medium text-accent-blue">{roomId}</span>
        </div>
      </div>
    </div>
  );
};
