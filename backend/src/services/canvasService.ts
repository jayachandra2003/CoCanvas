import { DrawingObject } from '../../../shared/types';
import { isDatabaseConnected } from '../config/db';
import { DrawingObjectModel } from '../models/DrawingObject';
import { RoomModel } from '../models/Room';

/**
 * Persistence layer that bridges in-memory state with MongoDB.
 */
export class CanvasService {
  /**
   * Loads all active objects for a room from MongoDB.
   */
  static async loadRoomObjects(roomId: string): Promise<DrawingObject[] | null> {
    if (!isDatabaseConnected()) return null;

    try {
      const docs = await DrawingObjectModel.find({ roomId })
        .sort({ createdAt: 1 })
        .lean();

      return docs.map((doc) => {
        return {
          id: doc.objectId,
          roomId: doc.roomId,
          type: doc.type as any,
          userId: doc.userId,
          userName: doc.userName,
          userColor: doc.userColor,
          isDeleted: doc.isDeleted,
          createdAt: doc.createdAt ? new Date(doc.createdAt).getTime() : Date.now(),
          updatedAt: doc.updatedAt ? new Date(doc.updatedAt).getTime() : Date.now(),
          ...doc.data,
        } as DrawingObject;
      });
    } catch (err) {
      console.error(`Failed to load room objects for ${roomId}:`, err);
      return null;
    }
  }

  /**
   * Upserts or creates a room document.
   */
  static async ensureRoomExists(roomId: string, name?: string): Promise<void> {
    if (!isDatabaseConnected()) return;

    try {
      await RoomModel.findOneAndUpdate(
        { roomId },
        { $setOnInsert: { roomId, name: name || `Room ${roomId}` } },
        { upsert: true }
      );
    } catch (err) {
      console.error(`Failed to ensure room ${roomId}:`, err);
    }
  }

  /**
   * Persists a drawing object to MongoDB.
   */
  static async saveObject(object: DrawingObject): Promise<void> {
    if (!isDatabaseConnected()) return;

    try {
      const { id, roomId, type, userId, userName, userColor, isDeleted, ...data } = object;
      await DrawingObjectModel.findOneAndUpdate(
        { objectId: id, roomId },
        {
          objectId: id,
          roomId,
          type,
          userId,
          userName,
          userColor,
          isDeleted: !!isDeleted,
          data,
        },
        { upsert: true }
      );
    } catch (err) {
      console.error(`Failed to persist object ${object.id}:`, err);
    }
  }

  /**
   * Marks an object as deleted (tombstone) or restores it in MongoDB.
   */
  static async setDeletedStatus(roomId: string, objectId: string, isDeleted: boolean): Promise<void> {
    if (!isDatabaseConnected()) return;

    try {
      await DrawingObjectModel.findOneAndUpdate(
        { roomId, objectId },
        { isDeleted, updatedAt: new Date() }
      );
    } catch (err) {
      console.error(`Failed to update deleted status for ${objectId}:`, err);
    }
  }

  /**
   * Clears all objects in a room (marks as deleted or purges).
   */
  static async clearRoom(roomId: string): Promise<void> {
    if (!isDatabaseConnected()) return;

    try {
      await DrawingObjectModel.updateMany(
        { roomId },
        { isDeleted: true, updatedAt: new Date() }
      );
    } catch (err) {
      console.error(`Failed to clear room ${roomId}:`, err);
    }
  }
}
