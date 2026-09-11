'use client';

import { Canvas } from '@/components/canvas/Canvas';

export default function Home() {
  return (
    <main className="w-screen h-screen overflow-hidden">
      <Canvas roomName="CollabCanvas Core" />
    </main>
  );
}
