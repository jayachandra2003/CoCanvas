'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  DrawingObject,
  ToolType,
  StrokeStyle,
  Point,
  LiveDraftStroke,
} from '@/types';
import { useSocket } from '@/hooks/useSocket';
import { Canvas } from '@/components/canvas/Canvas';
import { RoomHeader } from '@/components/header/RoomHeader';
import { MainToolbar } from '@/components/toolbar/MainToolbar';
import { StyleToolbar } from '@/components/toolbar/StyleToolbar';
import { ShareModal } from '@/components/header/ShareModal';
import { ToastContainer, ToastMessage } from '@/components/ui/Toast';
import { renderObject } from '@/lib/canvasRenderer';
import { getBoundingBox } from '@/lib/math';

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = (params?.roomId as string)?.toUpperCase() || 'DEFAULT';
  const rawUserName = searchParams.get('name') || '';

  const [userName, setUserName] = useState<string>('');
  const [objects, setObjects] = useState<DrawingObject[]>([]);
  const [currentTool, setCurrentTool] = useState<ToolType>('pencil');
  const [strokeColor, setStrokeColor] = useState<string>('#0f172a');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [fillColor, setFillColor] = useState<string>('none');
  const [strokeStyle, setStrokeStyle] = useState<StrokeStyle>('solid');
  const [opacity, setOpacity] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Persistent user identity
  useEffect(() => {
    let name = rawUserName;
    if (!name && typeof window !== 'undefined') {
      name = localStorage.getItem('collabdraw_username') || `Creator ${Math.floor(Math.random() * 900 + 100)}`;
      localStorage.setItem('collabdraw_username', name);
    }
    setUserName(name);
  }, [rawUserName]);

  // Toast Helper
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Socket Hook
  const {
    connectionStatus,
    users,
    currentUser,
    remoteCursors,
    remoteDrafts,
    initialObjects,
    isInitialized,
    errorMessage,
    emitCursorMove,
    emitDrawStream,
    emitDrawStreamEnd,
    emitObjectCreate,
    emitObjectUpdate,
    emitObjectDelete,
    emitUndo,
    emitRedo,
    emitClearCanvas,
  } = useSocket({
    roomId,
    userName,
    onObjectCreated: (newObj) => {
      setObjects((prev) => {
        const exists = prev.some((o) => o.id === newObj.id);
        if (exists) {
          return prev.map((o) => (o.id === newObj.id ? newObj : o));
        }
        return [...prev, newObj];
      });
    },
    onObjectUpdated: (objectId, updates) => {
      setObjects((prev) =>
        prev.map((o) => (o.id === objectId ? ({ ...o, ...updates } as DrawingObject) : o))
      );
    },
    onObjectDeleted: (objectId) => {
      setObjects((prev) =>
        prev.map((o) => (o.id === objectId ? { ...o, isDeleted: true } : o))
      );
    },
    onUndoPerformed: (objectId, isDeleted) => {
      setObjects((prev) =>
        prev.map((o) => (o.id === objectId ? { ...o, isDeleted } : o))
      );
    },
    onRedoPerformed: (objectId, isDeleted) => {
      setObjects((prev) =>
        prev.map((o) => (o.id === objectId ? { ...o, isDeleted } : o))
      );
    },
    onCanvasCleared: () => {
      setObjects([]);
      showToast('Canvas cleared by collaborator', 'info');
    },
  });

  // Sync initial persisted objects from room
  useEffect(() => {
    if (initialObjects.length > 0) {
      setObjects(initialObjects);
    }
  }, [initialObjects]);

  // Handle local drawing actions
  const handleCommitObject = useCallback(
    (newObj: DrawingObject) => {
      // Optimistic local add
      setObjects((prev) => [...prev, newObj]);
      // Network broadcast
      emitObjectCreate(newObj);
    },
    [emitObjectCreate]
  );

  const handleUpdateObject = useCallback(
    (objectId: string, updates: Partial<DrawingObject>) => {
      setObjects((prev) =>
        prev.map((o) => (o.id === objectId ? ({ ...o, ...updates } as DrawingObject) : o))
      );
      emitObjectUpdate(objectId, updates);
    },
    [emitObjectUpdate]
  );

  const handleDeleteObject = useCallback(
    (objectId: string) => {
      setObjects((prev) =>
        prev.map((o) => (o.id === objectId ? { ...o, isDeleted: true } : o))
      );
      emitObjectDelete(objectId);
    },
    [emitObjectDelete]
  );

  const handleClearCanvas = useCallback(() => {
    setObjects([]);
    emitClearCanvas();
    showToast('Canvas cleared', 'info');
  }, [emitClearCanvas, showToast]);

  // Export as PNG
  const handleExportPNG = useCallback(() => {
    const activeObjects = objects.filter((o) => !o.isDeleted);
    if (activeObjects.length === 0) {
      showToast('Canvas is empty', 'info');
      return;
    }

    // Compute bounding box containing all drawings
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const obj of activeObjects) {
      const b = getBoundingBox(obj);
      if (b.minX < minX) minX = b.minX;
      if (b.minY < minY) minY = b.minY;
      if (b.maxX > maxX) maxX = b.maxX;
      if (b.maxY > maxY) maxY = b.maxY;
    }

    const padding = 40;
    const width = Math.max(200, maxX - minX + padding * 2);
    const height = Math.max(200, maxY - minY + padding * 2);

    const offscreen = document.createElement('canvas');
    offscreen.width = width * 2; // 2x high resolution
    offscreen.height = height * 2;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    ctx.scale(2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(-minX + padding, -minY + padding);
    for (const obj of activeObjects) {
      renderObject(ctx, obj);
    }
    ctx.restore();

    const link = document.createElement('a');
    link.download = `collabdraw_${roomId}_${Date.now()}.png`;
    link.href = offscreen.toDataURL('image/png');
    link.click();
    showToast('Exported PNG successfully', 'success');
  }, [objects, roomId, showToast]);

  // Export as SVG
  const handleExportSVG = useCallback(() => {
    const activeObjects = objects.filter((o) => !o.isDeleted);
    if (activeObjects.length === 0) {
      showToast('Canvas is empty', 'info');
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const obj of activeObjects) {
      const b = getBoundingBox(obj);
      if (b.minX < minX) minX = b.minX;
      if (b.minY < minY) minY = b.minY;
      if (b.maxX > maxX) maxX = b.maxX;
      if (b.maxY > maxY) maxY = b.maxY;
    }

    const pad = 40;
    const width = Math.max(200, maxX - minX + pad * 2);
    const height = Math.max(200, maxY - minY + pad * 2);

    let svgElements = '';
    for (const obj of activeObjects) {
      const stroke = obj.strokeColor;
      const sw = obj.strokeWidth;
      const fill = obj.fillColor && obj.fillColor !== 'none' ? obj.fillColor : 'none';

      if (obj.type === 'pencil' && obj.points.length > 0) {
        const pathData = obj.points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x - minX + pad} ${p.y - minY + pad}`, '');
        svgElements += `<path d="${pathData}" stroke="${stroke}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round" />\n`;
      } else if (obj.type === 'line') {
        svgElements += `<line x1="${obj.startX - minX + pad}" y1="${obj.startY - minY + pad}" x2="${obj.endX - minX + pad}" y2="${obj.endY - minX + pad}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" />\n`;
      } else if (obj.type === 'rectangle') {
        svgElements += `<rect x="${obj.x - minX + pad}" y="${obj.y - minY + pad}" width="${obj.width}" height="${obj.height}" rx="${obj.borderRadius || 6}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}" />\n`;
      } else if (obj.type === 'circle') {
        svgElements += `<ellipse cx="${obj.centerX - minX + pad}" cy="${obj.centerY - minY + pad}" rx="${obj.radiusX}" ry="${obj.radiusY}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}" />\n`;
      } else if (obj.type === 'text') {
        svgElements += `<text x="${obj.x - minX + pad}" y="${obj.y - minY + pad + 20}" fill="${stroke}" font-size="${obj.fontSize || 20}" font-family="${obj.fontFamily || 'Inter, sans-serif'}">${obj.text}</text>\n`;
      }
    }

    const svgDoc = `<?xml version="1.0" standalone="no"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#ffffff" />
  ${svgElements}
</svg>`;

    const blob = new Blob([svgDoc], { type: 'image/svg+xml;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `collabdraw_${roomId}_${Date.now()}.svg`;
    link.click();
    showToast('Exported SVG successfully', 'success');
  }, [objects, roomId, showToast]);

  // Export as JSON Snapshot
  const handleExportJSON = useCallback(() => {
    const data = {
      version: '1.0',
      roomId,
      exportedAt: new Date().toISOString(),
      objects: objects.filter((o) => !o.isDeleted),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `collabdraw_${roomId}.json`;
    link.click();
    showToast('Exported JSON snapshot', 'success');
  }, [objects, roomId, showToast]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-50 select-none">
      {/* 1. Top Header */}
      <RoomHeader
        roomId={roomId}
        connectionStatus={connectionStatus}
        users={users}
        currentUser={currentUser}
        onOpenShare={() => setIsShareOpen(true)}
        onClearCanvas={handleClearCanvas}
        onExportPNG={handleExportPNG}
        onExportSVG={handleExportSVG}
        onExportJSON={handleExportJSON}
      />

      {/* 2. Top Floating Dock Toolbar */}
      <MainToolbar
        currentTool={currentTool}
        onSelectTool={setCurrentTool}
        onUndo={emitUndo}
        onRedo={emitRedo}
        zoom={zoom}
        onZoomIn={() => setZoom((z) => Math.min(5, z * 1.15))}
        onZoomOut={() => setZoom((z) => Math.max(0.1, z / 1.15))}
        onResetZoom={() => setZoom(1)}
      />

      {/* 3. Left Floating Style Palette */}
      <StyleToolbar
        currentTool={currentTool}
        strokeColor={strokeColor}
        onChangeStrokeColor={setStrokeColor}
        strokeWidth={strokeWidth}
        onChangeStrokeWidth={setStrokeWidth}
        fillColor={fillColor}
        onChangeFillColor={setFillColor}
        strokeStyle={strokeStyle}
        onChangeStrokeStyle={setStrokeStyle}
        opacity={opacity}
        onChangeOpacity={setOpacity}
      />

      {/* 4. Canvas Engine */}
      <Canvas
        roomId={roomId}
        currentUser={currentUser}
        objects={objects}
        remoteCursors={remoteCursors}
        remoteDrafts={remoteDrafts}
        currentTool={currentTool}
        onChangeTool={setCurrentTool}
        strokeColor={strokeColor}
        onChangeStrokeColor={setStrokeColor}
        strokeWidth={strokeWidth}
        onChangeStrokeWidth={setStrokeWidth}
        fillColor={fillColor}
        onChangeFillColor={setFillColor}
        strokeStyle={strokeStyle}
        onChangeStrokeStyle={setStrokeStyle}
        opacity={opacity}
        onChangeOpacity={setOpacity}
        onCommitObject={handleCommitObject}
        onUpdateObject={handleUpdateObject}
        onDeleteObject={handleDeleteObject}
        onEmitDraft={emitDrawStream}
        onEmitDraftEnd={emitDrawStreamEnd}
        onEmitCursor={emitCursorMove}
        onUndo={emitUndo}
        onRedo={emitRedo}
        zoom={zoom}
        onZoomChange={setZoom}
      />

      {/* 5. Share Modal */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        roomId={roomId}
        onShowToast={showToast}
      />

      {/* 6. Notifications Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}
