'use client';

import { useState, useRef, useCallback } from 'react';
import {
  ToolType,
  StrokeStyle,
  FillStyle,
  DrawingObject,
  Point,
  LiveDraftStroke,
  ViewportTransform,
  UserPresence,
} from '../types';
import { screenToWorld } from '../lib/math';
import { findTopObjectAtPoint } from '../lib/hitTest';

interface UseDrawingToolsProps {
  currentUser: UserPresence | null;
  roomId: string;
  viewport: ViewportTransform;
  objects: DrawingObject[];
  onCommitObject: (obj: DrawingObject) => void;
  onUpdateObject: (objectId: string, updates: Partial<DrawingObject>) => void;
  onDeleteObject: (objectId: string) => void;
  onEmitDraft: (draft: LiveDraftStroke) => void;
  onEmitDraftEnd: (draftId: string) => void;
  onEmitCursor: (point: Point | null) => void;
  onOpenTextEditor?: (position: Point, existingObject?: DrawingObject) => void;
}

export function useDrawingTools({
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
  onOpenTextEditor,
}: UseDrawingToolsProps) {
  const [currentTool, setCurrentTool] = useState<ToolType>('pencil');
  const [strokeColor, setStrokeColor] = useState<string>('#1e293b');
  const [fillColor, setFillColor] = useState<string>('none');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [strokeStyle, setStrokeStyle] = useState<StrokeStyle>('solid');
  const [opacity, setOpacity] = useState<number>(1);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  // Active drawing refs
  const isDrawingRef = useRef(false);
  const activeDraftIdRef = useRef<string | null>(null);
  const currentPointsRef = useRef<Point[]>([]);
  const startPointRef = useRef<Point | null>(null);
  const dragStartRef = useRef<{ point: Point; objInitial: Partial<DrawingObject> } | null>(null);
  const lastEmitTimeRef = useRef<number>(0);
  const lastCursorEmitTimeRef = useRef<number>(0);

  // Generate unique object ID
  const createId = useCallback((prefix = 'obj') => {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  }, []);

  // Handle pointer down
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      // Primary button only for drawing (or stylus/touch)
      if (e.button !== 0) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const screenPt: Point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        pressure: e.pressure || 0.5,
      };
      const worldPt = screenToWorld(screenPt, viewport);

      isDrawingRef.current = true;
      startPointRef.current = worldPt;

      if (currentTool === 'select') {
        const hit = findTopObjectAtPoint(worldPt, objects);
        if (hit) {
          setSelectedObjectId(hit.id);
          dragStartRef.current = {
            point: worldPt,
            objInitial: { ...hit },
          };
        } else {
          setSelectedObjectId(null);
          dragStartRef.current = null;
        }
        return;
      }

      if (currentTool === 'eraser') {
        const hit = findTopObjectAtPoint(worldPt, objects);
        if (hit) {
          onDeleteObject(hit.id);
        }
        return;
      }

      if (currentTool === 'text') {
        const hit = findTopObjectAtPoint(worldPt, objects);
        if (hit && hit.type === 'text') {
          onOpenTextEditor?.(worldPt, hit);
        } else {
          onOpenTextEditor?.(worldPt);
        }
        isDrawingRef.current = false;
        return;
      }

      // Drawing tools (pencil, line, arrow, rectangle, circle)
      const draftId = createId('draft');
      activeDraftIdRef.current = draftId;

      if (currentTool === 'pencil') {
        currentPointsRef.current = [worldPt];
        onEmitDraft({
          id: draftId,
          userId: currentUser?.userId || 'anon',
          userName: currentUser?.userName || 'User',
          userColor: currentUser?.userColor || '#6366f1',
          tool: 'pencil',
          points: [worldPt],
          strokeColor,
          strokeWidth,
        });
      } else {
        // Shapes
        onEmitDraft({
          id: draftId,
          userId: currentUser?.userId || 'anon',
          userName: currentUser?.userName || 'User',
          userColor: currentUser?.userColor || '#6366f1',
          tool: currentTool,
          points: [],
          strokeColor,
          strokeWidth,
          startX: worldPt.x,
          startY: worldPt.y,
          currentX: worldPt.x,
          currentY: worldPt.y,
        });
      }
    },
    [
      currentTool,
      viewport,
      objects,
      strokeColor,
      strokeWidth,
      currentUser,
      createId,
      onDeleteObject,
      onOpenTextEditor,
      onEmitDraft,
    ]
  );

  // Handle pointer move
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const screenPt: Point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        pressure: e.pressure || 0.5,
      };
      const worldPt = screenToWorld(screenPt, viewport);

      // Throttled Cursor broadcast (~30ms for 30fps smooth cursors)
      const now = performance.now();
      if (now - lastCursorEmitTimeRef.current > 30) {
        onEmitCursor(worldPt);
        lastCursorEmitTimeRef.current = now;
      }

      if (!isDrawingRef.current) return;

      if (currentTool === 'select' && dragStartRef.current && selectedObjectId) {
        const dx = worldPt.x - dragStartRef.current.point.x;
        const dy = worldPt.y - dragStartRef.current.point.y;
        const init = dragStartRef.current.objInitial;

        let updates: Partial<DrawingObject> = {};
        if (init.type === 'pencil' && 'points' in init && init.points) {
          updates = {
            points: init.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
          };
        } else if ((init.type === 'line' || init.type === 'arrow') && 'startX' in init) {
          updates = {
            startX: (init.startX ?? 0) + dx,
            startY: (init.startY ?? 0) + dy,
            endX: (init.endX ?? 0) + dx,
            endY: (init.endY ?? 0) + dy,
          };
        } else if (init.type === 'rectangle' && 'x' in init) {
          updates = {
            x: (init.x ?? 0) + dx,
            y: (init.y ?? 0) + dy,
          };
        } else if (init.type === 'circle' && 'centerX' in init) {
          updates = {
            centerX: (init.centerX ?? 0) + dx,
            centerY: (init.centerY ?? 0) + dy,
          };
        } else if (init.type === 'text' && 'x' in init) {
          updates = {
            x: (init.x ?? 0) + dx,
            y: (init.y ?? 0) + dy,
          };
        }

        onUpdateObject(selectedObjectId, updates);
        return;
      }

      if (currentTool === 'eraser') {
        const hit = findTopObjectAtPoint(worldPt, objects);
        if (hit) {
          onDeleteObject(hit.id);
        }
        return;
      }

      // Drawing streaming throttled (~25ms for 40fps streaming)
      const draftId = activeDraftIdRef.current;
      if (!draftId) return;

      if (currentTool === 'pencil') {
        currentPointsRef.current.push(worldPt);

        if (now - lastEmitTimeRef.current > 25) {
          onEmitDraft({
            id: draftId,
            userId: currentUser?.userId || 'anon',
            userName: currentUser?.userName || 'User',
            userColor: currentUser?.userColor || '#6366f1',
            tool: 'pencil',
            points: [...currentPointsRef.current],
            strokeColor,
            strokeWidth,
          });
          lastEmitTimeRef.current = now;
        }
      } else if (startPointRef.current) {
        if (now - lastEmitTimeRef.current > 25) {
          onEmitDraft({
            id: draftId,
            userId: currentUser?.userId || 'anon',
            userName: currentUser?.userName || 'User',
            userColor: currentUser?.userColor || '#6366f1',
            tool: currentTool,
            points: [],
            strokeColor,
            strokeWidth,
            startX: startPointRef.current.x,
            startY: startPointRef.current.y,
            currentX: worldPt.x,
            currentY: worldPt.y,
          });
          lastEmitTimeRef.current = now;
        }
      }
    },
    [
      currentTool,
      viewport,
      selectedObjectId,
      objects,
      strokeColor,
      strokeWidth,
      currentUser,
      onEmitCursor,
      onUpdateObject,
      onDeleteObject,
      onEmitDraft,
    ]
  );

  // Handle pointer up (Commit drawing)
  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;

      const rect = e.currentTarget.getBoundingClientRect();
      const screenPt: Point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        pressure: e.pressure || 0.5,
      };
      const worldPt = screenToWorld(screenPt, viewport);
      const startPt = startPointRef.current;
      const draftId = activeDraftIdRef.current;

      if (draftId) {
        onEmitDraftEnd(draftId);
        activeDraftIdRef.current = null;
      }

      if (currentTool === 'select') {
        dragStartRef.current = null;
        return;
      }

      if (currentTool === 'eraser' || currentTool === 'text') {
        return;
      }

      const baseObj = {
        id: createId(currentTool),
        roomId,
        userId: currentUser?.userId || 'anon',
        userName: currentUser?.userName || 'User',
        userColor: currentUser?.userColor || '#6366f1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        strokeColor,
        fillColor: fillColor !== 'none' ? fillColor : undefined,
        strokeWidth,
        strokeStyle,
        opacity,
        isDeleted: false,
      };

      if (currentTool === 'pencil') {
        if (currentPointsRef.current.length > 0) {
          onCommitObject({
            ...baseObj,
            type: 'pencil',
            points: currentPointsRef.current,
          });
        }
        currentPointsRef.current = [];
      } else if (startPt) {
        // Prevent committing zero-size accidental clicks
        const dx = Math.abs(worldPt.x - startPt.x);
        const dy = Math.abs(worldPt.y - startPt.y);
        if (dx < 3 && dy < 3 && currentTool !== 'circle') {
          return;
        }

        if (currentTool === 'line') {
          onCommitObject({
            ...baseObj,
            type: 'line',
            startX: startPt.x,
            startY: startPt.y,
            endX: worldPt.x,
            endY: worldPt.y,
          });
        } else if (currentTool === 'arrow') {
          onCommitObject({
            ...baseObj,
            type: 'arrow',
            startX: startPt.x,
            startY: startPt.y,
            endX: worldPt.x,
            endY: worldPt.y,
          });
        } else if (currentTool === 'rectangle') {
          const minX = Math.min(startPt.x, worldPt.x);
          const minY = Math.min(startPt.y, worldPt.y);
          const w = Math.abs(worldPt.x - startPt.x);
          const h = Math.abs(worldPt.y - startPt.y);

          onCommitObject({
            ...baseObj,
            type: 'rectangle',
            x: minX,
            y: minY,
            width: w,
            height: h,
            borderRadius: 6,
          });
        } else if (currentTool === 'circle') {
          const rx = Math.abs(worldPt.x - startPt.x) / 2;
          const ry = Math.abs(worldPt.y - startPt.y) / 2;
          const cx = (startPt.x + worldPt.x) / 2;
          const cy = (startPt.y + worldPt.y) / 2;

          onCommitObject({
            ...baseObj,
            type: 'circle',
            centerX: cx,
            centerY: cy,
            radiusX: Math.max(rx, 4),
            radiusY: Math.max(ry, 4),
          });
        }
      }

      startPointRef.current = null;
    },
    [
      currentTool,
      viewport,
      roomId,
      currentUser,
      strokeColor,
      fillColor,
      strokeWidth,
      strokeStyle,
      opacity,
      createId,
      onEmitDraftEnd,
      onCommitObject,
    ]
  );

  // Handle pointer leave
  const handlePointerLeave = useCallback(() => {
    onEmitCursor(null);
    if (isDrawingRef.current) {
      if (activeDraftIdRef.current) {
        onEmitDraftEnd(activeDraftIdRef.current);
        activeDraftIdRef.current = null;
      }
      isDrawingRef.current = false;
    }
  }, [onEmitCursor, onEmitDraftEnd]);

  return {
    currentTool,
    setCurrentTool,
    strokeColor,
    setStrokeColor,
    fillColor,
    setFillColor,
    strokeWidth,
    setStrokeWidth,
    strokeStyle,
    setStrokeStyle,
    opacity,
    setOpacity,
    selectedObjectId,
    setSelectedObjectId,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
  };
}
