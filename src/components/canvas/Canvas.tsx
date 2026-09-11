'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  CanvasElement,
  ToolType,
  ViewportTransform,
  ActiveDraftElement,
  CanvasStyleConfig,
  Point,
} from '@/types/canvas';
import {
  screenToWorld,
  worldToScreen,
  isPointInsideElement,
  getElementBounds,
} from '@/lib/math';
import {
  renderGrid,
  renderElement,
  renderActiveDraft,
  renderSelectionOverlay,
  exportCanvasAsBlob,
} from '@/lib/renderer';
import { DockToolbar } from '../toolbar/DockToolbar';
import { StylePopover } from '../toolbar/StylePopover';
import { CanvasHeader } from '../header/CanvasHeader';
import { TextEditorOverlay } from './TextEditorOverlay';

interface CanvasProps {
  initialElements?: CanvasElement[];
  onElementsChange?: (elements: CanvasElement[]) => void;
  roomName?: string;
}

export const Canvas: React.FC<CanvasProps> = ({
  initialElements = [],
  onElementsChange,
  roomName = 'CollabCanvas Studio',
}) => {
  // Main canvas and overlay canvas refs
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const draftCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Canvas Viewport & Tool State
  const [transform, setTransform] = useState<ViewportTransform>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [styleConfig, setStyleConfig] = useState<CanvasStyleConfig>({
    strokeColor: '#FFFFFF',
    fillColor: 'transparent',
    strokeWidth: 4,
    opacity: 1,
    fontSize: 24,
    fontFamily: 'Inter, sans-serif',
  });

  // Elements & Selection State
  const [elements, setElements] = useState<CanvasElement[]>(initialElements);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Pointer Interaction State (stored in ref for zero-latency frame loop)
  const isInteracting = useRef(false);
  const isSpacePressed = useRef(false);
  const isMiddlePanning = useRef(false);
  const lastScreenPos = useRef<Point>({ x: 0, y: 0 });
  const activeDraft = useRef<ActiveDraftElement | null>(null);
  const dragSelectionOffset = useRef<Point | null>(null);

  // Text Tool Overlay State
  const [textEditor, setTextEditor] = useState<{
    worldPos: Point;
    initialText: string;
    elementId?: string;
  } | null>(null);

  // Sync elements update callback
  const updateElements = useCallback(
    (newElements: CanvasElement[] | ((prev: CanvasElement[]) => CanvasElement[])) => {
      setElements((prev) => {
        const next = typeof newElements === 'function' ? newElements(prev) : newElements;
        if (onElementsChange) onElementsChange(next);
        return next;
      });
    },
    [onElementsChange]
  );

  // Render Base Canvas (Grid + Committed Elements + Selection Overlay)
  const drawBaseCanvas = useCallback(() => {
    const canvas = baseCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    // Render Background Grid
    renderGrid(ctx, width, height, transform);

    // Apply World Viewport Transform
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    // Render Elements
    for (const el of elements) {
      renderElement(ctx, el);
    }

    // Render Selection Outline
    const selectedElements = elements.filter((el) => selectedIds.includes(el.id));
    if (selectedElements.length > 0) {
      renderSelectionOverlay(ctx, selectedElements, '#3B82F6');
    }

    ctx.restore();
  }, [transform, elements, selectedIds]);

  // Render Draft Canvas (Active Stroke / Active Shape Draft)
  const drawDraftCanvas = useCallback(() => {
    const canvas = draftCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.clearRect(0, 0, width, height);

    if (activeDraft.current) {
      ctx.save();
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.scale, transform.scale);
      renderActiveDraft(ctx, activeDraft.current);
      ctx.restore();
    }
  }, [transform]);

  // Handle Resize & Canvas Resolution (Retina DPI)
  const updateCanvasSize = useCallback(() => {
    const container = containerRef.current;
    const baseCanvas = baseCanvasRef.current;
    const draftCanvas = draftCanvasRef.current;
    if (!container || !baseCanvas || !draftCanvas) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    baseCanvas.width = width * dpr;
    baseCanvas.height = height * dpr;
    baseCanvas.style.width = `${width}px`;
    baseCanvas.style.height = `${height}px`;
    const baseCtx = baseCanvas.getContext('2d');
    if (baseCtx) baseCtx.scale(dpr, dpr);

    draftCanvas.width = width * dpr;
    draftCanvas.height = height * dpr;
    draftCanvas.style.width = `${width}px`;
    draftCanvas.style.height = `${height}px`;
    const draftCtx = draftCanvas.getContext('2d');
    if (draftCtx) draftCtx.scale(dpr, dpr);

    drawBaseCanvas();
    drawDraftCanvas();
  }, [drawBaseCanvas, drawDraftCanvas]);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  useEffect(() => {
    drawBaseCanvas();
  }, [drawBaseCanvas]);

  // Zoom Controls
  const handleZoom = useCallback((factor: number, focalPoint?: Point) => {
    const container = containerRef.current;
    const focal = focalPoint || {
      x: (container?.clientWidth || window.innerWidth) / 2,
      y: (container?.clientHeight || window.innerHeight) / 2,
    };

    setTransform((prev) => {
      const nextScale = Math.max(0.1, Math.min(5.0, prev.scale * factor));
      const scaleRatio = nextScale / prev.scale;
      const nextX = focal.x - (focal.x - prev.x) * scaleRatio;
      const nextY = focal.y - (focal.y - prev.y) * scaleRatio;
      return { x: nextX, y: nextY, scale: nextScale };
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      scale: 1,
    }));
  }, []);

  const handleZoomToFit = useCallback(() => {
    const activeElements = elements.filter((el) => !el.isDeleted);
    if (activeElements.length === 0) {
      setTransform({ x: 0, y: 0, scale: 1 });
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const el of activeElements) {
      const b = getElementBounds(el);
      if (b.x < minX) minX = b.x;
      if (b.y < minY) minY = b.y;
      if (b.x + b.width > maxX) maxX = b.x + b.width;
      if (b.y + b.height > maxY) maxY = b.y + b.height;
    }

    const container = containerRef.current;
    const viewportWidth = container?.clientWidth || window.innerWidth;
    const viewportHeight = container?.clientHeight || window.innerHeight;
    const pad = 80;

    const boardWidth = maxX - minX;
    const boardHeight = maxY - minY;
    const scaleX = (viewportWidth - pad * 2) / (boardWidth || 1);
    const scaleY = (viewportHeight - pad * 2) / (boardHeight || 1);
    const targetScale = Math.max(0.1, Math.min(2.0, Math.min(scaleX, scaleY)));

    const centerX = minX + boardWidth / 2;
    const centerY = minY + boardHeight / 2;

    setTransform({
      scale: targetScale,
      x: viewportWidth / 2 - centerX * targetScale,
      y: viewportHeight / 2 - centerY * targetScale,
    });
  }, [elements]);

  // Export to PNG
  const handleExportPng = async () => {
    const blob = await exportCanvasAsBlob(elements, {
      padding: 40,
      scale: 2,
      backgroundColor: '#121214',
    });
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `canvas-${roomName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept shortcuts when user is typing in text overlay
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.code === 'Space' && !e.repeat) {
        isSpacePressed.current = true;
      } else if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select');
      } else if (e.key === 'h' || e.key === 'H') {
        setActiveTool('pan');
      } else if (e.key === 'p' || e.key === 'P') {
        setActiveTool('pen');
      } else if (e.key === 'r' || e.key === 'R') {
        setActiveTool('rectangle');
      } else if (e.key === 'o' || e.key === 'O') {
        setActiveTool('ellipse');
      } else if (e.key === 'l' || e.key === 'L') {
        setActiveTool('line');
      } else if (e.key === 'a' || e.key === 'A') {
        setActiveTool('arrow');
      } else if (e.key === 't' || e.key === 'T') {
        setActiveTool('text');
      } else if (e.key === 'e' || e.key === 'E') {
        setActiveTool('eraser');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          updateElements((prev) =>
            prev.filter((el) => !selectedIds.includes(el.id))
          );
          setSelectedIds([]);
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressed.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedIds, updateElements, handleResetZoom]);

  // Pointer Event Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    lastScreenPos.current = { x: screenX, y: screenY };
    isInteracting.current = true;

    // Check for Panning (Space + click, Middle mouse, or Pan tool)
    if (isSpacePressed.current || e.button === 1 || activeTool === 'pan') {
      isMiddlePanning.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    const worldPos = screenToWorld({ x: screenX, y: screenY }, transform);

    if (activeTool === 'select') {
      // Hit test existing elements (in reverse order for top-most element)
      const hit = [...elements].reverse().find((el) => isPointInsideElement(worldPos, el));
      if (hit) {
        setSelectedIds([hit.id]);
        dragSelectionOffset.current = {
          x: worldPos.x - hit.x,
          y: worldPos.y - hit.y,
        };
      } else {
        setSelectedIds([]);
        dragSelectionOffset.current = null;
      }
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (activeTool === 'eraser') {
      // Object eraser: delete element hit by pointer down
      const hit = [...elements].reverse().find((el) => isPointInsideElement(worldPos, el));
      if (hit) {
        updateElements((prev) => prev.filter((el) => el.id !== hit.id));
      }
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (activeTool === 'text') {
      // Trigger inline text editor
      setTextEditor({
        worldPos,
        initialText: '',
      });
      return;
    }

    // Drawing Tools: Pen, Rectangle, Ellipse, Line, Arrow
    if (activeTool === 'pen') {
      activeDraft.current = {
        type: 'pen',
        startX: worldPos.x,
        startY: worldPos.y,
        currentX: worldPos.x,
        currentY: worldPos.y,
        points: [{ x: 0, y: 0 }],
        strokeColor: styleConfig.strokeColor,
        fillColor: 'transparent',
        strokeWidth: styleConfig.strokeWidth,
        opacity: styleConfig.opacity,
      };
    } else {
      activeDraft.current = {
        type: activeTool,
        startX: worldPos.x,
        startY: worldPos.y,
        currentX: worldPos.x,
        currentY: worldPos.y,
        strokeColor: styleConfig.strokeColor,
        fillColor: styleConfig.fillColor,
        strokeWidth: styleConfig.strokeWidth,
        opacity: styleConfig.opacity,
      };
    }

    drawDraftCanvas();
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (isMiddlePanning.current) {
      const dx = screenX - lastScreenPos.current.x;
      const dy = screenY - lastScreenPos.current.y;
      setTransform((prev) => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      lastScreenPos.current = { x: screenX, y: screenY };
      return;
    }

    if (!isInteracting.current) return;

    const worldPos = screenToWorld({ x: screenX, y: screenY }, transform);

    if (activeTool === 'select' && dragSelectionOffset.current && selectedIds.length > 0) {
      // Drag selected element
      const selectedId = selectedIds[0];
      const targetX = worldPos.x - dragSelectionOffset.current.x;
      const targetY = worldPos.y - dragSelectionOffset.current.y;

      updateElements((prev) =>
        prev.map((el) => {
          if (el.id === selectedId) {
            return {
              ...el,
              x: targetX,
              y: targetY,
              updatedAt: Date.now(),
            };
          }
          return el;
        })
      );
      return;
    }

    if (activeTool === 'eraser') {
      const hit = [...elements].reverse().find((el) => isPointInsideElement(worldPos, el));
      if (hit) {
        updateElements((prev) => prev.filter((el) => el.id !== hit.id));
      }
      return;
    }

    if (activeDraft.current) {
      if (activeDraft.current.type === 'pen') {
        const relX = worldPos.x - activeDraft.current.startX;
        const relY = worldPos.y - activeDraft.current.startY;
        activeDraft.current.points?.push({ x: relX, y: relY });
      } else {
        activeDraft.current.currentX = worldPos.x;
        activeDraft.current.currentY = worldPos.y;
      }
      drawDraftCanvas();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isInteracting.current = false;

    if (isMiddlePanning.current) {
      isMiddlePanning.current = false;
      return;
    }

    if (dragSelectionOffset.current) {
      dragSelectionOffset.current = null;
    }

    if (activeDraft.current) {
      const draft = activeDraft.current;
      const elementId = `elem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      let newElement: CanvasElement | null = null;

      if (draft.type === 'pen' && draft.points && draft.points.length > 0) {
        newElement = {
          id: elementId,
          type: 'pen',
          x: draft.startX,
          y: draft.startY,
          points: draft.points,
          strokeColor: draft.strokeColor,
          fillColor: 'transparent',
          strokeWidth: draft.strokeWidth,
          opacity: draft.opacity,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'local-user',
        };
      } else if (draft.type === 'rectangle' || draft.type === 'ellipse') {
        const width = draft.currentX - draft.startX;
        const height = draft.currentY - draft.startY;
        if (Math.abs(width) > 2 || Math.abs(height) > 2) {
          newElement = {
            id: elementId,
            type: draft.type,
            x: draft.startX,
            y: draft.startY,
            width,
            height,
            strokeColor: draft.strokeColor,
            fillColor: draft.fillColor,
            strokeWidth: draft.strokeWidth,
            opacity: draft.opacity,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            createdBy: 'local-user',
          };
        }
      } else if (draft.type === 'line' || draft.type === 'arrow') {
        const dx = draft.currentX - draft.startX;
        const dy = draft.currentY - draft.startY;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          newElement = {
            id: elementId,
            type: draft.type,
            x: draft.startX,
            y: draft.startY,
            points: [
              { x: 0, y: 0 },
              { x: dx, y: dy },
            ],
            strokeColor: draft.strokeColor,
            strokeWidth: draft.strokeWidth,
            opacity: draft.opacity,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            createdBy: 'local-user',
          };
        }
      }

      if (newElement) {
        updateElements((prev) => [...prev, newElement]);
      }

      activeDraft.current = null;
      drawDraftCanvas();
    }
  };

  // Wheel Handler for Infinite Canvas Zoom & Trackpad Pan
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const focalPoint: Point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    if (e.ctrlKey || e.metaKey) {
      // Zoom with wheel or pinch
      const factor = Math.pow(0.995, e.deltaY);
      handleZoom(factor, focalPoint);
    } else {
      // Trackpad 2-finger pan or regular wheel pan
      setTransform((prev) => ({
        ...prev,
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  // Commit text tool input
  const handleTextCommit = (text: string) => {
    if (text.trim() && textEditor) {
      const elementId = `elem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newElement: CanvasElement = {
        id: elementId,
        type: 'text',
        x: textEditor.worldPos.x,
        y: textEditor.worldPos.y,
        text: text.trim(),
        strokeColor: styleConfig.strokeColor,
        strokeWidth: 2,
        opacity: styleConfig.opacity,
        fontSize: styleConfig.fontSize,
        fontFamily: styleConfig.fontFamily,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'local-user',
      };
      updateElements((prev) => [...prev, newElement]);
    }
    setTextEditor(null);
  };

  // Determine mouse cursor style based on active tool
  const getCursorClass = () => {
    if (isSpacePressed.current || isMiddlePanning.current || activeTool === 'pan') {
      return 'cursor-grab active:cursor-grabbing';
    }
    switch (activeTool) {
      case 'select':
        return 'cursor-default';
      case 'pen':
      case 'rectangle':
      case 'ellipse':
      case 'line':
      case 'arrow':
        return 'cursor-crosshair';
      case 'text':
        return 'cursor-text';
      case 'eraser':
        return 'cursor-pointer';
      default:
        return 'cursor-default';
    }
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className={`relative w-screen h-screen overflow-hidden bg-canvas-bg select-none ${getCursorClass()}`}
    >
      {/* Top Header */}
      <CanvasHeader
        roomName={roomName}
        transform={transform}
        onZoomIn={() => handleZoom(1.2)}
        onZoomOut={() => handleZoom(0.8)}
        onResetZoom={handleResetZoom}
        onZoomToFit={handleZoomToFit}
        onExportPng={handleExportPng}
      />

      {/* Floating Style Popover */}
      <StylePopover
        activeTool={activeTool}
        styleConfig={styleConfig}
        onChangeStyle={(partial) => setStyleConfig((prev) => ({ ...prev, ...partial }))}
      />

      {/* Main Base Canvas (Grid + Committed Elements + Selection) */}
      <canvas
        ref={baseCanvasRef}
        className="absolute inset-0 block pointer-events-none"
      />

      {/* Interactive Draft Canvas (Receives Pointer Events) */}
      <canvas
        ref={draftCanvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="absolute inset-0 block touch-none pointer-events-auto"
      />

      {/* Inline Text Tool Overlay */}
      {textEditor && (
        <TextEditorOverlay
          worldPosition={textEditor.worldPos}
          transform={transform}
          initialText={textEditor.initialText}
          fontSize={styleConfig.fontSize}
          fontFamily={styleConfig.fontFamily}
          color={styleConfig.strokeColor}
          onCommit={handleTextCommit}
          onCancel={() => setTextEditor(null)}
        />
      )}

      {/* Bottom Floating Dock Toolbar */}
      <DockToolbar
        activeTool={activeTool}
        onSelectTool={(tool) => {
          setActiveTool(tool);
          if (tool !== 'select') {
            setSelectedIds([]);
          }
        }}
      />
    </div>
  );
};
