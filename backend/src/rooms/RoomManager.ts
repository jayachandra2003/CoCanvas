import {
  DrawingObject,
  UserPresence,
  RoomState,
  Point,
} from '../../../shared/types';
import { CanvasService } from '../services/canvasService';
import { getRandomUserColor } from '../utils/idGenerator';

export interface RoomInstance {
  roomId: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  objects: Map<string, DrawingObject>;
  users: Map<string, UserPresence>; // socketId -> UserPresence
  userUndoStacks: Map<string, string[]>; // userId -> objectId[]
  userRedoStacks: Map<string, string[]>; // userId -> objectId[]
}

export class RoomManager {
  private static instance: RoomManager;
  private rooms: Map<string, RoomInstance> = new Map();

  private constructor() {}

  public static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  /**
   * Retrieves an existing active room or loads/initializes one.
   */
  public async getOrCreateRoom(roomId: string, name?: string): Promise<RoomInstance> {
    let room = this.rooms.get(roomId);

    if (!room) {
      room = {
        roomId,
        name: name || `Board ${roomId}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        objects: new Map(),
        users: new Map(),
        userUndoStacks: new Map(),
        userRedoStacks: new Map(),
      };

      // Try loading existing drawing objects from MongoDB
      const persistedObjects = await CanvasService.loadRoomObjects(roomId);
      if (persistedObjects && persistedObjects.length > 0) {
        for (const obj of persistedObjects) {
          room.objects.set(obj.id, obj);
          if (!obj.isDeleted) {
            let stack = room.userUndoStacks.get(obj.userId);
            if (!stack) {
              stack = [];
              room.userUndoStacks.set(obj.userId, stack);
            }
            stack.push(obj.id);
          }
        }
      }

      this.rooms.set(roomId, room);
      // Ensure in database
      CanvasService.ensureRoomExists(roomId, name);
    }

    return room;
  }

  /**
   * Adds a user to a room and assigns them a distinct color.
   */
  public async addUser(
    roomId: string,
    socketId: string,
    userName: string,
    userId?: string
  ): Promise<{ room: RoomInstance; user: UserPresence }> {
    const room = await this.getOrCreateRoom(roomId);
    const resolvedUserId = userId || `usr_${socketId.slice(0, 8)}`;

    const user: UserPresence = {
      userId: resolvedUserId,
      socketId,
      userName: userName.trim() || 'Anonymous Artist',
      userColor: getRandomUserColor(),
      cursor: null,
      selectedObjectId: null,
      joinedAt: Date.now(),
    };

    room.users.set(socketId, user);
    if (!room.userUndoStacks.has(resolvedUserId)) {
      room.userUndoStacks.set(resolvedUserId, []);
    }
    if (!room.userRedoStacks.has(resolvedUserId)) {
      room.userRedoStacks.set(resolvedUserId, []);
    }

    return { room, user };
  }

  /**
   * Removes a user by their socket ID from all rooms they are in.
   */
  public removeUser(socketId: string): { roomId: string; user: UserPresence } | null {
    for (const [roomId, room] of this.rooms.entries()) {
      const user = room.users.get(socketId);
      if (user) {
        room.users.delete(socketId);
        return { roomId, user };
      }
    }
    return null;
  }

  /**
   * Updates a user's cursor position.
   */
  public updateCursor(
    roomId: string,
    socketId: string,
    point: Point | null
  ): UserPresence | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const user = room.users.get(socketId);
    if (user) {
      user.cursor = point;
      return user;
    }
    return null;
  }

  /**
   * Gets a clean serializable snapshot of the room.
   */
  public getRoomState(room: RoomInstance): RoomState {
    return {
      roomId: room.roomId,
      objects: Array.from(room.objects.values()),
      users: Array.from(room.users.values()),
    };
  }

  /**
   * Adds or commits a new drawing object to the room.
   */
  public addObject(roomId: string, object: DrawingObject): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.objects.set(object.id, object);
    room.updatedAt = Date.now();

    // Push onto user undo stack
    let stack = room.userUndoStacks.get(object.userId);
    if (!stack) {
      stack = [];
      room.userUndoStacks.set(object.userId, stack);
    }
    stack.push(object.id);

    // Clear user redo stack upon new action
    room.userRedoStacks.set(object.userId, []);

    // Async persist
    CanvasService.saveObject(object);
  }

  /**
   * Updates an existing object (e.g. moved, resized, or text changed).
   */
  public updateObject(
    roomId: string,
    objectId: string,
    updates: Partial<DrawingObject>
  ): DrawingObject | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const existing = room.objects.get(objectId);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    } as DrawingObject;

    room.objects.set(objectId, updated);
    CanvasService.saveObject(updated);
    return updated;
  }

  /**
   * Deletes an object (tombstone delete).
   */
  public deleteObject(roomId: string, objectId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const existing = room.objects.get(objectId);
    if (!existing) return false;

    existing.isDeleted = true;
    existing.updatedAt = Date.now();
    room.objects.set(objectId, existing);

    // Remove from undo stack if present
    const undoStack = room.userUndoStacks.get(userId);
    if (undoStack) {
      const idx = undoStack.indexOf(objectId);
      if (idx !== -1) undoStack.splice(idx, 1);
    }

    CanvasService.setDeletedStatus(roomId, objectId, true);
    return true;
  }

  /**
   * Collaborative safe Undo: Soft-deletes the calling user's most recent active drawing object.
   */
  public performUndo(
    roomId: string,
    userId: string
  ): { objectId: string; isDeleted: boolean } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const undoStack = room.userUndoStacks.get(userId) || [];
    const redoStack = room.userRedoStacks.get(userId) || [];

    // Find the topmost undeleted object made by this user
    while (undoStack.length > 0) {
      const objectId = undoStack.pop()!;
      const obj = room.objects.get(objectId);

      if (obj && !obj.isDeleted) {
        obj.isDeleted = true;
        obj.updatedAt = Date.now();
        redoStack.push(objectId);
        CanvasService.setDeletedStatus(roomId, objectId, true);
        return { objectId, isDeleted: true };
      }
    }

    return null;
  }

  /**
   * Collaborative safe Redo: Restores the calling user's most recently undone drawing object.
   */
  public performRedo(
    roomId: string,
    userId: string
  ): { objectId: string; isDeleted: boolean } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const undoStack = room.userUndoStacks.get(userId) || [];
    const redoStack = room.userRedoStacks.get(userId) || [];

    while (redoStack.length > 0) {
      const objectId = redoStack.pop()!;
      const obj = room.objects.get(objectId);

      if (obj && obj.isDeleted) {
        obj.isDeleted = false;
        obj.updatedAt = Date.now();
        undoStack.push(objectId);
        CanvasService.setDeletedStatus(roomId, objectId, false);
        return { objectId, isDeleted: false };
      }
    }

    return null;
  }

  /**
   * Clears all objects in the room.
   */
  public clearRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    for (const obj of room.objects.values()) {
      obj.isDeleted = true;
    }

    room.userUndoStacks.clear();
    room.userRedoStacks.clear();
    CanvasService.clearRoom(roomId);
  }
}
