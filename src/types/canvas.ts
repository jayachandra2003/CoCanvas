export type ElementType = 'pen' | 'rectangle' | 'ellipse' | 'line' | 'arrow' | 'text';

export type ToolType =
  | 'select'
  | 'pan'
  | 'pen'
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'text'
  | 'eraser';

export interface Point {
  x: number;
  y: number;
}

export interface ViewportTransform {
  x: number; // horizontal pan offset
  y: number; // vertical pan offset
  scale: number; // zoom factor (0.1 to 5.0)
}

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: Point[]; // Local relative points for pen, line, arrow
  strokeColor: string;
  fillColor?: string; // transparent or hex color
  strokeWidth: number;
  opacity: number; // 0 to 1
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  isDeleted?: boolean;
}

export interface SelectionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ActiveDraftElement {
  type: ElementType;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  points?: Point[];
  strokeColor: string;
  fillColor?: string;
  strokeWidth: number;
  opacity: number;
}

export interface CanvasStyleConfig {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  fontSize: number;
  fontFamily: string;
}

export const PRESET_COLORS = [
  '#FFFFFF', // White
  '#A1A1AA', // Gray
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
] as const;

export const STROKE_WIDTH_PRESETS = [2, 4, 8, 16] as const;
