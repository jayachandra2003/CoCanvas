'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { ViewportTransform, Point } from '../types';

export function useCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const draftCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [viewport, setViewport] = useState<ViewportTransform>({
    x: 0,
    y: 0,
    zoom: 1,
  });

  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; viewX: number; viewY: number } | null>(null);

  // Resize canvas to container with devicePixelRatio support
  const resizeCanvases = useCallback(() => {
    const container = containerRef.current;
    const staticCanvas = staticCanvasRef.current;
    const draftCanvas = draftCanvasRef.current;

    if (!container || !staticCanvas || !draftCanvas) return;

    const { width, height } = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    staticCanvas.width = width * dpr;
    staticCanvas.height = height * dpr;
    staticCanvas.style.width = `${width}px`;
    staticCanvas.style.height = `${height}px`;

    draftCanvas.width = width * dpr;
    draftCanvas.height = height * dpr;
    draftCanvas.style.width = `${width}px`;
    draftCanvas.style.height = `${height}px`;

    const staticCtx = staticCanvas.getContext('2d');
    const draftCtx = draftCanvas.getContext('2d');

    if (staticCtx) staticCtx.scale(dpr, dpr);
    if (draftCtx) draftCtx.scale(dpr, dpr);
  }, []);

  useEffect(() => {
    resizeCanvases();
    window.addEventListener('resize', resizeCanvases);
    return () => window.removeEventListener('resize', resizeCanvases);
  }, [resizeCanvases]);

  // Zoom control centered at specific focal point
  const handleZoom = useCallback((deltaZoom: number, focalPoint?: Point) => {
    setViewport((prev) => {
      const container = containerRef.current;
      const focus = focalPoint || {
        x: container ? container.clientWidth / 2 : 0,
        y: container ? container.clientHeight / 2 : 0,
      };

      const newZoom = Math.max(0.1, Math.min(5, prev.zoom * deltaZoom));

      // Adjust viewport offset to zoom towards the mouse cursor
      const wx = (focus.x - prev.x) / prev.zoom;
      const wy = (focus.y - prev.y) / prev.zoom;

      const newX = focus.x - wx * newZoom;
      const newY = focus.y - wy * newZoom;

      return {
        x: newX,
        y: newY,
        zoom: newZoom,
      };
    });
  }, []);

  // Pan controls
  const startPan = useCallback((screenX: number, screenY: number) => {
    setIsPanning(true);
    panStartRef.current = {
      x: screenX,
      y: screenY,
      viewX: viewport.x,
      viewY: viewport.y,
    };
  }, [viewport.x, viewport.y]);

  const updatePan = useCallback((screenX: number, screenY: number) => {
    if (!panStartRef.current) return;
    const dx = screenX - panStartRef.current.x;
    const dy = screenY - panStartRef.current.y;

    setViewport((prev) => ({
      ...prev,
      x: panStartRef.current!.viewX + dx,
      y: panStartRef.current!.viewY + dy,
    }));
  }, []);

  const endPan = useCallback(() => {
    setIsPanning(false);
    panStartRef.current = null;
  }, []);

  const resetView = useCallback(() => {
    setViewport({ x: 0, y: 0, zoom: 1 });
  }, []);

  return {
    containerRef,
    staticCanvasRef,
    draftCanvasRef,
    viewport,
    setViewport,
    isPanning,
    startPan,
    updatePan,
    endPan,
    handleZoom,
    resetView,
    resizeCanvases,
  };
}
