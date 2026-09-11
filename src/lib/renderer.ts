import { CanvasElement, ViewportTransform, ActiveDraftElement, SelectionBounds } from '@/types/canvas';
import { PeerAwarenessState } from '@/types/presence';
import { getElementBounds } from './math';

/**
 * Renders the infinite dot grid background aligned with viewport transform.
 */
export function renderGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  transform: ViewportTransform
) {
  ctx.save();
  ctx.fillStyle = '#121214';
  ctx.fillRect(0, 0, width, height);

  const gridSize = 24 * transform.scale;
  if (gridSize < 8) {
    ctx.restore();
    return;
  }

  const startX = (transform.x % gridSize + gridSize) % gridSize;
  const startY = (transform.y % gridSize + gridSize) % gridSize;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  const dotRadius = Math.max(1, Math.min(1.5 * transform.scale, 2));

  for (let x = startX; x < width; x += gridSize) {
    for (let y = startY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Renders a single committed CanvasElement into the given 2D context.
 */
export function renderElement(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement
) {
  if (element.isDeleted) return;

  ctx.save();
  ctx.globalAlpha = element.opacity ?? 1;
  ctx.strokeStyle = element.strokeColor || '#FFFFFF';
  ctx.fillStyle = element.fillColor && element.fillColor !== 'transparent' ? element.fillColor : 'transparent';
  ctx.lineWidth = element.strokeWidth || 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (element.type) {
    case 'pen': {
      if (!element.points || element.points.length === 0) break;
      ctx.beginPath();
      const pts = element.points;

      if (pts.length === 1) {
        ctx.arc(element.x + pts[0].x, element.y + pts[0].y, element.strokeWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = element.strokeColor;
        ctx.fill();
        break;
      }

      ctx.moveTo(element.x + pts[0].x, element.y + pts[0].y);

      if (pts.length === 2) {
        ctx.lineTo(element.x + pts[1].x, element.y + pts[1].y);
      } else {
        for (let i = 1; i < pts.length - 1; i++) {
          const current = { x: element.x + pts[i].x, y: element.y + pts[i].y };
          const next = { x: element.x + pts[i + 1].x, y: element.y + pts[i + 1].y };
          const midX = (current.x + next.x) / 2;
          const midY = (current.y + next.y) / 2;
          ctx.quadraticCurveTo(current.x, current.y, midX, midY);
        }
        const last = pts[pts.length - 1];
        ctx.lineTo(element.x + last.x, element.y + last.y);
      }
      ctx.stroke();
      break;
    }

    case 'rectangle': {
      const w = element.width || 0;
      const h = element.height || 0;
      const x = w < 0 ? element.x + w : element.x;
      const y = h < 0 ? element.y + h : element.y;
      const absW = Math.abs(w);
      const absH = Math.abs(h);

      if (element.fillColor && element.fillColor !== 'transparent') {
        ctx.fillRect(x, y, absW, absH);
      }
      ctx.strokeRect(x, y, absW, absH);
      break;
    }

    case 'ellipse': {
      const w = element.width || 0;
      const h = element.height || 0;
      const cx = element.x + w / 2;
      const cy = element.y + h / 2;
      const rx = Math.abs(w / 2);
      const ry = Math.abs(h / 2);

      if (rx > 0 && ry > 0) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        if (element.fillColor && element.fillColor !== 'transparent') {
          ctx.fill();
        }
        ctx.stroke();
      }
      break;
    }

    case 'line': {
      if (!element.points || element.points.length < 2) break;
      const p1 = { x: element.x + element.points[0].x, y: element.y + element.points[0].y };
      const p2 = { x: element.x + element.points[1].x, y: element.y + element.points[1].y };
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      break;
    }

    case 'arrow': {
      if (!element.points || element.points.length < 2) break;
      const p1 = { x: element.x + element.points[0].x, y: element.y + element.points[0].y };
      const p2 = { x: element.x + element.points[1].x, y: element.y + element.points[1].y };

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const headLength = Math.max(12, element.strokeWidth * 3.5);
      const headAngle = Math.PI / 6;

      ctx.beginPath();
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(
        p2.x - headLength * Math.cos(angle - headAngle),
        p2.y - headLength * Math.sin(angle - headAngle)
      );
      ctx.lineTo(
        p2.x - headLength * Math.cos(angle + headAngle),
        p2.y - headLength * Math.sin(angle + headAngle)
      );
      ctx.closePath();
      ctx.fillStyle = element.strokeColor;
      ctx.fill();
      break;
    }

    case 'text': {
      if (!element.text) break;
      const fontSize = element.fontSize || 20;
      const fontFamily = element.fontFamily || 'Inter, sans-serif';
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.fillStyle = element.strokeColor;
      ctx.textBaseline = 'top';

      const lines = element.text.split('\n');
      const lineHeight = fontSize * 1.3;
      lines.forEach((line, idx) => {
        ctx.fillText(line, element.x, element.y + idx * lineHeight);
      });
      break;
    }
  }

  ctx.restore();
}

/**
 * Renders an active in-progress draft element while dragging/drawing.
 */
export function renderActiveDraft(
  ctx: CanvasRenderingContext2D,
  draft: ActiveDraftElement
) {
  ctx.save();
  ctx.globalAlpha = draft.opacity ?? 1;
  ctx.strokeStyle = draft.strokeColor;
  ctx.fillStyle = draft.fillColor && draft.fillColor !== 'transparent' ? draft.fillColor : 'transparent';
  ctx.lineWidth = draft.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const width = draft.currentX - draft.startX;
  const height = draft.currentY - draft.startY;

  switch (draft.type) {
    case 'pen': {
      if (!draft.points || draft.points.length === 0) break;
      ctx.beginPath();
      const pts = draft.points;
      if (pts.length === 1) {
        ctx.arc(draft.startX + pts[0].x, draft.startY + pts[0].y, draft.strokeWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = draft.strokeColor;
        ctx.fill();
        break;
      }

      ctx.moveTo(draft.startX + pts[0].x, draft.startY + pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const current = { x: draft.startX + pts[i].x, y: draft.startY + pts[i].y };
        const next = { x: draft.startX + pts[i + 1].x, y: draft.startY + pts[i + 1].y };
        const midX = (current.x + next.x) / 2;
        const midY = (current.y + next.y) / 2;
        ctx.quadraticCurveTo(current.x, current.y, midX, midY);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(draft.startX + last.x, draft.startY + last.y);
      ctx.stroke();
      break;
    }

    case 'rectangle': {
      const x = width < 0 ? draft.startX + width : draft.startX;
      const y = height < 0 ? draft.startY + height : draft.startY;
      const absW = Math.abs(width);
      const absH = Math.abs(height);

      if (draft.fillColor && draft.fillColor !== 'transparent') {
        ctx.fillRect(x, y, absW, absH);
      }
      ctx.strokeRect(x, y, absW, absH);
      break;
    }

    case 'ellipse': {
      const cx = draft.startX + width / 2;
      const cy = draft.startY + height / 2;
      const rx = Math.abs(width / 2);
      const ry = Math.abs(height / 2);

      if (rx > 0 && ry > 0) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        if (draft.fillColor && draft.fillColor !== 'transparent') {
          ctx.fill();
        }
        ctx.stroke();
      }
      break;
    }

    case 'line': {
      ctx.beginPath();
      ctx.moveTo(draft.startX, draft.startY);
      ctx.lineTo(draft.currentX, draft.currentY);
      ctx.stroke();
      break;
    }

    case 'arrow': {
      ctx.beginPath();
      ctx.moveTo(draft.startX, draft.startY);
      ctx.lineTo(draft.currentX, draft.currentY);
      ctx.stroke();

      const angle = Math.atan2(height, width);
      const headLength = Math.max(12, draft.strokeWidth * 3.5);
      const headAngle = Math.PI / 6;

      ctx.beginPath();
      ctx.moveTo(draft.currentX, draft.currentY);
      ctx.lineTo(
        draft.currentX - headLength * Math.cos(angle - headAngle),
        draft.currentY - headLength * Math.sin(angle - headAngle)
      );
      ctx.lineTo(
        draft.currentX - headLength * Math.cos(angle + headAngle),
        draft.currentY - headLength * Math.sin(angle + headAngle)
      );
      ctx.closePath();
      ctx.fillStyle = draft.strokeColor;
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

/**
 * Renders local user selection outlines and anchor points.
 */
export function renderSelectionOverlay(
  ctx: CanvasRenderingContext2D,
  selectedElements: CanvasElement[],
  accentColor: string = '#3B82F6'
) {
  if (selectedElements.length === 0) return;

  ctx.save();
  for (const el of selectedElements) {
    if (el.isDeleted) continue;
    const bounds = getElementBounds(el);

    // Bounding box dashed stroke
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

    // Corner anchor points
    ctx.setLineDash([]);
    ctx.fillStyle = '#121214';
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;

    const handleSize = 6;
    const corners = [
      { x: bounds.x, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y },
      { x: bounds.x, y: bounds.y + bounds.height },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    ];

    for (const c of corners) {
      ctx.fillRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
    }
  }
  ctx.restore();
}

/**
 * Renders presence-aware remote selection outlines for connected peers.
 */
export function renderRemoteSelections(
  ctx: CanvasRenderingContext2D,
  elements: CanvasElement[],
  peers: PeerAwarenessState[]
) {
  if (peers.length === 0) return;

  ctx.save();
  for (const peer of peers) {
    if (!peer.selectedElementIds || peer.selectedElementIds.length === 0) continue;

    const peerElements = elements.filter(
      (el) => peer.selectedElementIds.includes(el.id) && !el.isDeleted
    );

    if (peerElements.length === 0) continue;

    const peerColor = peer.user.color || '#EC4899';
    const peerName = peer.user.name;

    for (const el of peerElements) {
      const bounds = getElementBounds(el);

      // Remote selection bounding box (vibrant peer color)
      ctx.strokeStyle = peerColor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

      // Peer Name Badge tag rendered directly above bounding box
      ctx.setLineDash([]);
      ctx.font = '10px Inter, sans-serif';
      const textMetrics = ctx.measureText(peerName);
      const tagPadding = 5;
      const tagWidth = textMetrics.width + tagPadding * 2;
      const tagHeight = 16;
      const tagX = bounds.x;
      const tagY = bounds.y - tagHeight - 3;

      // Tag Background
      ctx.fillStyle = peerColor;
      ctx.beginPath();
      ctx.roundRect(tagX, tagY, tagWidth, tagHeight, 4);
      ctx.fill();

      // Tag Text
      ctx.fillStyle = '#FFFFFF';
      ctx.textBaseline = 'middle';
      ctx.fillText(peerName, tagX + tagPadding, tagY + tagHeight / 2);
    }
  }
  ctx.restore();
}

/**
 * Export canvas to PNG data URL with tight bounding box auto-crop.
 */
export function exportCanvasAsBlob(
  elements: CanvasElement[],
  options: {
    padding?: number;
    scale?: number;
    backgroundColor?: string | null;
  } = {}
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const activeElements = elements.filter((el) => !el.isDeleted);
    if (activeElements.length === 0) {
      resolve(null);
      return;
    }

    const pad = options.padding ?? 40;
    const scale = options.scale ?? 2;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const el of activeElements) {
      const b = getElementBounds(el);
      if (b.x < minX) minX = b.x;
      if (b.y < minY) minY = b.y;
      if (b.x + b.width > maxX) maxX = b.x + b.width;
      if (b.y + b.height > maxY) maxY = b.y + b.height;
    }

    const exportWidth = (maxX - minX + pad * 2) * scale;
    const exportHeight = (maxY - minY + pad * 2) * scale;

    const offscreen = document.createElement('canvas');
    offscreen.width = exportWidth;
    offscreen.height = exportHeight;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) {
      resolve(null);
      return;
    }

    offCtx.scale(scale, scale);
    offCtx.translate(-minX + pad, -minY + pad);

    if (options.backgroundColor) {
      offCtx.save();
      offCtx.fillStyle = options.backgroundColor;
      offCtx.fillRect(minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2);
      offCtx.restore();
    }

    for (const el of activeElements) {
      renderElement(offCtx, el);
    }

    offscreen.toBlob((blob) => {
      resolve(blob);
    }, 'image/png');
  });
}
