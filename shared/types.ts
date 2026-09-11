/**
 * CollabDraw - Shared TypeScript Definitions
 * Shared between Frontend and Backend for 100% type safety.
 */

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export type ToolType =
  | 'select'
  | 'pencil'
  | 'eraser'
  | 'line'
  | 'rectangle'
  | 'circle'
  | 'arrow'
  | 'text';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export type StrokeStyle = 'solid' | 'dashed' | 'dotted';
export type FillStyle = 'none' | 'solid' | 'semi';

export interface BaseDrawingObject {
  id: string;
  type: ToolType;
  roomId: string;
  userId: string;
  userName: string;
  userColor: string;
  createdAt: number;
  updatedAt: number;
  strokeColor: string;
  fillColor?: string;
  strokeWidth: number;
  strokeStyle?: StrokeStyle;
  opacity?: number;
  isDeleted?: boolean; // Tombstone for collaborative undo/redo
}

export interface PencilObject extends BaseDrawingObject {
  type: 'pencil';
  points: Point[];
}

export interface LineObject extends BaseDrawingObject {
  type: 'line';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface ArrowObject extends BaseDrawingObject {
  type: 'arrow';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface RectangleObject extends BaseDrawingObject {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius?: number;
}

export interface CircleObject extends BaseDrawingObject {
  type: 'circle';
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
}

export interface TextObject extends BaseDrawingObject {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight?: string;
  width?: number;
  height?: number;
}

export type DrawingObject =
  | PencilObject
  | LineObject
  | ArrowObject
  | RectangleObject
  | CircleObject
  | TextObject;

export interface UserPresence {
  userId: string;
  socketId: string;
  userName: string;
  userColor: string;
  cursor?: Point | null;
  selectedObjectId?: string | null;
  joinedAt: number;
}

export interface RoomMetadata {
  roomId: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  objectCount: number;
}

export interface RoomState {
  roomId: string;
  objects: DrawingObject[];
  users: UserPresence[];
}

export interface LiveDraftStroke {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  tool: ToolType;
  points: Point[];
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string;
  strokeStyle?: StrokeStyle;
  opacity?: number;
  // For live shape drafting preview
  startX?: number;
  startY?: number;
  currentX?: number;
  currentY?: number;
}

export interface ViewportTransform {
  x: number;
  y: number;
  zoom: number;
}

// Client to Server Events
export interface ClientToServerEvents {
  'join-room': (payload: { roomId: string; userName: string; userId?: string }) => void;
  'leave-room': (payload: { roomId: string }) => void;
  'cursor-move': (payload: { roomId: string; point: Point | null }) => void;
  'draw-stream': (payload: { roomId: string; draft: LiveDraftStroke }) => void;
  'draw-stream-end': (payload: { roomId: string; draftId: string }) => void;
  'object-create': (payload: { roomId: string; object: DrawingObject }) => void;
  'object-update': (payload: { roomId: string; objectId: string; updates: Partial<DrawingObject> }) => void;
  'object-delete': (payload: { roomId: string; objectId: string }) => void;
  'undo': (payload: { roomId: string }) => void;
  'redo': (payload: { roomId: string }) => void;
  'clear-canvas': (payload: { roomId: string }) => void;
}

// Server to Client Events
export interface ServerToClientEvents {
  'room-joined': (data: { room: RoomState; self: UserPresence }) => void;
  'user-joined': (user: UserPresence) => void;
  'user-left': (data: { socketId: string; userId: string; userName: string }) => void;
  'presence-update': (users: UserPresence[]) => void;
  'cursor-update': (data: { socketId: string; userId: string; userName: string; userColor: string; cursor: Point | null }) => void;
  'draw-stream': (draft: LiveDraftStroke) => void;
  'draw-stream-end': (data: { draftId: string; userId: string }) => void;
  'object-created': (object: DrawingObject) => void;
  'object-updated': (data: { objectId: string; updates: Partial<DrawingObject> }) => void;
  'object-deleted': (data: { objectId: string; userId: string }) => void;
  'canvas-cleared': (data: { clearedBy: string; timestamp: number }) => void;
  'undo-performed': (data: { objectId: string; isDeleted: boolean; userId: string }) => void;
  'redo-performed': (data: { objectId: string; isDeleted: boolean; userId: string }) => void;
  'room-error': (data: { message: string; code?: string }) => void;
}
