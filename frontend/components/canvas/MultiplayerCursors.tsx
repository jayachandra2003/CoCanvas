'use client';

import React from 'react';
import { UserPresence, Point, ViewportTransform } from '../../types';
import { worldToScreen } from '../../lib/math';

interface MultiplayerCursorsProps {
  remoteCursors: Map<string, { user: UserPresence; cursor: Point | null }>;
  viewport: ViewportTransform;
}

export function MultiplayerCursors({
  remoteCursors,
  viewport,
}: MultiplayerCursorsProps) {
  const cursorsArray = Array.from(remoteCursors.values()).filter(
    (item) => item.cursor !== null
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {cursorsArray.map(({ user, cursor }) => {
        if (!cursor) return null;

        const screenPos = worldToScreen(cursor, viewport);

        return (
          <div
            key={user.socketId || user.userId}
            className="absolute top-0 left-0 transition-transform duration-75 ease-out will-change-transform"
            style={{
              transform: `translate3d(${screenPos.x}px, ${screenPos.y}px, 0)`,
            }}
          >
            {/* Custom SVG Pointer */}
            <svg
              className="w-5 h-5 drop-shadow-md"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
            >
              <path
                d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                fill={user.userColor}
              />
            </svg>

            {/* Collaborator Name Tag */}
            <div
              className="ml-3 -mt-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-white shadow-md whitespace-nowrap select-none"
              style={{ backgroundColor: user.userColor }}
            >
              {user.userName}
            </div>
          </div>
        );
      })}
    </div>
  );
}
