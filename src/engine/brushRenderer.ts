import type { Point } from '../types/kana';

export interface InkStrokeStyle {
  color: string;
  baseWidth: number;
  opacity?: number;
}

/**
 * Renders a smooth calligraphic ink stroke using quadratic midpoints and
 * velocity/pressure-responsive stroke widths in 0..1024 logical canvas space.
 */
export function renderInkStroke(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  canvasSize: number,
  style: InkStrokeStyle,
): void {
  if (points.length === 0) return;

  const scale = canvasSize / 1024;
  const baseWidth = style.baseWidth * scale;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = style.color;
  ctx.fillStyle = style.color;
  ctx.globalAlpha = style.opacity ?? 1;

  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0].x * scale, points[0].y * scale, baseWidth * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  let prevWidth = baseWidth * 0.95;

  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];

    const dx = (p1.x - p0.x) * scale;
    const dy = (p1.y - p0.y) * scale;
    const dist = Math.hypot(dx, dy);
    const dt = Math.max(1, (p1.time ?? i * 16) - (p0.time ?? (i - 1) * 16));
    const velocity = dist / dt; // px per ms

    // Stylus pressure if meaningful (not default 0 or 0.5 mouse fallback)
    const hasPressure = typeof p1.pressure === 'number' && p1.pressure > 0 && p1.pressure !== 0.5;
    const velocityFactor = Math.max(0.68, Math.min(1.14, 1.12 - velocity * 0.22));
    const pressureFactor = hasPressure ? 0.6 + (p1.pressure ?? 0.5) * 0.8 : velocityFactor;

    // Subtle taper at stroke start & end
    const progress = i / (points.length - 1);
    const endTaper = progress > 0.88 ? 1 - (progress - 0.88) * 2.2 : 1;
    const targetWidth = baseWidth * pressureFactor * Math.max(0.55, endTaper);
    const width = prevWidth * 0.65 + targetWidth * 0.35;
    prevWidth = width;

    const midPrevX = i === 1 ? p0.x * scale : ((points[i - 2].x + p0.x) * 0.5) * scale;
    const midPrevY = i === 1 ? p0.y * scale : ((points[i - 2].y + p0.y) * 0.5) * scale;
    const midCurrX = i === points.length - 1 ? p1.x * scale : ((p0.x + p1.x) * 0.5) * scale;
    const midCurrY = i === points.length - 1 ? p1.y * scale : ((p0.y + p1.y) * 0.5) * scale;

    ctx.beginPath();
    ctx.lineWidth = width;
    ctx.moveTo(midPrevX, midPrevY);
    ctx.quadraticCurveTo(p0.x * scale, p0.y * scale, midCurrX, midCurrY);
    ctx.stroke();
  }

  ctx.restore();
}
