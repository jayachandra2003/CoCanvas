import { Point, ViewportTransform, CanvasElement, SelectionBounds } from '@/types/canvas';

/**
 * Converts screen pixel coordinates (e.g. mouse clientX/clientY relative to canvas)
 * into virtual world coordinates.
 */
export function screenToWorld(
  screenPoint: Point,
  transform: ViewportTransform
): Point {
  return {
    x: (screenPoint.x - transform.x) / transform.scale,
    y: (screenPoint.y - transform.y) / transform.scale,
  };
}

/**
 * Converts virtual world coordinates into screen pixel coordinates.
 */
export function worldToScreen(
  worldPoint: Point,
  transform: ViewportTransform
): Point {
  return {
    x: worldPoint.x * transform.scale + transform.x,
    y: worldPoint.y * transform.scale + transform.y,
  };
}

/**
 * Euclidean distance between two points.
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Distance from point P to line segment AB.
 */
export function pointToSegmentDistance(
  p: Point,
  a: Point,
  b: Point
): number {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (l2 === 0) return distance(p, a);

  // Consider the line extending the segment, parameterized as a + t (b - a).
  // We find projection of point p onto the line.
  // It falls where t = [(p-a) . (b-a)] / |b-a|^2
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2));
  const projection = {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
  };
  return distance(p, projection);
}

/**
 * Computes the tight axis-aligned bounding box (AABB) of an element in world coordinates.
 */
export function getElementBounds(element: CanvasElement): SelectionBounds {
  if (element.type === 'pen' || element.type === 'line' || element.type === 'arrow') {
    if (!element.points || element.points.length === 0) {
      return { x: element.x, y: element.y, width: 0, height: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const pt of element.points) {
      const wx = element.x + pt.x;
      const wy = element.y + pt.y;
      if (wx < minX) minX = wx;
      if (wy < minY) minY = wy;
      if (wx > maxX) maxX = wx;
      if (wy > maxY) maxY = wy;
    }

    const pad = Math.max(element.strokeWidth / 2, 4);
    return {
      x: minX - pad,
      y: minY - pad,
      width: Math.max(maxX - minX + pad * 2, 8),
      height: Math.max(maxY - minY + pad * 2, 8),
    };
  }

  if (element.type === 'rectangle' || element.type === 'ellipse') {
    const w = element.width || 0;
    const h = element.height || 0;
    const x = w < 0 ? element.x + w : element.x;
    const y = h < 0 ? element.y + h : element.y;
    const absW = Math.abs(w);
    const absH = Math.abs(h);
    const pad = element.strokeWidth / 2;

    return {
      x: x - pad,
      y: y - pad,
      width: Math.max(absW + pad * 2, 8),
      height: Math.max(absH + pad * 2, 8),
    };
  }

  if (element.type === 'text') {
    const fontSize = element.fontSize || 20;
    const lines = (element.text || '').split('\n');
    const longestLine = lines.reduce((max, l) => Math.max(max, l.length), 0);
    const approxWidth = Math.max(longestLine * (fontSize * 0.6), 24);
    const approxHeight = Math.max(lines.length * (fontSize * 1.3), fontSize);

    return {
      x: element.x - 4,
      y: element.y - 4,
      width: approxWidth + 8,
      height: approxHeight + 8,
    };
  }

  return { x: element.x, y: element.y, width: 0, height: 0 };
}

/**
 * Checks if a point in world coordinates hits an element.
 */
export function isPointInsideElement(point: Point, element: CanvasElement, threshold: number = 8): boolean {
  if (element.isDeleted) return false;
  const bounds = getElementBounds(element);

  // Quick bounding box rejection
  if (
    point.x < bounds.x - threshold ||
    point.x > bounds.x + bounds.width + threshold ||
    point.y < bounds.y - threshold ||
    point.y > bounds.y + bounds.height + threshold
  ) {
    return false;
  }

  const effectiveThreshold = Math.max(threshold, element.strokeWidth / 2 + 4);

  if (element.type === 'pen') {
    if (!element.points || element.points.length < 2) {
      if (element.points && element.points.length === 1) {
        const pt = { x: element.x + element.points[0].x, y: element.y + element.points[0].y };
        return distance(point, pt) <= effectiveThreshold;
      }
      return false;
    }

    for (let i = 0; i < element.points.length - 1; i++) {
      const p1 = { x: element.x + element.points[i].x, y: element.y + element.points[i].y };
      const p2 = { x: element.x + element.points[i + 1].x, y: element.y + element.points[i + 1].y };
      if (pointToSegmentDistance(point, p1, p2) <= effectiveThreshold) {
        return true;
      }
    }
    return false;
  }

  if (element.type === 'line' || element.type === 'arrow') {
    if (!element.points || element.points.length < 2) return false;
    const p1 = { x: element.x + element.points[0].x, y: element.y + element.points[0].y };
    const p2 = { x: element.x + element.points[1].x, y: element.y + element.points[1].y };
    return pointToSegmentDistance(point, p1, p2) <= effectiveThreshold;
  }

  if (element.type === 'rectangle') {
    const hasFill = element.fillColor && element.fillColor !== 'transparent';
    if (hasFill) {
      return (
        point.x >= bounds.x &&
        point.x <= bounds.x + bounds.width &&
        point.y >= bounds.y &&
        point.y <= bounds.y + bounds.height
      );
    }
    // Check border perimeter if not filled
    const left = bounds.x;
    const right = bounds.x + bounds.width;
    const top = bounds.y;
    const bottom = bounds.y + bounds.height;

    const nearLeft = Math.abs(point.x - left) <= effectiveThreshold && point.y >= top && point.y <= bottom;
    const nearRight = Math.abs(point.x - right) <= effectiveThreshold && point.y >= top && point.y <= bottom;
    const nearTop = Math.abs(point.y - top) <= effectiveThreshold && point.x >= left && point.x <= right;
    const nearBottom = Math.abs(point.y - bottom) <= effectiveThreshold && point.x >= left && point.x <= right;

    return nearLeft || nearRight || nearTop || nearBottom;
  }

  if (element.type === 'ellipse') {
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    const rx = bounds.width / 2;
    const ry = bounds.height / 2;
    if (rx === 0 || ry === 0) return false;

    const normDist = ((point.x - cx) ** 2) / (rx ** 2) + ((point.y - cy) ** 2) / (ry ** 2);
    const hasFill = element.fillColor && element.fillColor !== 'transparent';

    if (hasFill) {
      return normDist <= 1.05;
    }
    // Check ring
    return Math.abs(normDist - 1.0) <= (effectiveThreshold / Math.min(rx, ry));
  }

  if (element.type === 'text') {
    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    );
  }

  return false;
}
