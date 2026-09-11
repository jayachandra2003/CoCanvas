import { z } from 'zod';

export const PointSchema = z.object({
  x: z.number().finite().max(50000).min(-50000),
  y: z.number().finite().max(50000).min(-50000),
  pressure: z.number().min(0).max(1).optional(),
});

export const JoinRoomSchema = z.object({
  roomId: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  userName: z.string().min(1).max(50).trim(),
  userId: z.string().max(64).optional(),
});

export const CursorMoveSchema = z.object({
  roomId: z.string().min(1).max(64),
  point: PointSchema.nullable(),
});

export const LiveDraftStrokeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  userColor: z.string(),
  tool: z.enum(['pencil', 'line', 'rectangle', 'circle', 'arrow', 'text', 'select', 'eraser']),
  points: z.array(PointSchema).max(5000),
  strokeColor: z.string().max(32),
  strokeWidth: z.number().min(0.5).max(100),
  startX: z.number().finite().optional(),
  startY: z.number().finite().optional(),
  currentX: z.number().finite().optional(),
  currentY: z.number().finite().optional(),
});

export const BaseDrawingObjectSchema = z.object({
  id: z.string().min(1).max(100),
  roomId: z.string().min(1).max(64),
  userId: z.string().min(1).max(64),
  userName: z.string().min(1).max(50),
  userColor: z.string().max(32),
  createdAt: z.number(),
  updatedAt: z.number(),
  strokeColor: z.string().max(32),
  fillColor: z.string().max(32).optional(),
  strokeWidth: z.number().min(0.5).max(100),
  strokeStyle: z.enum(['solid', 'dashed', 'dotted']).optional(),
  opacity: z.number().min(0).max(1).optional(),
  isDeleted: z.boolean().optional(),
});

export const PencilObjectSchema = BaseDrawingObjectSchema.extend({
  type: z.literal('pencil'),
  points: z.array(PointSchema).min(1).max(10000),
});

export const LineObjectSchema = BaseDrawingObjectSchema.extend({
  type: z.literal('line'),
  startX: z.number().finite(),
  startY: z.number().finite(),
  endX: z.number().finite(),
  endY: z.number().finite(),
});

export const ArrowObjectSchema = BaseDrawingObjectSchema.extend({
  type: z.literal('arrow'),
  startX: z.number().finite(),
  startY: z.number().finite(),
  endX: z.number().finite(),
  endY: z.number().finite(),
});

export const RectangleObjectSchema = BaseDrawingObjectSchema.extend({
  type: z.literal('rectangle'),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite(),
  height: z.number().finite(),
  borderRadius: z.number().min(0).max(200).optional(),
});

export const CircleObjectSchema = BaseDrawingObjectSchema.extend({
  type: z.literal('circle'),
  centerX: z.number().finite(),
  centerY: z.number().finite(),
  radiusX: z.number().finite(),
  radiusY: z.number().finite(),
});

export const TextObjectSchema = BaseDrawingObjectSchema.extend({
  type: z.literal('text'),
  x: z.number().finite(),
  y: z.number().finite(),
  text: z.string().max(5000),
  fontSize: z.number().min(8).max(200),
  fontFamily: z.string().max(100),
  fontWeight: z.string().max(20).optional(),
  width: z.number().finite().optional(),
  height: z.number().finite().optional(),
});

export const DrawingObjectSchema = z.discriminatedUnion('type', [
  PencilObjectSchema,
  LineObjectSchema,
  ArrowObjectSchema,
  RectangleObjectSchema,
  CircleObjectSchema,
  TextObjectSchema,
]);

export const ObjectCreateSchema = z.object({
  roomId: z.string().min(1).max(64),
  object: DrawingObjectSchema,
});

export const ObjectUpdateSchema = z.object({
  roomId: z.string().min(1).max(64),
  objectId: z.string().min(1).max(100),
  updates: z.record(z.any()),
});

export const ObjectDeleteSchema = z.object({
  roomId: z.string().min(1).max(64),
  objectId: z.string().min(1).max(100),
});
