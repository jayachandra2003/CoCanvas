'use client';

import React, { use, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Canvas with SSR disabled to prevent Node runtime WebRTC evaluation
const Canvas = dynamic(
  () => import('@/components/canvas/Canvas').then((mod) => mod.Canvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen w-screen items-center justify-center bg-canvas-bg text-surface-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-surface-200/60">Loading Canvas Studio...</span>
        </div>
      </div>
    ),
  }
);

interface RoomPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

export default function RoomPage({ params }: RoomPageProps) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.roomId;

  // Persist to local recent rooms list
  useEffect(() => {
    if (!roomId) return;
    try {
      const stored = localStorage.getItem('collab_recent_rooms');
      const list: { id: string; visitedAt: number }[] = stored ? JSON.parse(stored) : [];
      const filtered = list.filter((item) => item.id !== roomId);
      filtered.unshift({ id: roomId, visitedAt: Date.now() });
      localStorage.setItem('collab_recent_rooms', JSON.stringify(filtered.slice(0, 8)));
    } catch (e) {
      console.error('Failed saving recent room', e);
    }
  }, [roomId]);

  return (
    <main className="w-screen h-screen overflow-hidden bg-canvas-bg">
      <Canvas
        roomId={roomId}
        roomName={`Board #${roomId.slice(0, 8)}`}
      />
    </main>
  );
}
