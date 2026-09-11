import {
  DrawingObject,
  PencilObject,
  LineObject,
  ArrowObject,
  RectangleObject,
  CircleObject,
  TextObject,
  LiveDraftStroke,
  ViewportTransform,
  Point,
} from '../../shared/types';
import { getBoundingBox } from './math';

/**
 * Draws the background grid for canvas reference.
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  transform: ViewportTransform
) {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // Background fill
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  const gridSize = 32 * transform.zoom;
  if (gridSize < 8) {
    ctx.restore();
    return; // Don't draw grid if zoomed too far out
  }

  const offsetX = transform.x % gridSize;
  const offsetY = transform.y % gridSize;

  ctx.beginPath();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;

  // Draw subtle grid dots or cross points for professional look
  ctx.fillStyle = '#cbd5e1';
  const dotSize = Math.max(1, 1.5 * Math.min(transform.zoom, 2));

  for (let x = offsetX; x < width; x += gridSize) {
    for (let y = offsetY; y < height; y += gridSize) {
      ctx.fillRect(x - dotSize / 2, y - dotSize / 2, dotSize, dotSize);
    }
  }

  ctx.restore();
}

/**
 * Renders a single pencil stroke with quadratic curve smoothing.
 */
export function renderPencil(ctx: CanvasRenderingContext2D, obj: PencilObject) {
  const points = obj.points;
  if (!points || points.length === 0) return;

  ctx.save();
  ctx.strokeStyle = obj.strokeColor;
  ctx.lineWidth = obj.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = obj.opacity ?? 1;

  if (obj.strokeStyle === 'dashed') {
    ctx.setLineDash([obj.strokeWidth * 2, obj.strokeWidth * 2]);
  } else if (obj.strokeStyle === 'dotted') {
    ctx.setLineDash([obj.strokeWidth, obj.strokeWidth * 1.5]);
  }

  if (points.length === 1) {
    ctx.fillStyle = obj.strokeColor;
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, obj.strokeWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
  } else {
    // Bezier curve interpolation through midpoints for ultra smooth freehand lines
    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
  }

  ctx.stroke();
  ctx.restore();
}

/**
 * Renders a straight line.
 */
export function renderLine(ctx: CanvasRenderingContext2D, obj: LineObject) {
  ctx.save();
  ctx.strokeStyle = obj.strokeColor;
  ctx.lineWidth = obj.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = obj.opacity ?? 1;

  if (obj.strokeStyle === 'dashed') {
    ctx.setLineDash([obj.strokeWidth * 2, obj.strokeWidth * 2]);
  } else if (obj.strokeStyle === 'dotted') {
    ctx.setLineDash([obj.strokeWidth, obj.strokeWidth * 1.5]);
  }

  ctx.beginPath();
  ctx.moveTo(obj.startX, obj.startY);
  ctx.lineTo(obj.endX, obj.endY);
  ctx.stroke();
  ctx.restore();
}

/**
 * Renders an arrow with proportional head.
 */
