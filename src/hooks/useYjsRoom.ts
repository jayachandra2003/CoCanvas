'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { CanvasElement, ToolType, Point } from '@/types/canvas';
import {
  UserPresenceData,
  PeerAwarenessState,
  ConnectionStatus,
} from '@/types/presence';

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

export function getRandomUser(): UserPresenceData {
  const randomColor = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
  const randomName = USER_NAMES[Math.floor(Math.random() * USER_NAMES.length)];
  const clientId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return { clientId, name: randomName, color: randomColor };
}

const SIGNALING_SERVERS = [
  'wss://signaling.yjs.dev',
  'wss://y-webrtc-signaling-eu.herokuapp.com',
  'wss://y-webrtc-signaling-us.herokuapp.com',
];

export interface UseYjsRoomReturn {
  elements: CanvasElement[];
  localUser: UserPresenceData;
  peers: PeerAwarenessState[];
  connectionStatus: ConnectionStatus;
  peerCount: number;
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, partial: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  deleteElements: (ids: string[]) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  updateCursor: (worldPos: Point | null, activeTool: ToolType) => void;
  doc: Y.Doc;
}

export function useYjsRoom(
  roomId: string = 'default-room',
  initialElements: CanvasElement[] = []
): UseYjsRoomReturn {
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebrtcProvider | null>(null);
  const elementsMapRef = useRef<Y.Map<CanvasElement> | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const localUserRef = useRef<UserPresenceData | null>(null);

  const [elements, setElements] = useState<CanvasElement[]>(initialElements);
  const [peers, setPeers] = useState<PeerAwarenessState[]>([]);
  const [peerCount, setPeerCount] = useState<number>(1);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
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

    // Connect WebRTC Provider
    const provider = new WebrtcProvider(`collab-canvas-${roomId}`, doc, {
      signaling: SIGNALING_SERVERS,
    });
    providerRef.current = provider;

    // Set initial awareness state
    provider.awareness.setLocalState({
      user: localUser,
      cursor: null,
      activeTool: 'pen',
      lastActive: Date.now(),
    });

    // Sync elements to React state
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

    // Update awareness peers
    const handleAwarenessChange = () => {
      const states = provider.awareness.getStates();
      const peerList: PeerAwarenessState[] = [];
      const currentClientId = doc.clientID;

      states.forEach((state, clientKey) => {
        if (clientKey !== currentClientId && state.user) {
          peerList.push({
            user: state.user,
            cursor: state.cursor || null,
            activeTool: state.activeTool || 'pen',
            lastActive: state.lastActive || Date.now(),
          });
        }
      });

      setPeers(peerList);
      setPeerCount(states.size);
    };

    // Listen for connection status
    const handleStatus = (event: { connected: boolean }) => {
      if (event.connected) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('connecting');
      }
    };

    // Listen for peer connection updates
    const handlePeers = () => {
      handleAwarenessChange();
    };

    syncElementsFromMap();
    updateUndoRedoState();
    handleAwarenessChange();

    elementsMap.observe(syncElementsFromMap);
    undoManager.on('stack-item-added', updateUndoRedoState);
    undoManager.on('stack-item-popped', updateUndoRedoState);
    undoManager.on('stack-cleared', updateUndoRedoState);

    provider.awareness.on('change', handleAwarenessChange);
    provider.on('status', handleStatus);
    provider.on('peers', handlePeers);

    // Default status to connected once provider is up
    setConnectionStatus('connected');

    return () => {
      elementsMap.unobserve(syncElementsFromMap);
      undoManager.off('stack-item-added', updateUndoRedoState);
      undoManager.off('stack-item-popped', updateUndoRedoState);
      undoManager.off('stack-cleared', updateUndoRedoState);
      provider.awareness.off('change', handleAwarenessChange);
      provider.off('status', handleStatus);
      provider.off('peers', handlePeers);
      provider.destroy();
    };
  }, [roomId]);

  // Update cursor position in awareness
  const updateCursor = useCallback((worldPos: Point | null, activeTool: ToolType) => {
    const provider = providerRef.current;
    const localUser = localUserRef.current;
    if (!provider || !localUser) return;

    provider.awareness.setLocalStateField('cursor', worldPos);
    provider.awareness.setLocalStateField('activeTool', activeTool);
    provider.awareness.setLocalStateField('lastActive', Date.now());
  }, []);

  // Mutations
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
    peers,
    peerCount,
    connectionStatus,
    addElement,
    updateElement,
    deleteElement,
    deleteElements,
    undo,
    redo,
    canUndo,
    canRedo,
    updateCursor,
    doc: docRef.current!,
  };
}
