'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ArrowRight, Clock, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { generateRoomId } from '@/lib/roomSlug';

export default function Home() {
  const router = useRouter();
  const [joinInput, setJoinInput] = useState('');
  const [recentRooms, setRecentRooms] = useState<{ id: string; visitedAt: number }[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('collab_recent_rooms');
      if (stored) {
        setRecentRooms(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleCreateRoom = () => {
    const newRoomId = generateRoomId();
    router.push(`/room/${newRoomId}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinInput.trim()) return;

    let targetId = joinInput.trim();
    // Support pasting full URL like https://domain.com/room/abc
    if (targetId.includes('/room/')) {
      const parts = targetId.split('/room/');
      targetId = parts[parts.length - 1];
    }
    // Strip trailing slashes or queries
    targetId = targetId.split('?')[0].replace(/\/+$/, '');

    if (targetId) {
      router.push(`/room/${targetId}`);
    }
  };

  return (
    <main className="min-h-screen w-screen bg-canvas-bg text-surface-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle Dot Grid Background */}
      <div className="absolute inset-0 canvas-grid-dots opacity-40 pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Brand & Badge */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border-muted bg-surface-900/90 text-xs font-mono text-accent-blue shadow-sm">
            <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
            <span>Decentralized Real-Time Canvas</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white">
            CollabCanvas
          </h1>
          <p className="text-xs text-surface-200/70 max-w-sm mx-auto leading-relaxed">
            High-performance vector whiteboard powered by Direct HTML5 Canvas 2D, Yjs CRDTs, and Peer-to-Peer WebRTC.
          </p>
        </div>

        {/* Action Card */}
        <div className="p-6 rounded-2xl bg-surface-900/95 backdrop-blur-md border border-border-muted shadow-popover space-y-5">
          {/* Create Button */}
          <button
            type="button"
            onClick={handleCreateRoom}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-accent-blue text-white text-sm font-semibold hover:bg-accent-blue/90 shadow-dock transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Board</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-[1px] bg-border-subtle" />
            <span className="text-[11px] font-mono text-surface-200/40 uppercase">or join existing</span>
            <div className="flex-1 h-[1px] bg-border-subtle" />
          </div>

          {/* Join Form */}
          <form onSubmit={handleJoinRoom} className="space-y-2">
            <div className="flex items-center gap-2 p-1.5 pl-3 rounded-xl bg-surface-850 border border-border-muted focus-within:border-accent-blue/60 transition-colors">
              <input
                type="text"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                placeholder="Enter room code or link..."
                className="w-full bg-transparent text-xs text-surface-100 placeholder:text-surface-200/40 outline-none font-mono"
              />
              <button
                type="submit"
                disabled={!joinInput.trim()}
                className="p-2 rounded-lg bg-surface-800 text-surface-100 hover:bg-surface-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

        {/* Recent Boards */}
        {recentRooms.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-surface-200/60 px-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Recent Boards</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {recentRooms.slice(0, 4).map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => router.push(`/room/${room.id}`)}
                  className="flex items-center justify-between p-2.5 px-3 rounded-xl bg-surface-900/70 border border-border-subtle hover:border-border-muted hover:bg-surface-850 text-left transition-colors group"
                >
                  <span className="text-xs font-mono text-surface-100 truncate group-hover:text-accent-blue transition-colors">
                    {room.id}
                  </span>
                  <ArrowRight className="w-3 h-3 text-surface-200/30 group-hover:text-surface-100 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Feature Highlights */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border-subtle text-center">
          <div className="p-2 space-y-1">
            <Zap className="w-3.5 h-3.5 text-accent-amber mx-auto" />
            <p className="text-[10px] text-surface-200/60 font-medium">60 FPS Direct 2D</p>
          </div>
          <div className="p-2 space-y-1">
            <Sparkles className="w-3.5 h-3.5 text-accent-purple mx-auto" />
            <p className="text-[10px] text-surface-200/60 font-medium">Decentralized P2P</p>
          </div>
          <div className="p-2 space-y-1">
            <ShieldCheck className="w-3.5 h-3.5 text-accent-emerald mx-auto" />
            <p className="text-[10px] text-surface-200/60 font-medium">Local-First CRDT</p>
          </div>
        </div>
      </div>
    </main>
  );
}
