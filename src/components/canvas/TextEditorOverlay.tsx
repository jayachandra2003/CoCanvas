'use client';

import React, { useEffect, useRef } from 'react';
import { Point, ViewportTransform } from '@/types/canvas';
import { worldToScreen } from '@/lib/math';

interface TextEditorOverlayProps {
  worldPosition: Point;
  transform: ViewportTransform;
  initialText: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  onCommit: (text: string) => void;
  onCancel: () => void;
}

export const TextEditorOverlay: React.FC<TextEditorOverlayProps> = ({
  worldPosition,
  transform,
  initialText,
  fontSize,
  fontFamily,
  color,
  onCommit,
  onCancel,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const screenPos = worldToScreen(worldPosition, transform);
  const scaledFontSize = fontSize * transform.scale;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onCommit(textareaRef.current?.value || '');
    }
  };

  const handleBlur = () => {
    onCommit(textareaRef.current?.value || '');
  };

  return (
    <div
      className="absolute z-40 pointer-events-auto"
      style={{
        left: `${screenPos.x}px`,
        top: `${screenPos.y}px`,
      }}
    >
      <textarea
        ref={textareaRef}
        defaultValue={initialText}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        rows={1}
        placeholder="Type something..."
        className="bg-transparent border border-accent-blue rounded px-1.5 py-0.5 outline-none resize-none overflow-hidden shadow-lg"
        style={{
          color: color,
          fontSize: `${Math.max(12, scaledFontSize)}px`,
          fontFamily: fontFamily,
          lineHeight: 1.3,
          minWidth: '120px',
        }}
        autoFocus
      />
    </div>
  );
};
