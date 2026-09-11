import { DrawingObject, Point } from '../../shared/types';
import { distToSegment, distance, getBoundingBox } from './math';

/**
 * Checks whether a test point collides with a drawing object.
 * Returns true if the point hits within the tolerance threshold.
 */
export function isPointInsideObject(
  point: Point,
  obj: DrawingObject,
  tolerance = 8
): boolean {
  if (obj.isDeleted) return false;

  const box = getBoundingBox(obj);
  // Quick AABB rejection
  if (
    point.x < box.minX - tolerance ||
    point.x > box.maxX + tolerance ||
    point.y < box.minY - tolerance ||
    point.y > box.maxY + tolerance
  ) {
    return false;
  }

  const effectiveTolerance = Math.max(tolerance, obj.strokeWidth / 2 + 4);

  switch (obj.type) {
    case 'pencil': {
      const points = obj.points;
      if (points.length === 0) return false;
      if (points.length === 1) {
        return distance(point, points[0]) <= effectiveTolerance;
      }
      for (let i = 0; i < points.length - 1; i++) {
        if (distToSegment(point, points[i], points[i + 1]) <= effectiveTolerance) {
          return true;
        }
      }
      return false;
    }
    case 'line': {
      return (
        distToSegment(
          point,
          { x: obj.startX, y: obj.startY },
          { x: obj.endX, y: obj.endY }
        ) <= effectiveTolerance
      );
    }
    case 'arrow': {
      return (
        distToSegment(
          point,
          { x: obj.startX, y: obj.startY },
          { x: obj.endX, y: obj.endY }
        ) <= effectiveTolerance
      );
    }
    case 'rectangle': {
      const rx = obj.width < 0 ? obj.x + obj.width : obj.x;
      const ry = obj.height < 0 ? obj.y + obj.height : obj.y;
      const rw = Math.abs(obj.width);
      const rh = Math.abs(obj.height);

      const hasFill = obj.fillColor && obj.fillColor !== 'none' && obj.fillColor !== 'transparent';
      if (hasFill) {
        // Interior hit
        return (
          point.x >= rx - tolerance &&
          point.x <= rx + rw + tolerance &&
          point.y >= ry - tolerance &&
          point.y <= ry + rh + tolerance
        );
      } else {
        // Perimeter hit only
        const top = distToSegment(point, { x: rx, y: ry }, { x: rx + rw, y: ry });
        const bottom = distToSegment(point, { x: rx, y: ry + rh }, { x: rx + rw, y: ry + rh });
        const left = distToSegment(point, { x: rx, y: ry }, { x: rx, y: ry + rh });
        const right = distToSegment(point, { x: rx + rw, y: ry }, { x: rx + rw, y: ry + rh });
        return Math.min(top, bottom, left, right) <= effectiveTolerance;
      }
    }
    case 'circle': {
      const rx = Math.abs(obj.radiusX);
      const ry = Math.abs(obj.radiusY);
      if (rx === 0 || ry === 0) return false;

      // Normalized distance in ellipse coordinate space
      const normDist =
        ((point.x - obj.centerX) ** 2) / (rx ** 2) +
        ((point.y - obj.centerY) ** 2) / (ry ** 2);

      const hasFill = obj.fillColor && obj.fillColor !== 'none' && obj.fillColor !== 'transparent';
      if (hasFill) {
        return normDist <= 1.15;
      } else {
        // Perimeter hit
        const d = Math.abs(Math.sqrt(normDist) - 1.0);
        return d * Math.max(rx, ry) <= effectiveTolerance;
      }
    }
    case 'text': {
      return (
        point.x >= box.minX &&
        point.x <= box.maxX &&
        point.y >= box.minY &&
        point.y <= box.maxY
      );
    }
  }
}

/**
 * Finds the topmost object at a specific world coordinate point.
 */
export function findTopObjectAtPoint(
  point: Point,
  objects: DrawingObject[],
  tolerance = 8
): DrawingObject | null {
  // Iterate backwards from top layer to bottom layer
  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i];
    if (isPointInsideObject(point, obj, tolerance)) {
      return obj;
    }
  }
  return null;
}
