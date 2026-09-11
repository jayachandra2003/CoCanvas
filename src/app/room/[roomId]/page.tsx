'use client';

import React, { use, useEffect } from 'react';
import { Canvas } from '@/components/canvas/Canvas';

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
