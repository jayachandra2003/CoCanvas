import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  DrawingObject,
} from '../../../shared/types';
import { RoomManager } from '../rooms/RoomManager';
import {
  JoinRoomSchema,
  CursorMoveSchema,
  LiveDraftStrokeSchema,
  ObjectCreateSchema,
  ObjectUpdateSchema,
  ObjectDeleteSchema,
} from './validation';

export function setupSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>
) {
  const roomManager = RoomManager.getInstance();

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    let currentRoomId: string | null = null;
    let currentUserId: string | null = null;

    // 1. Join Room
    socket.on('join-room', async (rawPayload) => {
      const parsed = JoinRoomSchema.safeParse(rawPayload);
      if (!parsed.success) {
        socket.emit('room-error', {
          message: 'Invalid room join payload',
          code: 'INVALID_JOIN_PAYLOAD',
        });
        return;
      }

      const { roomId, userName, userId } = parsed.data;
      currentRoomId = roomId;

      try {
        const { room, user } = await roomManager.addUser(
          roomId,
          socket.id,
          userName,
          userId
        );
        currentUserId = user.userId;

        socket.join(roomId);

        // Send full room snapshot to joining user
        socket.emit('room-joined', {
          room: roomManager.getRoomState(room),
          self: user,
        });

        // Notify other room participants
        socket.to(roomId).emit('user-joined', user);
      } catch (err) {
        console.error('Error joining room:', err);
        socket.emit('room-error', {
          message: 'Could not join drawing room',
          code: 'JOIN_ERROR',
        });
      }
    });

    // 2. Cursor Move (Throttled & streamed)
    socket.on('cursor-move', (rawPayload) => {
      const parsed = CursorMoveSchema.safeParse(rawPayload);
      if (!parsed.success) return;

      const { roomId, point } = parsed.data;
      const user = roomManager.updateCursor(roomId, socket.id, point);
      if (user) {
        socket.to(roomId).emit('cursor-update', {
          socketId: socket.id,
          userId: user.userId,
          userName: user.userName,
          userColor: user.userColor,
          cursor: point,
        });
      }
    });

    // 3. Live Drawing Stream (In-flight strokes)
    socket.on('draw-stream', (rawPayload) => {
      const parsed = LiveDraftStrokeSchema.safeParse(rawPayload.draft);
      if (!parsed.success) return;

      socket.to(rawPayload.roomId).emit('draw-stream', parsed.data);
    });

    // 4. Live Drawing Stream End
    socket.on('draw-stream-end', (payload) => {
      if (!payload?.roomId || !payload?.draftId) return;
      socket.to(payload.roomId).emit('draw-stream-end', {
        draftId: payload.draftId,
        userId: currentUserId || socket.id,
      });
    });

    // 5. Commit Drawing Object
    socket.on('object-create', (rawPayload) => {
      const parsed = ObjectCreateSchema.safeParse(rawPayload);
      if (!parsed.success) {
        console.warn('Object create validation failed:', parsed.error.issues);
        return;
      }

      const { roomId, object } = parsed.data;
      roomManager.addObject(roomId, object as DrawingObject);

      // Broadcast new object to ALL clients in the room
      io.in(roomId).emit('object-created', object as DrawingObject);
    });

    // 6. Update Drawing Object (Move, resize, text change)
    socket.on('object-update', (rawPayload) => {
      const parsed = ObjectUpdateSchema.safeParse(rawPayload);
      if (!parsed.success) return;

      const { roomId, objectId, updates } = parsed.data;
      const updated = roomManager.updateObject(roomId, objectId, updates);
      if (updated) {
        io.in(roomId).emit('object-updated', { objectId, updates });
      }
    });

    // 7. Delete Drawing Object (Eraser tool)
    socket.on('object-delete', (rawPayload) => {
      const parsed = ObjectDeleteSchema.safeParse(rawPayload);
      if (!parsed.success) return;

      const { roomId, objectId } = parsed.data;
      const deleted = roomManager.deleteObject(
        roomId,
        objectId,
        currentUserId || socket.id
      );
      if (deleted) {
        io.in(roomId).emit('object-deleted', {
          objectId,
          userId: currentUserId || socket.id,
        });
      }
    });

    // 8. Collaborative Undo
    socket.on('undo', (payload) => {
      if (!payload?.roomId || !currentUserId) return;

      const result = roomManager.performUndo(payload.roomId, currentUserId);
      if (result) {
        io.in(payload.roomId).emit('undo-performed', {
          objectId: result.objectId,
          isDeleted: result.isDeleted,
          userId: currentUserId,
        });
      }
    });

    // 9. Collaborative Redo
    socket.on('redo', (payload) => {
      if (!payload?.roomId || !currentUserId) return;

      const result = roomManager.performRedo(payload.roomId, currentUserId);
      if (result) {
        io.in(payload.roomId).emit('redo-performed', {
          objectId: result.objectId,
          isDeleted: result.isDeleted,
          userId: currentUserId,
        });
      }
    });

    // 10. Clear Canvas
    socket.on('clear-canvas', (payload) => {
      if (!payload?.roomId) return;

      roomManager.clearRoom(payload.roomId);
      io.in(payload.roomId).emit('canvas-cleared', {
        clearedBy: currentUserId || socket.id,
        timestamp: Date.now(),
      });
    });

    // 11. Leave Room explicitly
    socket.on('leave-room', (payload) => {
      if (payload?.roomId) {
        socket.leave(payload.roomId);
      }
    });

    // 12. Socket Disconnect
    socket.on('disconnect', () => {
      const removed = roomManager.removeUser(socket.id);
      if (removed) {
        socket.to(removed.roomId).emit('user-left', {
          socketId: socket.id,
          userId: removed.user.userId,
          userName: removed.user.userName,
        });
      }
    });
  });
}
