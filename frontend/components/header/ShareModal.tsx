'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Copy, Check, Users, Link2, KeyRound } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export function ShareModal({
  isOpen,
  onClose,
  roomId,
  onShowToast,
}: ShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const roomUrl = typeof window !== 'undefined' ? `${window.location.origin}/room/${roomId}` : '';

  const copyToClipboard = async (text: string, isCode = false) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isCode) {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
      onShowToast('Copied to clipboard!', 'success');
    } catch {
      onShowToast('Failed to copy to clipboard', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite Collaborators" maxWidth="md">
      <div className="space-y-5">
        <p className="text-sm text-slate-600">
          Share this link or room code with teammates. Anyone with the link can draw and collaborate in real-time.
        </p>

        {/* Room Link */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-indigo-500" />
            Shareable Room Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={roomUrl}
              className="flex-1 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              onClick={() => copyToClipboard(roomUrl, false)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-sm font-medium transition-colors shadow-sm"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedLink ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Room Code */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
            Room Code
          </label>
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="font-mono text-xl font-bold tracking-widest text-slate-800">
              {roomId}
            </span>
            <button
              onClick={() => copyToClipboard(roomId, true)}
              className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors p-1.5 rounded-lg hover:bg-slate-200/60"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCode ? 'Copied' : 'Copy Code'}
            </button>
          </div>
        </div>

        {/* Tips */}
        <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-2.5">
          <Users className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <p className="text-xs text-indigo-900 leading-relaxed">
            Open the link in another browser tab or on a second device to test simultaneous multiplayer drawing and live cursor tracking.
          </p>
        </div>
      </div>
    </Modal>
  );
}
