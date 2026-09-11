'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Point, ViewportTransform, TextObject, DrawingObject } from '../../types';
import { worldToScreen } from '../../lib/math';

interface TextEditorOverlayProps {
  isOpen: boolean;
  position: Point | null;
  existingObject?: DrawingObject | null;
  viewport: ViewportTransform;
  strokeColor: string;
  onCommit: (text: string) => void;
  onClose: () => void;
}

export function TextEditorOverlay({
  isOpen,
  position,
  existingObject,
  viewport,
  strokeColor,
  onCommit,
  onClose,
}: TextEditorOverlayProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (existingObject && existingObject.type === 'text') {
        setText(existingObject.text);
      } else {
        setText('');
      }
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, existingObject]);

  if (!isOpen || !position) return null;

  const screenPos = worldToScreen(position, viewport);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFinish();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleFinish = () => {
    const trimmed = text.trim();
    if (trimmed) {
      onCommit(trimmed);
    }
    onClose();
  };

  return (
    <div
      className="absolute z-40 pointer-events-auto"
      style={{
        left: `${screenPos.x}px`,
        top: `${screenPos.y}px`,
      }}
    >
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleFinish}
          placeholder="Type something..."
          className="min-w-[160px] max-w-lg min-h-[40px] p-2 rounded-lg bg-white/95 border-2 border-indigo-500 shadow-2xl focus:outline-none resize-both text-base font-medium placeholder:text-slate-400 font-sans backdrop-blur-md"
          style={{
            color: strokeColor,
            fontSize: `${Math.max(14, 20 * viewport.zoom)}px`,
            lineHeight: 1.3,
          }}
        />
        <div className="absolute -bottom-6 left-0 text-[10px] text-slate-500 bg-white/80 px-1.5 py-0.5 rounded shadow-sm border border-slate-200">
          Enter to confirm, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}
