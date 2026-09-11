'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowRight,
  PlusCircle,
  LogIn,
  Users,
  Zap,
  Layers,
  Shield,
  MousePointer2,
  Brush,
  Palette,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

export default function LandingPage() {
  const router = useRouter();
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [userName, setUserName] = useState('');
  const [createdRoomName, setCreatedRoomName] = useState('');

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateRoom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = generateRoomCode();
    const name = userName.trim() || `Artist ${Math.floor(Math.random() * 900 + 100)}`;
    localStorage.setItem('collabdraw_username', name);
    router.push(`/room/${code}?name=${encodeURIComponent(name)}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    const name = userName.trim() || `Artist ${Math.floor(Math.random() * 900 + 100)}`;
    localStorage.setItem('collabdraw_username', name);
    router.push(`/room/${code}?name=${encodeURIComponent(name)}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white overflow-y-auto">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-60" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-indigo-100/50 via-purple-50/30 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Navigation Header */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg tracking-tight text-slate-900">
              CollabDraw
            </span>
            <span className="text-[10px] text-slate-500 font-medium tracking-wide -mt-1">
              Draw together. Create together.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Join Room
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Canvas</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-20 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-8 shadow-sm">
          <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
          Ultra Low-Latency WebSocket Engine
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-6">
          Draw together in <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">real time.</span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-600 mb-10 leading-relaxed font-normal">
          A collaborative canvas for teams to sketch, brainstorm, and build ideas together. Smooth vector rendering, multiplayer cursors, and instant persistence.
        </p>

        {/* Hero CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base shadow-xl shadow-indigo-200/80 transition-all hover:scale-105 active:scale-95"
          >
            <span>Create a Room</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-base border border-slate-200 shadow-dock transition-all hover:scale-105 active:scale-95"
          >
            <LogIn className="w-4 h-4 text-slate-500" />
            <span>Join a Room</span>
          </button>
        </div>

        {/* Interactive Mock Canvas Preview */}
        <div className="relative max-w-4xl mx-auto rounded-2xl p-2 bg-white/70 backdrop-blur-xl border border-slate-200/80 shadow-2xl overflow-hidden group">
          <div className="relative w-full h-80 sm:h-96 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px]" />

            {/* Simulated Live Collaborator Cursors */}
            <div className="absolute top-20 left-32 animate-bounce flex items-start gap-1">
              <MousePointer2 className="w-5 h-5 text-pink-500 fill-pink-500 drop-shadow" />
              <span className="px-2 py-0.5 rounded-md bg-pink-500 text-white text-[10px] font-bold shadow">
                Sarah (Product Lead)
              </span>
            </div>

            <div className="absolute bottom-24 right-44 animate-pulse flex items-start gap-1">
              <MousePointer2 className="w-5 h-5 text-indigo-600 fill-indigo-600 drop-shadow" />
              <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-bold shadow">
                Alex (Architect)
              </span>
            </div>

            {/* Simulated Drawings */}
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div className="flex items-center gap-6">
                <div className="w-32 h-20 rounded-xl border-2 border-indigo-500 bg-indigo-500/10 flex items-center justify-center font-bold text-xs text-indigo-700 shadow-sm">
                  User Journey
                </div>
                <div className="w-16 h-0.5 bg-slate-400 relative">
                  <div className="absolute right-0 -top-1 border-solid border-l-slate-400 border-l-8 border-y-transparent border-y-4 border-r-0" />
                </div>
                <div className="w-32 h-20 rounded-xl border-2 border-emerald-500 bg-emerald-500/10 flex items-center justify-center font-bold text-xs text-emerald-700 shadow-sm">
                  Live Canvas Sync
                </div>
              </div>
              <div className="px-4 py-2 rounded-lg bg-white/90 border border-slate-200 shadow-sm text-xs font-mono text-slate-600">
                ✨ Sub-16ms delta synchronization with multi-layer rendering
              </div>
            </div>

            {/* Overlay Click prompt */}
            <div
              onClick={() => setIsCreateModalOpen(true)}
              className="absolute inset-0 bg-slate-900/0 hover:bg-slate-900/5 transition-colors cursor-pointer flex items-center justify-center"
            >
              <span className="opacity-0 group-hover:opacity-100 transition-opacity px-4 py-2 rounded-xl bg-slate-900/90 text-white text-xs font-medium backdrop-blur shadow-lg">
                Click to launch new board →
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-16 border-t border-slate-200/80">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Real-Time WebSocket Sync
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Operation-based and throttled delta streaming powered by Socket.IO. Smooth live rendering across multiple browser tabs and devices.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Multiplayer Cursors & Presence
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              See collaborator cursors move in real time with unique colors, names, and live online user presence indicators.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Collaborative-Safe Undo/Redo
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Smart per-user tombstone stacks ensure your undo/redo operations never accidentally delete another teammate&apos;s work.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-8 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span className="font-semibold text-slate-700">CollabDraw</span>
          <span>— Production Real-Time Collaborative Canvas</span>
        </div>
        <p>Built with Next.js, TypeScript, Canvas API, Socket.IO & MongoDB</p>
      </footer>

      {/* Create Room Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Canvas Room"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateRoom} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Your Display Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sarah Connor"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
            >
              Start Drawing
            </button>
          </div>
        </form>
      </Modal>

      {/* Join Room Modal */}
      <Modal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        title="Join an Existing Room"
        maxWidth="sm"
      >
        <form onSubmit={handleJoinRoom} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Room Code
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 7F3K9A"
              maxLength={12}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full font-mono text-center tracking-widest text-lg font-bold uppercase rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Your Display Name
            </label>
            <input
              type="text"
              placeholder="e.g. Alex Rivera"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsJoinModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
            >
              Join Room
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
