'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  DrawingObject,
  UserPresence,
  LiveDraftStroke,
  Point,
  RoomState,
} from '../types';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

interface UseSocketProps {
  roomId: string;
  userName: string;
  userId?: string;
  onObjectCreated?: (obj: DrawingObject) => void;
  onObjectUpdated?: (objectId: string, updates: Partial<DrawingObject>) => void;
  onObjectDeleted?: (objectId: string) => void;
  onCanvasCleared?: () => void;
  onUndoPerformed?: (objectId: string, isDeleted: boolean) => void;
  onRedoPerformed?: (objectId: string, isDeleted: boolean) => void;
}

export function useSocket({
  roomId,
  userName,
  userId,
  onObjectCreated,
  onObjectUpdated,
  onObjectDeleted,
  onCanvasCleared,
  onUndoPerformed,
  onRedoPerformed,
}: UseSocketProps) {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [currentUser, setCurrentUser] = useState<UserPresence | null>(null);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, { user: UserPresence; cursor: Point | null }>>(new Map());
  const [remoteDrafts, setRemoteDrafts] = useState<Map<string, LiveDraftStroke>>(new Map());
  const [initialObjects, setInitialObjects] = useState<DrawingObject[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Backend Socket URL
  const backendUrl =
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://localhost:5000';

  useEffect(() => {
    if (!roomId) return;

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionStatus('connected');
      setErrorMessage(null);

      // Join room with user name
      socket.emit('join-room', {
        roomId,
        userName: userName || 'Anonymous',
        userId: userId || undefined,
      });
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
      setConnectionStatus('reconnecting');
    });

    socket.on('disconnect', (reason) => {
      console.warn('Socket disconnected:', reason);
      setConnectionStatus('disconnected');
    });

    socket.on('room-joined', (data) => {
      setCurrentUser(data.self);
      setUsers(data.room.users);
      setInitialObjects(data.room.objects);
      setIsInitialized(true);
    });

    socket.on('user-joined', (newUser) => {
      setUsers((prev) => {
        const filtered = prev.filter((u) => u.userId !== newUser.userId && u.socketId !== newUser.socketId);
        return [...filtered, newUser];
      });
    });

    socket.on('user-left', (data) => {
      setUsers((prev) => prev.filter((u) => u.socketId !== data.socketId && u.userId !== data.userId));
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.delete(data.socketId);
        return next;
      });
      setRemoteDrafts((prev) => {
        const next = new Map(prev);
        for (const [key, draft] of next.entries()) {
          if (draft.userId === data.userId) {
            next.delete(key);
          }
        }
        return next;
      });
    });

    socket.on('presence-update', (updatedUsers) => {
      setUsers(updatedUsers);
    });

    socket.on('cursor-update', (data) => {
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.set(data.socketId, {
          user: {
            userId: data.userId,
            socketId: data.socketId,
            userName: data.userName,
            userColor: data.userColor,
            joinedAt: Date.now(),
          },
          cursor: data.cursor,
        });
        return next;
      });
    });

    socket.on('draw-stream', (draft) => {
      setRemoteDrafts((prev) => {
        const next = new Map(prev);
        next.set(draft.id, draft);
        return next;
      });
    });

    socket.on('draw-stream-end', (data) => {
      setRemoteDrafts((prev) => {
        const next = new Map(prev);
        next.delete(data.draftId);
        return next;
      });
    });

    socket.on('object-created', (obj) => {
      onObjectCreated?.(obj);
    });

    socket.on('object-updated', (data) => {
      onObjectUpdated?.(data.objectId, data.updates);
    });

    socket.on('object-deleted', (data) => {
      onObjectDeleted?.(data.objectId);
    });

    socket.on('undo-performed', (data) => {
      onUndoPerformed?.(data.objectId, data.isDeleted);
    });

    socket.on('redo-performed', (data) => {
      onRedoPerformed?.(data.objectId, data.isDeleted);
    });

    socket.on('canvas-cleared', () => {
      onCanvasCleared?.();
    });

    socket.on('room-error', (data) => {
      setErrorMessage(data.message);
    });

    return () => {
      socket.emit('leave-room', { roomId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, userName, userId, backendUrl]);

  // Emitters
  const emitCursorMove = useCallback(
    (point: Point | null) => {
      if (!socketRef.current || socketRef.current.disconnected) return;
      socketRef.current.emit('cursor-move', { roomId, point });
    },
    [roomId]
  );

  const emitDrawStream = useCallback(
    (draft: LiveDraftStroke) => {
      if (!socketRef.current || socketRef.current.disconnected) return;
      socketRef.current.emit('draw-stream', { roomId, draft });
    },
    [roomId]
  );

  const emitDrawStreamEnd = useCallback(
    (draftId: string) => {
      if (!socketRef.current || socketRef.current.disconnected) return;
      socketRef.current.emit('draw-stream-end', { roomId, draftId });
    },
    [roomId]
  );

  const emitObjectCreate = useCallback(
    (object: DrawingObject) => {
      if (!socketRef.current || socketRef.current.disconnected) return;
      socketRef.current.emit('object-create', { roomId, object });
    },
    [roomId]
  );

  const emitObjectUpdate = useCallback(
    (objectId: string, updates: Partial<DrawingObject>) => {
      if (!socketRef.current || socketRef.current.disconnected) return;
      socketRef.current.emit('object-update', { roomId, objectId, updates });
    },
    [roomId]
  );

  const emitObjectDelete = useCallback(
    (objectId: string) => {
      if (!socketRef.current || socketRef.current.disconnected) return;
      socketRef.current.emit('object-delete', { roomId, objectId });
    },
    [roomId]
  );

  const emitUndo = useCallback(() => {
    if (!socketRef.current || socketRef.current.disconnected) return;
    socketRef.current.emit('undo', { roomId });
  }, [roomId]);

  const emitRedo = useCallback(() => {
    if (!socketRef.current || socketRef.current.disconnected) return;
    socketRef.current.emit('redo', { roomId });
  }, [roomId]);

  const emitClearCanvas = useCallback(() => {
    if (!socketRef.current || socketRef.current.disconnected) return;
    socketRef.current.emit('clear-canvas', { roomId });
  }, [roomId]);

  return {
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
  };
}
