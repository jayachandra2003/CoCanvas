'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { CanvasElement } from '@/types/canvas';

export interface UserPresence {
  clientId: string;
  name: string;
  color: string;
}

export const USER_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#EF4444', // Red
  '#14B8A6', // Teal
];

const USER_NAMES = [
  'Creative Fox',
  'Swift Falcon',
  'Bright Otter',
  'Clever Owl',
  'Cosmic Bear',
  'Daring Lynx',
  'Golden Eagle',
  'Neon Wolf',
];

export function getRandomUser(): UserPresence {
  const randomColor = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
  const randomName = USER_NAMES[Math.floor(Math.random() * USER_NAMES.length)];
  const clientId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return { clientId, name: randomName, color: randomColor };
}

export interface UseYjsRoomReturn {
  elements: CanvasElement[];
  localUser: UserPresence;
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, partial: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  deleteElements: (ids: string[]) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  doc: Y.Doc;
}

export function useYjsRoom(
  roomId: string = 'default-room',
  initialElements: CanvasElement[] = []
): UseYjsRoomReturn {
  const docRef = useRef<Y.Doc | null>(null);
  const elementsMapRef = useRef<Y.Map<CanvasElement> | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const localUserRef = useRef<UserPresence | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  const [elements, setElements] = useState<CanvasElement[]>(initialElements);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  // Initialize Local User Identity
  if (!localUserRef.current) {
    localUserRef.current = getRandomUser();
  }

  // Initialize Doc, Map, and UndoManager
  if (!docRef.current) {
    const doc = new Y.Doc();
    const elementsMap = doc.getMap<CanvasElement>('elements');
    const localOrigin = localUserRef.current.clientId;

    // Track only transactions authored by this specific local client
    const undoManager = new Y.UndoManager(elementsMap, {
      trackedOrigins: new Set([localOrigin]),
      captureTimeout: 0,
    });

    if (initialElements.length > 0) {
      doc.transact(() => {
        for (const el of initialElements) {
          elementsMap.set(el.id, el);
        }
      }, localOrigin);
    }

    docRef.current = doc;
    elementsMapRef.current = elementsMap;
    undoManagerRef.current = undoManager;
  }

  useEffect(() => {
    const doc = docRef.current;
    const elementsMap = elementsMapRef.current;
    const undoManager = undoManagerRef.current;
    const localUser = localUserRef.current;
    if (!doc || !elementsMap || !undoManager || !localUser) return;

    // Set up BroadcastChannel for instant local multi-tab CRDT sync
    const channelName = `collab_sync_${roomId}`;
    const channel = new BroadcastChannel(channelName);
    broadcastChannelRef.current = channel;

    // Sync state to React
    const syncElementsFromMap = () => {
      const arr: CanvasElement[] = [];
      elementsMap.forEach((val) => {
        if (!val.isDeleted) {
          arr.push(val);
        }
      });
      arr.sort((a, b) => a.createdAt - b.createdAt);
      setElements(arr);
    };

    const updateUndoRedoState = () => {
      setCanUndo(undoManager.undoStack.length > 0);
      setCanRedo(undoManager.redoStack.length > 0);
    };

    syncElementsFromMap();
    updateUndoRedoState();

    // 1. Listen for local document updates and broadcast to other local tabs
    const handleDocUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === localUser.clientId) {
        // Send binary update as ArrayBuffer to other tabs
        channel.postMessage({
          type: 'yjs-update',
          update: Array.from(update),
          senderId: localUser.clientId,
        });
      }
    };

    // 2. Listen for remote updates from other tabs
    channel.onmessage = (event) => {
      const data = event.data;
      if (data && data.type === 'yjs-update' && data.senderId !== localUser.clientId) {
        const updateArray = new Uint8Array(data.update);
        // Apply update with remote sender origin so local UndoManager ignores it
        Y.applyUpdate(doc, updateArray, data.senderId);
      } else if (data && data.type === 'request-state' && data.senderId !== localUser.clientId) {
        // A new tab opened and requested current state
        const stateUpdate = Y.encodeStateAsUpdate(doc);
        channel.postMessage({
          type: 'yjs-update',
          update: Array.from(stateUpdate),
          senderId: localUser.clientId,
        });
      }
    };

    // Request current state from other existing tabs in the room
    channel.postMessage({
      type: 'request-state',
      senderId: localUser.clientId,
    });

    const mapObserver = () => {
      syncElementsFromMap();
      updateUndoRedoState();
    };

    const undoObserver = () => {
      updateUndoRedoState();
    };

    doc.on('update', handleDocUpdate);
    elementsMap.observe(mapObserver);
    undoManager.on('stack-item-added', undoObserver);
    undoManager.on('stack-item-popped', undoObserver);
    undoManager.on('stack-cleared', undoObserver);

    return () => {
      doc.off('update', handleDocUpdate);
      elementsMap.unobserve(mapObserver);
      undoManager.off('stack-item-added', undoObserver);
      undoManager.off('stack-item-popped', undoObserver);
      undoManager.off('stack-cleared', undoObserver);
      channel.close();
    };
  }, [roomId]);

  // Mutations authored by local client
  const addElement = useCallback((element: CanvasElement) => {
    const doc = docRef.current;
    const elementsMap = elementsMapRef.current;
    const localUser = localUserRef.current;
    if (!doc || !elementsMap || !localUser) return;

    doc.transact(() => {
      elementsMap.set(element.id, {
        ...element,
        createdBy: localUser.clientId,
      });
    }, localUser.clientId);
  }, []);

  const updateElement = useCallback((id: string, partial: Partial<CanvasElement>) => {
    const doc = docRef.current;
    const elementsMap = elementsMapRef.current;
    const localUser = localUserRef.current;
    if (!doc || !elementsMap || !localUser) return;

    const existing = elementsMap.get(id);
    if (!existing) return;

    doc.transact(() => {
      elementsMap.set(id, {
        ...existing,
        ...partial,
        updatedAt: Date.now(),
      });
    }, localUser.clientId);
  }, []);

  const deleteElement = useCallback((id: string) => {
    const doc = docRef.current;
    const elementsMap = elementsMapRef.current;
    const localUser = localUserRef.current;
    if (!doc || !elementsMap || !localUser) return;

    doc.transact(() => {
      elementsMap.delete(id);
    }, localUser.clientId);
  }, []);

  const deleteElements = useCallback((ids: string[]) => {
    const doc = docRef.current;
    const elementsMap = elementsMapRef.current;
    const localUser = localUserRef.current;
    if (!doc || !elementsMap || !localUser || ids.length === 0) return;

    doc.transact(() => {
      for (const id of ids) {
        elementsMap.delete(id);
      }
    }, localUser.clientId);
  }, []);

  const undo = useCallback(() => {
    const undoManager = undoManagerRef.current;
    if (undoManager && undoManager.undoStack.length > 0) {
      undoManager.undo();
    }
  }, []);

  const redo = useCallback(() => {
    const undoManager = undoManagerRef.current;
    if (undoManager && undoManager.redoStack.length > 0) {
      undoManager.redo();
    }
  }, []);

  return {
    elements,
    localUser: localUserRef.current!,
    addElement,
    updateElement,
    deleteElement,
    deleteElements,
    undo,
    redo,
    canUndo,
    canRedo,
    doc: docRef.current!,
  };
}