export function renderArrow(ctx: CanvasRenderingContext2D, obj: ArrowObject) {
  ctx.save();
  ctx.strokeStyle = obj.strokeColor;
  ctx.fillStyle = obj.strokeColor;
  ctx.lineWidth = obj.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = obj.opacity ?? 1;

  if (obj.strokeStyle === 'dashed') {
    ctx.setLineDash([obj.strokeWidth * 2, obj.strokeWidth * 2]);
  }

  const dx = obj.endX - obj.startX;
  const dy = obj.endY - obj.startY;
  const angle = Math.atan2(dy, dx);
  const headLength = Math.max(14, obj.strokeWidth * 3.5);

  // Line
  ctx.beginPath();
  ctx.moveTo(obj.startX, obj.startY);
  ctx.lineTo(obj.endX, obj.endY);
  ctx.stroke();

  // Arrow Head
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(obj.endX, obj.endY);
  ctx.lineTo(
    obj.endX - headLength * Math.cos(angle - Math.PI / 6),
    obj.endY - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    obj.endX - headLength * Math.cos(angle + Math.PI / 6),
    obj.endY - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

/**
 * Renders a rectangle with optional fill and corner radius.
 */
export function renderRectangle(
  ctx: CanvasRenderingContext2D,
  obj: RectangleObject
) {
  ctx.save();
  ctx.strokeStyle = obj.strokeColor;
  ctx.lineWidth = obj.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = obj.opacity ?? 1;

  if (obj.strokeStyle === 'dashed') {
    ctx.setLineDash([obj.strokeWidth * 2, obj.strokeWidth * 2]);
  }

  const rx = obj.width < 0 ? obj.x + obj.width : obj.x;
  const ry = obj.height < 0 ? obj.y + obj.height : obj.y;
  const rw = Math.abs(obj.width);
  const rh = Math.abs(obj.height);

  const radius = Math.min(obj.borderRadius ?? 6, rw / 2, rh / 2);

  ctx.beginPath();
  if (ctx.roundRect && radius > 0) {
    ctx.roundRect(rx, ry, rw, rh, radius);
  } else {
    ctx.rect(rx, ry, rw, rh);
  }

  if (obj.fillColor && obj.fillColor !== 'none' && obj.fillColor !== 'transparent') {
    ctx.fillStyle = obj.fillColor;
    ctx.fill();
  }

  if (obj.strokeWidth > 0) {
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Renders a circle or ellipse.
 */
export function renderCircle(ctx: CanvasRenderingContext2D, obj: CircleObject) {
  ctx.save();
  ctx.strokeStyle = obj.strokeColor;
  ctx.lineWidth = obj.strokeWidth;
  ctx.globalAlpha = obj.opacity ?? 1;

  if (obj.strokeStyle === 'dashed') {
    ctx.setLineDash([obj.strokeWidth * 2, obj.strokeWidth * 2]);
  }

  const rx = Math.abs(obj.radiusX);
  const ry = Math.abs(obj.radiusY);

  ctx.beginPath();
  ctx.ellipse(obj.centerX, obj.centerY, rx, ry, 0, 0, Math.PI * 2);

  if (obj.fillColor && obj.fillColor !== 'none' && obj.fillColor !== 'transparent') {
    ctx.fillStyle = obj.fillColor;
    ctx.fill();
  }

  if (obj.strokeWidth > 0) {
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Renders multi-line text onto the canvas.
 */
export function renderText(ctx: CanvasRenderingContext2D, obj: TextObject) {
  if (!obj.text) return;

  ctx.save();
  ctx.fillStyle = obj.strokeColor;
  ctx.globalAlpha = obj.opacity ?? 1;

  const fontSize = obj.fontSize || 20;
  const fontFamily = obj.fontFamily || 'Inter, sans-serif';
  const fontWeight = obj.fontWeight || '500';

  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textBaseline = 'top';

  const lines = obj.text.split('\n');
  const lineHeight = fontSize * 1.3;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], obj.x, obj.y + i * lineHeight);
  }

  ctx.restore();
}

/**
 * Master dispatcher for drawing any committed object.
 */
export function renderObject(
  ctx: CanvasRenderingContext2D,
  obj: DrawingObject
) {
  if (obj.isDeleted) return;

  switch (obj.type) {
    case 'pencil':
      renderPencil(ctx, obj);
      break;
    case 'line':
      renderLine(ctx, obj);
      break;
    case 'arrow':
      renderArrow(ctx, obj);
      break;
    case 'rectangle':
      renderRectangle(ctx, obj);
      break;
    case 'circle':
      renderCircle(ctx, obj);
      break;
    case 'text':
      renderText(ctx, obj);
      break;
  }
}

/**
 * Renders selection bounding box and handles.
 */
export function renderSelectionBox(
  ctx: CanvasRenderingContext2D,
  obj: DrawingObject,
  transform: ViewportTransform
) {
  if (obj.isDeleted) return;

  const box = getBoundingBox(obj);
  const pad = 6 / transform.zoom;

  ctx.save();
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1.5 / transform.zoom;
  ctx.setLineDash([4 / transform.zoom, 4 / transform.zoom]);

  const x = box.minX - pad;
  const y = box.minY - pad;
  const w = box.width + pad * 2;
  const h = box.height + pad * 2;

  ctx.strokeRect(x, y, w, h);

  // Corner resize handles
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1.5 / transform.zoom;
  const handleSize = 8 / transform.zoom;

  const handles = [
    { x: x, y: y },
    { x: x + w, y: y },
    { x: x, y: y + h },
    { x: x + w, y: y + h },
    { x: x + w / 2, y: y },
    { x: x + w / 2, y: y + h },
    { x: x, y: y + h / 2 },
    { x: x + w, y: y + h / 2 },
  ];

  for (const handle of handles) {
    ctx.fillRect(
      handle.x - handleSize / 2,
      handle.y - handleSize / 2,
      handleSize,
      handleSize
    );
    ctx.strokeRect(
      handle.x - handleSize / 2,
      handle.y - handleSize / 2,
      handleSize,
      handleSize
    );
  }

  ctx.restore();
}

/**
 * Renders live in-progress streaming draft strokes from local or remote users.
 */
export function renderDraftStroke(
  ctx: CanvasRenderingContext2D,
  draft: LiveDraftStroke
) {
  ctx.save();

  if (draft.tool === 'pencil') {
    renderPencil(ctx, {
      id: draft.id,
      type: 'pencil',
      roomId: '',
      userId: draft.userId,
      userName: draft.userName,
      userColor: draft.userColor,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      strokeColor: draft.strokeColor,
      strokeWidth: draft.strokeWidth,
      points: draft.points,
    });
  } else if (draft.tool === 'line' && draft.startX !== undefined && draft.currentX !== undefined) {
    renderLine(ctx, {
      id: draft.id,
      type: 'line',
      roomId: '',
      userId: draft.userId,
      userName: draft.userName,
      userColor: draft.userColor,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      strokeColor: draft.strokeColor,
      strokeWidth: draft.strokeWidth,
      startX: draft.startX,
      startY: draft.startY!,
      endX: draft.currentX,
      endY: draft.currentY!,
    });
  } else if (draft.tool === 'arrow' && draft.startX !== undefined && draft.currentX !== undefined) {
    renderArrow(ctx, {
      id: draft.id,
      type: 'arrow',
      roomId: '',
      userId: draft.userId,
      userName: draft.userName,
      userColor: draft.userColor,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      strokeColor: draft.strokeColor,
      strokeWidth: draft.strokeWidth,
      startX: draft.startX,
      startY: draft.startY!,
      endX: draft.currentX,
      endY: draft.currentY!,
    });
  } else if (draft.tool === 'rectangle' && draft.startX !== undefined && draft.currentX !== undefined) {
    const minX = Math.min(draft.startX, draft.currentX);
    const minY = Math.min(draft.startY!, draft.currentY!);
    const w = Math.abs(draft.currentX - draft.startX);
    const h = Math.abs(draft.currentY! - draft.startY!);

    renderRectangle(ctx, {
      id: draft.id,
      type: 'rectangle',
      roomId: '',
      userId: draft.userId,
      userName: draft.userName,
      userColor: draft.userColor,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      strokeColor: draft.strokeColor,
      strokeWidth: draft.strokeWidth,
      x: minX,
      y: minY,
      width: w,
      height: h,
    });
  } else if (draft.tool === 'circle' && draft.startX !== undefined && draft.currentX !== undefined) {
    const rx = Math.abs(draft.currentX - draft.startX) / 2;
    const ry = Math.abs(draft.currentY! - draft.startY!) / 2;
    const cx = (draft.startX + draft.currentX) / 2;
    const cy = (draft.startY! + draft.currentY!) / 2;

    renderCircle(ctx, {
      id: draft.id,
      type: 'circle',
      roomId: '',
      userId: draft.userId,
      userName: draft.userName,
      userColor: draft.userColor,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      strokeColor: draft.strokeColor,
      strokeWidth: draft.strokeWidth,
      centerX: cx,
      centerY: cy,
      radiusX: rx,
      radiusY: ry,
    });
  }

  ctx.restore();
}
