import { Point, DrawingObject, ViewportTransform } from '../../shared/types';

/**
 * Converts screen coordinates (mouse/pointer event relative to canvas element)
 * to world canvas coordinates factoring in Pan and Zoom.
 */
export function screenToWorld(
  screenPoint: Point,
  transform: ViewportTransform
): Point {
  return {
    x: (screenPoint.x - transform.x) / transform.zoom,
    y: (screenPoint.y - transform.y) / transform.zoom,
    pressure: screenPoint.pressure,
  };
}

/**
 * Converts world canvas coordinates to screen coordinates.
 */
export function worldToScreen(
  worldPoint: Point,
  transform: ViewportTransform
): Point {
  return {
    x: worldPoint.x * transform.zoom + transform.x,
    y: worldPoint.y * transform.zoom + transform.y,
    pressure: worldPoint.pressure,
  };
}

/**
 * Calculates Euclidean distance between two points.
 */
export function distance(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Distance from point P to line segment AB.
 */
export function distToSegment(p: Point, a: Point, b: Point): number {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (l2 === 0) return distance(p, a);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return distance(p, {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
  });
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

/**
 * Computes the axis-aligned bounding box of a drawing object.
 */
export function getBoundingBox(obj: DrawingObject): BoundingBox {
  let minX = 0, minY = 0, maxX = 0, maxY = 0;

  switch (obj.type) {
    case 'pencil': {
      if (obj.points.length === 0) {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
      }
      minX = obj.points[0].x;
      maxX = obj.points[0].x;
      minY = obj.points[0].y;
      maxY = obj.points[0].y;
      for (let i = 1; i < obj.points.length; i++) {
        const pt = obj.points[i];
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }
      const pad = obj.strokeWidth / 2;
      return {
        minX: minX - pad,
        minY: minY - pad,
        maxX: maxX + pad,
        maxY: maxY + pad,
        width: Math.max(1, maxX - minX + obj.strokeWidth),
        height: Math.max(1, maxY - minY + obj.strokeWidth),
      };
    }
    case 'line':
    case 'arrow': {
      minX = Math.min(obj.startX, obj.endX);
      maxX = Math.max(obj.startX, obj.endX);
      minY = Math.min(obj.startY, obj.endY);
      maxY = Math.max(obj.startY, obj.endY);
      const pad = Math.max(obj.strokeWidth, 12);
      return {
        minX: minX - pad,
        minY: minY - pad,
        maxX: maxX + pad,
        maxY: maxY + pad,
        width: maxX - minX + pad * 2,
        height: maxY - minY + pad * 2,
      };
    }
    case 'rectangle': {
      const rx = obj.width < 0 ? obj.x + obj.width : obj.x;
      const ry = obj.height < 0 ? obj.y + obj.height : obj.y;
      const rw = Math.abs(obj.width);
      const rh = Math.abs(obj.height);
      const pad = obj.strokeWidth / 2;
      return {
        minX: rx - pad,
        minY: ry - pad,
        maxX: rx + rw + pad,
        maxY: ry + rh + pad,
        width: rw + obj.strokeWidth,
        height: rh + obj.strokeWidth,
      };
    }
    case 'circle': {
      const rx = Math.abs(obj.radiusX);
      const ry = Math.abs(obj.radiusY);
      const pad = obj.strokeWidth / 2;
      return {
        minX: obj.centerX - rx - pad,
        minY: obj.centerY - ry - pad,
        maxX: obj.centerX + rx + pad,
        maxY: obj.centerY + ry + pad,
        width: rx * 2 + obj.strokeWidth,
        height: ry * 2 + obj.strokeWidth,
      };
    }
    case 'text': {
      const fontSize = obj.fontSize || 20;
      const lines = (obj.text || '').split('\n');
      const approxLineHeight = fontSize * 1.3;
      const longestLine = lines.reduce((max, line) => Math.max(max, line.length), 0);
      const approxWidth = obj.width || Math.max(longestLine * fontSize * 0.6, 60);
      const approxHeight = obj.height || Math.max(lines.length * approxLineHeight, fontSize);

      return {
        minX: obj.x - 4,
        minY: obj.y - 4,
        maxX: obj.x + approxWidth + 4,
        maxY: obj.y + approxHeight + 4,
        width: approxWidth + 8,
        height: approxHeight + 8,
      };
    }
  }
}
