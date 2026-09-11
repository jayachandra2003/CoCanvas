import mongoose, { Schema, Document } from 'mongoose';

export interface IRoom extends Document {
  roomId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: 'Untitled Board' },
  },
  { timestamps: true }
);

export const RoomModel = mongoose.model<IRoom>('Room', RoomSchema);
