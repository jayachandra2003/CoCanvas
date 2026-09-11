'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  DrawingObject,
  UserPresence,
  LiveDraftStroke,
  Point,
  ToolType,
  StrokeStyle,
} from '../../types';
import { useCanvas } from '../../hooks/useCanvas';
import { useDrawingTools } from '../../hooks/useDrawingTools';
import { drawGrid, renderObject, renderSelectionBox, renderDraftStroke } from '../../lib/canvasRenderer';
import { MultiplayerCursors } from './MultiplayerCursors';
import { TextEditorOverlay } from './TextEditorOverlay';
import { Minimap } from './Minimap';

interface CanvasProps {
  roomId: string;
  currentUser: UserPresence | null;
  objects: DrawingObject[];
  remoteCursors: Map<string, { user: UserPresence; cursor: Point | null }>;
  remoteDrafts: Map<string, LiveDraftStroke>;
  currentTool: ToolType;
  onChangeTool: (tool: ToolType) => void;
  strokeColor: string;
  onChangeStrokeColor: (color: string) => void;
  strokeWidth: number;
  onChangeStrokeWidth: (width: number) => void;
  fillColor: string;
  onChangeFillColor: (fill: string) => void;
  strokeStyle: StrokeStyle;
  onChangeStrokeStyle: (style: StrokeStyle) => void;
  opacity: number;
  onChangeOpacity: (op: number) => void;
  onCommitObject: (obj: DrawingObject) => void;
  onUpdateObject: (objectId: string, updates: Partial<DrawingObject>) => void;
  onDeleteObject: (objectId: string) => void;
  onEmitDraft: (draft: LiveDraftStroke) => void;
  onEmitDraftEnd: (draftId: string) => void;
  onEmitCursor: (point: Point | null) => void;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export function Canvas({
  roomId,
  currentUser,
  objects,
  remoteCursors,
  remoteDrafts,
  currentTool,
  onChangeTool,
  strokeColor,
  onChangeStrokeColor,
  strokeWidth,
  onChangeStrokeWidth,
  fillColor,
  onChangeFillColor,
  strokeStyle,
  onChangeStrokeStyle,
  opacity,
  onChangeOpacity,
  onCommitObject,
  onUpdateObject,
  onDeleteObject,
  onEmitDraft,
  onEmitDraftEnd,
  onEmitCursor,
  onUndo,
  onRedo,
  zoom,
  onZoomChange,
}: CanvasProps) {
  const {
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
  } = useCanvas();

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [textEditorState, setTextEditorState] = useState<{
    isOpen: boolean;
    position: Point | null;
    existingObject?: DrawingObject | null;
  }>({
    isOpen: false,
    position: null,
  });

  // Sync zoom state with parent
  useEffect(() => {
    onZoomChange(viewport.zoom);
  }, [viewport.zoom, onZoomChange]);

  const {
    selectedObjectId,
    setSelectedObjectId,
    localDraftRef,
    handlePointerDown: onDrawPointerDown,
    handlePointerMove: onDrawPointerMove,
    handlePointerUp: onDrawPointerUp,
    handlePointerLeave: onDrawPointerLeave,
  } = useDrawingTools({
    currentUser,
    roomId,
    viewport,
    objects,
    onCommitObject,
    onUpdateObject,
    onDeleteObject,
    onEmitDraft,
    onEmitDraftEnd,
    onEmitCursor,
    onOpenTextEditor: (position, existingObject) => {
      setTextEditorState({
        isOpen: true,
        position,
        existingObject,
      });
    },
  });

  // Render Static Committed Objects & Grid
  useEffect(() => {
    const canvas = staticCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    // 1. Grid
    drawGrid(ctx, width, height, viewport);

    // 2. Objects in World coordinates
    ctx.save();
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    for (const obj of objects) {
      if (!obj.isDeleted) {
        renderObject(ctx, obj);
      }
    }

    // 3. Selection outline
    if (selectedObjectId) {
      const selectedObj = objects.find((o) => o.id === selectedObjectId);
      if (selectedObj && !selectedObj.isDeleted) {
        renderSelectionBox(ctx, selectedObj, viewport);
      }
    }

    ctx.restore();
  }, [objects, viewport, selectedObjectId, staticCanvasRef]);

  // Render Dynamic / In-Progress Draft Strokes (RAF Loop)
  useEffect(() => {
    let animId: number;

    const renderDrafts = () => {
      const canvas = draftCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.translate(viewport.x, viewport.y);
      ctx.scale(viewport.zoom, viewport.zoom);

      // 1. Render remote collaborators' in-flight streaming drafts
      for (const draft of remoteDrafts.values()) {
        renderDraftStroke(ctx, draft);
      }

      // 2. Render local user's active in-flight draft stroke with 0ms lag
      if (localDraftRef.current) {
        renderDraftStroke(ctx, localDraftRef.current);
      }

      ctx.restore();

      animId = requestAnimationFrame(renderDrafts);
    };

    animId = requestAnimationFrame(renderDrafts);
    return () => cancelAnimationFrame(animId);
  }, [remoteDrafts, viewport, draftCanvasRef, localDraftRef]);

  // Keyboard Navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept shortcuts when typing in an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          onRedo();
        } else {
          onUndo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        onRedo();
        return;
      }

      // Delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedObjectId) {
        e.preventDefault();
        onDeleteObject(selectedObjectId);
        setSelectedObjectId(null);
        return;
      }

      // Tool Switching Shortcuts
      switch (e.key.toLowerCase()) {
        case 'v':
          onChangeTool('select');
          break;
        case 'p':
        case 'b':
          onChangeTool('pencil');
          break;
        case 'e':
          onChangeTool('eraser');
          break;
        case 'l':
          onChangeTool('line');
          break;
        case 'a':
          onChangeTool('arrow');
          break;
        case 'r':
          onChangeTool('rectangle');
          break;
        case 'o':
        case 'c':
          onChangeTool('circle');
          break;
        case 't':
          onChangeTool('text');
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        endPan();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedObjectId, onUndo, onRedo, onDeleteObject, setSelectedObjectId, onChangeTool, endPan]);

  // Wheel Zoom / Pan
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const focal = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom / Ctrl+Wheel zoom
        const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
        handleZoom(zoomFactor, focal);
      } else {
        // Two-finger trackpad scroll or regular wheel pan
        setViewport((prev) => ({
          ...prev,
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    },
    [handleZoom, setViewport]
  );

  // Pointer Handlers
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Middle mouse button or Spacebar hold = Pan
    if (e.button === 1 || isSpacePressed) {
      startPan(e.clientX, e.clientY);
      return;
    }
    onDrawPointerDown(e);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      updatePan(e.clientX, e.clientY);
      return;
    }
    onDrawPointerMove(e);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      endPan();
      return;
    }
    onDrawPointerUp(e);
  };

  const cursorClass = isSpacePressed || isPanning
    ? isPanning ? 'cursor-grabbing' : 'cursor-grab'
    : currentTool === 'pencil'
    ? 'cursor-pencil'
    : currentTool === 'eraser'
    ? 'cursor-eraser'
    : currentTool === 'text'
    ? 'cursor-text'
    : currentTool === 'select'
    ? 'cursor-select'
    : 'cursor-shape';

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className={`canvas-container select-none ${cursorClass}`}
    >
      {/* 1. Committed Objects & Background Grid Layer */}
      <canvas
        ref={staticCanvasRef}
        className="absolute inset-0 block w-full h-full pointer-events-none"
      />

      {/* 2. Live Draft Strokes Layer */}
      <canvas
        ref={draftCanvasRef}
        className="absolute inset-0 block w-full h-full pointer-events-none"
      />

      {/* 3. Interactive Input Layer */}
      <canvas
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onDrawPointerLeave}
        className="absolute inset-0 block w-full h-full opacity-0 touch-none"
      />

      {/* 4. Multiplayer Remote Cursors Overlay */}
      <MultiplayerCursors
        remoteCursors={remoteCursors}
        viewport={viewport}
      />

      {/* 5. Inline Text Editor Overlay */}
      <TextEditorOverlay
        isOpen={textEditorState.isOpen}
        position={textEditorState.position}
        existingObject={textEditorState.existingObject}
        viewport={viewport}
        strokeColor={strokeColor}
        onCommit={(text) => {
          if (textEditorState.existingObject) {
            onUpdateObject(textEditorState.existingObject.id, { text });
          } else if (textEditorState.position) {
            onCommitObject({
              id: `text_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
              type: 'text',
              roomId,
              userId: currentUser?.userId || 'anon',
              userName: currentUser?.userName || 'User',
              userColor: currentUser?.userColor || '#6366f1',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              strokeColor,
              strokeWidth: 1,
              x: textEditorState.position.x,
              y: textEditorState.position.y,
              text,
              fontSize: 22,
              fontFamily: 'Inter, sans-serif',
              isDeleted: false,
            });
          }
        }}
        onClose={() =>
          setTextEditorState({ isOpen: false, position: null, existingObject: null })
        }
      />

      {/* 6. Minimap */}
      <Minimap
        objects={objects}
        viewport={viewport}
        containerWidth={containerRef.current?.clientWidth || 1000}
        containerHeight={containerRef.current?.clientHeight || 700}
      />
    </div>
  );
}
