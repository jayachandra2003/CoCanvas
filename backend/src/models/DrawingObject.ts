import mongoose, { Schema, Document } from 'mongoose';

export interface IDrawingObjectDoc extends Document {
  objectId: string;
  roomId: string;
  type: string;
  userId: string;
  userName: string;
  userColor: string;
  data: Record<string, any>;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DrawingObjectSchema = new Schema<IDrawingObjectDoc>(
  {
    objectId: { type: String, required: true, index: true },
    roomId: { type: String, required: true, index: true },
    type: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userColor: { type: String, required: true },
    data: { type: Schema.Types.Mixed, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

DrawingObjectSchema.index({ roomId: 1, objectId: 1 }, { unique: true });

export const DrawingObjectModel = mongoose.model<IDrawingObjectDoc>(
  'DrawingObject',
  DrawingObjectSchema
);
