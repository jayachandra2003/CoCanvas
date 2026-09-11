'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PeerAwarenessState } from '@/types/presence';
import { ViewportTransform, Point } from '@/types/canvas';
import { worldToScreen } from '@/lib/math';

interface MultiplayerCursorsProps {
  peers: PeerAwarenessState[];
  transform: ViewportTransform;
}

interface LerpedCursor {
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  name: string;
  color: string;
  activeTool: string;
}

export const MultiplayerCursors: React.FC<MultiplayerCursorsProps> = ({
  peers,
  transform,
}) => {
  const [renderedCursors, setRenderedCursors] = useState<Record<string, LerpedCursor>>({});
  const cursorsRef = useRef<Record<string, LerpedCursor>>({});
  const animFrameRef = useRef<number | null>(null);

  // Sync incoming peers into target positions
  useEffect(() => {
    const current = cursorsRef.current;
    const next: Record<string, LerpedCursor> = {};

    for (const peer of peers) {
      if (!peer.cursor) continue;
      const screenPos = worldToScreen(peer.cursor, transform);
      const existing = current[peer.user.clientId];

      if (existing) {
        next[peer.user.clientId] = {
          ...existing,
          targetX: screenPos.x,
          targetY: screenPos.y,
          name: peer.user.name,
          color: peer.user.color,
          activeTool: peer.activeTool,
        };
      } else {
        next[peer.user.clientId] = {
          currentX: screenPos.x,
          currentY: screenPos.y,
          targetX: screenPos.x,
          targetY: screenPos.y,
          name: peer.user.name,
          color: peer.user.color,
          activeTool: peer.activeTool,
        };
      }
    }

    cursorsRef.current = next;
  }, [peers, transform]);

  // 60fps Lerp Animation Loop
  useEffect(() => {
    let active = true;

    const lerpLoop = () => {
      if (!active) return;
      let hasChanged = false;
      const updated: Record<string, LerpedCursor> = {};

      for (const [id, cursor] of Object.entries(cursorsRef.current)) {
        const dx = cursor.targetX - cursor.currentX;
        const dy = cursor.targetY - cursor.currentY;

        // Exponential smoothing (lerp factor 0.35)
        const nextX = Math.abs(dx) < 0.1 ? cursor.targetX : cursor.currentX + dx * 0.35;
        const nextY = Math.abs(dy) < 0.1 ? cursor.targetY : cursor.currentY + dy * 0.35;

        if (nextX !== cursor.currentX || nextY !== cursor.currentY) {
          hasChanged = true;
        }

        updated[id] = {
          ...cursor,
          currentX: nextX,
          currentY: nextY,
        };
      }

      cursorsRef.current = updated;
      if (hasChanged) {
        setRenderedCursors({ ...updated });
      }

      animFrameRef.current = requestAnimationFrame(lerpLoop);
    };

    animFrameRef.current = requestAnimationFrame(lerpLoop);

    return () => {
      active = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {Object.entries(renderedCursors).map(([id, cursor]) => (
        <div
          key={id}
          className="absolute top-0 left-0 transition-transform duration-75 ease-out flex items-start gap-1 select-none"
          style={{
            transform: `translate3d(${cursor.currentX}px, ${cursor.currentY}px, 0)`,
          }}
        >
          {/* Custom SVG Cursor Arrow with peer color */}
          <svg
            className="w-5 h-5 -mt-0.5 -ml-0.5 filter drop-shadow-md"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M3 3l7 18 3-7 7-3L3 3z"
              fill={cursor.color}
              stroke="#121214"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>

          {/* User Name & Tool Label */}
          <div
            className="px-2 py-0.5 rounded-full text-[11px] font-medium text-white shadow-md flex items-center gap-1.5 whitespace-nowrap"
            style={{ backgroundColor: cursor.color }}
          >
            <span>{cursor.name}</span>
            {cursor.activeTool !== 'select' && (
              <span className="opacity-75 text-[9px] uppercase font-mono tracking-wider">
                ({cursor.activeTool})
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
