'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { IndexeddbPersistence } from 'y-indexeddb';
import { CanvasElement, ToolType, Point } from '@/types/canvas';
import {
  UserPresenceData,
  PeerAwarenessState,
  ConnectionStatus,
} from '@/types/presence';
import {
  saveRoomSnapshotToFirestore,
  loadRoomSnapshotFromFirestore,
} from '@/lib/firebase';

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
  isIndexedDbSynced: boolean;
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, partial: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  deleteElements: (ids: string[]) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  updateCursor: (worldPos: Point | null, activeTool: ToolType) => void;
  updateSelection: (selectedIds: string[]) => void;
  doc: Y.Doc;
}

export function useYjsRoom(
  roomId: string = 'default-room',
  initialElements: CanvasElement[] = []
): UseYjsRoomReturn {
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebrtcProvider | null>(null);
  const idbRef = useRef<IndexeddbPersistence | null>(null);
  const elementsMapRef = useRef<Y.Map<CanvasElement> | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const localUserRef = useRef<UserPresenceData | null>(null);
  const snapshotDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  const [elements, setElements] = useState<CanvasElement[]>(initialElements);
  const [peers, setPeers] = useState<PeerAwarenessState[]>([]);
  const [peerCount, setPeerCount] = useState<number>(1);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [isIndexedDbSynced, setIsIndexedDbSynced] = useState<boolean>(false);
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

    const roomName = `collab-canvas-${roomId}`;

    // 1. Initialize Local-First IndexedDB Persistence
    const idbProvider = new IndexeddbPersistence(roomName, doc);
    idbRef.current = idbProvider;

    idbProvider.on('synced', () => {
      setIsIndexedDbSynced(true);
      syncElementsFromMap();

      // If document is still empty after loading IndexedDB, check Firestore snapshot for zero-peer rehydration
      if (elementsMap.size === 0) {
        loadRoomSnapshotFromFirestore(roomId).then((snapshot) => {
          if (snapshot && elementsMap.size === 0) {
            Y.applyUpdate(doc, snapshot, 'firestore-rehydration');
          }
        });
      }
    });

    // 2. Initialize Decentralized WebRTC Transport
    const provider = new WebrtcProvider(roomName, doc, {
      signaling: SIGNALING_SERVERS,
    });
    providerRef.current = provider;

    // Set initial awareness state
    provider.awareness.setLocalState({
      user: localUser,
      cursor: null,
      activeTool: 'pen',
      selectedElementIds: [],
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
            selectedElementIds: state.selectedElementIds || [],
            lastActive: state.lastActive || Date.now(),
          });
        }
      });

      setPeers(peerList);
      setPeerCount(states.size);
    };

    // Connection status handlers
    const handleStatus = (event: { connected: boolean }) => {
      if (!navigator.onLine) {
        setConnectionStatus('offline');
      } else if (event.connected) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('connecting');
      }
    };

    // Online/Offline Browser Event Handlers
    const handleBrowserOnline = () => {
      setConnectionStatus('connected');
    };

    const handleBrowserOffline = () => {
      setConnectionStatus('offline');
    };

    // Debounced Firestore snapshot writing
    const handleDocUpdate = () => {
      if (snapshotDebounceTimer.current) {
        clearTimeout(snapshotDebounceTimer.current);
      }
      snapshotDebounceTimer.current = setTimeout(() => {
        const updateBinary = Y.encodeStateAsUpdate(doc);
        saveRoomSnapshotToFirestore(roomId, updateBinary);
      }, 3000);
    };

    syncElementsFromMap();
    updateUndoRedoState();
    handleAwarenessChange();

    elementsMap.observe(syncElementsFromMap);
    doc.on('update', handleDocUpdate);
    undoManager.on('stack-item-added', updateUndoRedoState);
    undoManager.on('stack-item-popped', updateUndoRedoState);
    undoManager.on('stack-cleared', updateUndoRedoState);

    provider.awareness.on('change', handleAwarenessChange);
    provider.on('status', handleStatus);
    provider.on('peers', handleAwarenessChange);

    window.addEventListener('online', handleBrowserOnline);
    window.addEventListener('offline', handleBrowserOffline);

    setConnectionStatus(navigator.onLine ? 'connected' : 'offline');

    return () => {
      if (snapshotDebounceTimer.current) {
        clearTimeout(snapshotDebounceTimer.current);
      }
      elementsMap.unobserve(syncElementsFromMap);
      doc.off('update', handleDocUpdate);
      undoManager.off('stack-item-added', updateUndoRedoState);
      undoManager.off('stack-item-popped', updateUndoRedoState);
      undoManager.off('stack-cleared', updateUndoRedoState);
      provider.awareness.off('change', handleAwarenessChange);
      provider.off('status', handleStatus);
      provider.off('peers', handleAwarenessChange);
      window.removeEventListener('online', handleBrowserOnline);
      window.removeEventListener('offline', handleBrowserOffline);
      provider.destroy();
      idbProvider.destroy();
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

  // Update selected elements in awareness
  const updateSelection = useCallback((selectedIds: string[]) => {
    const provider = providerRef.current;
    if (!provider) return;

    provider.awareness.setLocalStateField('selectedElementIds', selectedIds);
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
    isIndexedDbSynced,
    addElement,
    updateElement,
    deleteElement,
    deleteElements,
    undo,
    redo,
    canUndo,
    canRedo,
    updateCursor,
    updateSelection,
    doc: docRef.current!,
  };
}
