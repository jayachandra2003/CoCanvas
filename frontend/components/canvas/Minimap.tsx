'use client';

import React, { useRef, useEffect } from 'react';
import { DrawingObject, ViewportTransform } from '../../types';
import { renderObject } from '../../lib/canvasRenderer';

interface MinimapProps {
  objects: DrawingObject[];
  viewport: ViewportTransform;
  containerWidth: number;
  containerHeight: number;
}

export function Minimap({
  objects,
  viewport,
  containerWidth,
  containerHeight,
}: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 160;
    const height = 100;
    canvas.width = width;
    canvas.height = height;

    // Clear background
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, width, height);

    // Coordinate scale
    const scale = 0.04;
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);

    // Draw objects
    for (const obj of objects) {
      if (!obj.isDeleted) {
        renderObject(ctx, obj);
      }
    }

    // Draw active viewport rectangle
    ctx.restore();
    ctx.save();

    const viewX = centerX - (viewport.x / viewport.zoom) * scale;
    const viewY = centerY - (viewport.y / viewport.zoom) * scale;
    const viewW = (containerWidth / viewport.zoom) * scale;
    const viewH = (containerHeight / viewport.zoom) * scale;

    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = 'rgba(99, 102, 241, 0.1)';
    ctx.fillRect(viewX, viewY, viewW, viewH);
    ctx.strokeRect(viewX, viewY, viewW, viewH);

    ctx.restore();
  }, [objects, viewport, containerWidth, containerHeight]);

  return (
    <div className="absolute bottom-4 right-4 z-20 hidden md:block rounded-xl overflow-hidden bg-white/90 shadow-floating border border-slate-200/90 backdrop-blur-md p-1">
      <canvas
        ref={canvasRef}
        className="w-40 h-24 rounded-lg bg-slate-100"
      />
    </div>
  );
}
