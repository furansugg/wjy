import type { LogicalStroke, Point, StrokeEvaluationResult } from '../types/kana';

export interface EvaluationOptions {
  mode: 'practice' | 'quiz';
  anchorOffset?: { dx: number; dy: number };
}

const RESAMPLE_COUNT = 32;

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function polylineLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += distance(points[i - 1], points[i]);
  }
  return len;
}

export function resamplePolyline(points: Point[], count: number = RESAMPLE_COUNT): Point[] {
  if (points.length === 0) return [];
  if (points.length === 1 || count <= 1) {
    return Array.from({ length: Math.max(1, count) }, () => ({ x: points[0].x, y: points[0].y }));
  }

  const totalLen = polylineLength(points);
  if (totalLen < 1e-6) {
    return Array.from({ length: count }, () => ({ x: points[0].x, y: points[0].y }));
  }

  const step = totalLen / (count - 1);
  const resampled: Point[] = [{ x: points[0].x, y: points[0].y }];

  let accumulated = 0;
  let prev = points[0];

  for (let i = 1; i < points.length; i++) {
    let curr = points[i];
    let segLen = distance(prev, curr);

    while (accumulated + segLen >= step && resampled.length < count) {
      const remain = step - accumulated;
      const t = segLen > 1e-6 ? remain / segLen : 0;
      const nx = prev.x + (curr.x - prev.x) * t;
      const ny = prev.y + (curr.y - prev.y) * t;
      const inserted = { x: nx, y: ny };
      resampled.push(inserted);
      prev = inserted;
      segLen = distance(prev, curr);
      accumulated = 0;
    }

    accumulated += segLen;
    prev = curr;
  }

  while (resampled.length < count) {
    const last = points[points.length - 1];
    resampled.push({ x: last.x, y: last.y });
  }

  return resampled;
}

function getCentroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / points.length, y: sy / points.length };
}

function centerPoints(points: Point[]): Point[] {
  const c = getCentroid(points);
  return points.map((p) => ({ x: p.x - c.x, y: p.y - c.y }));
}

function pointwiseDistances(a: Point[], b: Point[]): number[] {
  const len = Math.min(a.length, b.length);
  const dists: number[] = new Array(len);
  for (let i = 0; i < len; i++) {
    dists[i] = distance(a[i], b[i]);
  }
  return dists;
}

function meanDistance(a: Point[], b: Point[]): number {
  const dists = pointwiseDistances(a, b);
  if (dists.length === 0) return Infinity;
  let sum = 0;
  for (const d of dists) sum += d;
  return sum / dists.length;
}

function percentileDistance(a: Point[], b: Point[], p: number): number {
  const dists = pointwiseDistances(a, b).sort((x, y) => x - y);
  if (dists.length === 0) return Infinity;
  const idx = Math.min(dists.length - 1, Math.floor(dists.length * p));
  return dists[idx];
}

function clamp01(val: number): number {
  return Math.max(0, Math.min(1, val));
}

function applyOffset(points: Point[], offset?: { dx: number; dy: number }): Point[] {
  if (!offset || (offset.dx === 0 && offset.dy === 0)) return points;
  return points.map((p) => ({ x: p.x + offset.dx, y: p.y + offset.dy }));
}

function evaluateClosedLoop(
  drawn: Point[],
  expected: Point[],
  mode: 'practice' | 'quiz',
): StrokeEvaluationResult {
  const expLen = polylineLength(expected);
  const drawnLen = polylineLength(drawn);

  if (drawnLen < Math.max(85, expLen * 0.42)) {
    return {
      passed: false,
      score: 15,
      reason: 'too_short',
      feedback: 'Lingkaran terlalu kecil atau terputus',
    };
  }
  if (drawnLen > expLen * 2.4) {
    return {
      passed: false,
      score: 20,
      reason: 'too_long',
      feedback: 'Lingkaran terlalu besar',
    };
  }

  const resDrawn = resamplePolyline(drawn, RESAMPLE_COUNT);
  const resExp = resamplePolyline(expected, RESAMPLE_COUNT);
  const cDrawn = getCentroid(resDrawn);
  const cExp = getCentroid(resExp);
  const centerDist = distance(cDrawn, cExp);

  const maxCenterDist = mode === 'practice' ? 165 : 240;
  if (centerDist > maxCenterDist) {
    return {
      passed: false,
      score: Math.round(clamp01(1 - centerDist / (maxCenterDist * 1.6)) * 45),
      reason: 'wrong_start',
      feedback: 'Letakkan tanda lingkaran (゜) di kanan atas',
    };
  }

  // Allow clockwise or counter-clockwise starting at any angle along the circle
  const candidates = [resDrawn, [...resDrawn].reverse()];
  let bestDist = Infinity;

  for (const cand of candidates) {
    for (let shift = 0; shift < RESAMPLE_COUNT; shift += 2) {
      let sum = 0;
      for (let i = 0; i < RESAMPLE_COUNT; i++) {
        sum += distance(cand[(i + shift) % RESAMPLE_COUNT], resExp[i]);
      }
      const avg = sum / RESAMPLE_COUNT;
      if (avg < bestDist) bestDist = avg;
    }
  }

  const tol = mode === 'practice' ? 140 : 195;
  const shapeScore = clamp01(1 - bestDist / tol);
  const posScore = clamp01(1 - centerDist / (maxCenterDist * 1.15));
  const closureDist = distance(drawn[0], drawn[drawn.length - 1]);
  const closureScore = clamp01(1 - closureDist / 160);

  const score = Math.round((shapeScore * 0.55 + posScore * 0.3 + closureScore * 0.15) * 100);
  const passed = score >= 56 && closureDist < 155;

  return {
    passed,
    score,
    reason: passed ? 'ok' : 'wrong_shape',
    feedback: passed ? 'Lingkaran tepat!' : 'Buat lingkaran kecil tertutup yang rapi',
  };
}

export function evaluateStroke(
  drawn: Point[],
  logicalStroke: LogicalStroke,
  options: EvaluationOptions = { mode: 'practice' },
): StrokeEvaluationResult {
  const { mode, anchorOffset } = options;

  if (drawn.length < 2) {
    return {
      passed: false,
      score: 0,
      reason: 'too_short',
      feedback: 'Goresan terlalu pendek',
    };
  }

  const expected = applyOffset(logicalStroke.median, mode === 'quiz' ? anchorOffset : undefined);

  if (logicalStroke.isClosedLoop) {
    return evaluateClosedLoop(drawn, expected, mode);
  }

  const expLen = polylineLength(expected);
  const drawnLen = polylineLength(drawn);
  const isShortStroke = expLen < 145;

  const minLen = isShortStroke ? Math.max(16, expLen * 0.32) : Math.max(38, expLen * 0.4);
  const maxLen = isShortStroke ? Math.max(260, expLen * 2.9) : expLen * 2.2;

  if (drawnLen < minLen) {
    return {
      passed: false,
      score: 12,
      reason: 'too_short',
      feedback: 'Goresan terlalu pendek — tarik lebih penuh',
    };
  }

  if (drawnLen > maxLen) {
    return {
      passed: false,
      score: 18,
      reason: 'too_long',
      feedback: 'Goresan terlalu panjang',
    };
  }

  const resDrawn = resamplePolyline(drawn, RESAMPLE_COUNT);
  const resExp = resamplePolyline(expected, RESAMPLE_COUNT);
  const resDrawnRev = [...resDrawn].reverse();

  const dForward = meanDistance(resDrawn, resExp);
  const dReverse = meanDistance(resDrawnRev, resExp);

  const startDist = distance(resDrawn[0], resExp[0]);
  const startToExpEnd = distance(resDrawn[0], resExp[resExp.length - 1]);
  const endDist = distance(resDrawn[resDrawn.length - 1], resExp[resExp.length - 1]);

  // Direction check: detect drawing strictly backwards on non-tiny strokes
  const expChord = distance(resExp[0], resExp[resExp.length - 1]);
  if (!isShortStroke && expChord > 90) {
    const ux = resDrawn[resDrawn.length - 1].x - resDrawn[0].x;
    const uy = resDrawn[resDrawn.length - 1].y - resDrawn[0].y;
    const ex = resExp[resExp.length - 1].x - resExp[0].x;
    const ey = resExp[resExp.length - 1].y - resExp[0].y;
    const mag = Math.hypot(ux, uy) * Math.hypot(ex, ey);
    const cosSim = mag > 1e-6 ? (ux * ex + uy * ey) / mag : 1;

    if (
      (dReverse < dForward * 0.78 && startToExpEnd < startDist * 0.88) ||
      (cosSim < -0.55 && dReverse < dForward * 0.92)
    ) {
      return {
        passed: false,
        score: Math.max(10, Math.round(clamp01(1 - dForward / 360) * 45)),
        reason: 'wrong_direction',
        feedback: 'Arah goresan terbalik — ikuti titik awal ke ujung',
      };
    }
  } else if (isShortStroke && expLen >= 90) {
    if (dReverse < dForward * 0.65 && startToExpEnd < startDist * 0.72) {
      return {
        passed: false,
        score: 25,
        reason: 'wrong_direction',
        feedback: 'Arah goresan terbalik',
      };
    }
  }

  // Short strokes (dakuten ticks, dots) use midpoint & gentle angle tolerance
  if (isShortStroke) {
    const cDrawn = getCentroid(resDrawn);
    const cExp = getCentroid(resExp);
    const midDist = distance(cDrawn, cExp);
    const midTol = mode === 'practice' ? 185 : 250;
    const pathTol = mode === 'practice' ? 200 : 265;

    const midScore = clamp01(1 - midDist / midTol);
    const pathScore = clamp01(1 - dForward / pathTol);
    const score = Math.round((midScore * 0.55 + pathScore * 0.45) * 100);
    const passed = score >= 52 && midDist < midTol * 0.95;

    return {
      passed,
      score,
      reason: passed ? 'ok' : midDist >= midTol * 0.9 ? 'wrong_start' : 'wrong_shape',
      feedback: passed
        ? 'Tepat!'
        : midDist >= midTol * 0.9
          ? 'Posisi goresan pendek meleset'
          : 'Sesuaikan sudut goresan pendek',
    };
  }

  // Start point proximity check for standard strokes
  const startAllowance = (mode === 'practice' ? 205 : 275) + Math.min(45, expLen * 0.03);
  if (startDist > startAllowance && dForward > 135) {
    return {
      passed: false,
      score: Math.round(clamp01(1 - startDist / (startAllowance * 1.8)) * 45),
      reason: 'wrong_start',
      feedback:
        mode === 'practice'
          ? 'Mulai lebih dekat ke titik awal yang ditandai'
          : 'Titik awal goresan terlalu jauh',
    };
  }

  // Trajectory & shape accuracy
  const p90Dist = percentileDistance(resDrawn, resExp, 0.9);
  const shapeDist = meanDistance(centerPoints(resDrawn), centerPoints(resExp));

  const absTol = (mode === 'practice' ? 205 : 275) + Math.min(35, expLen * 0.025);
  const shapeTol = (mode === 'practice' ? 155 : 190) + Math.min(35, expLen * 0.025);
  const endTol = (mode === 'practice' ? 235 : 300) + Math.min(40, expLen * 0.03);
  const p90Tol = (mode === 'practice' ? 285 : 360) + Math.min(55, expLen * 0.035);

  const absScore = clamp01(1 - dForward / absTol);
  const shapeScore = clamp01(1 - shapeDist / shapeTol);
  const endScore = clamp01(1 - endDist / endTol);
  const lenRatio = Math.min(drawnLen, expLen) / Math.max(drawnLen, expLen);
  const lenScore = clamp01((lenRatio - 0.35) / 0.65);

  const rawWeighted =
    mode === 'practice'
      ? absScore * 0.44 + shapeScore * 0.31 + endScore * 0.15 + lenScore * 0.1
      : absScore * 0.28 + shapeScore * 0.47 + endScore * 0.15 + lenScore * 0.1;

  // Gentle penalty if a portion of the stroke strays wildly far
  const outlierPenalty = p90Dist > p90Tol ? clamp01((p90Dist - p90Tol) / 180) * 0.22 : 0;
  const finalScore = Math.round(clamp01(rawWeighted - outlierPenalty) * 100);

  const passed = finalScore >= 58 && shapeDist < shapeTol * 1.08 && dForward < absTol * 1.05;

  if (!passed) {
    return {
      passed: false,
      score: finalScore,
      reason: startDist > startAllowance * 0.92 ? 'wrong_start' : 'wrong_shape',
      feedback:
        startDist > startAllowance * 0.92
          ? 'Mulai lebih dekat ke titik awal'
          : 'Bentuk goresan kurang sesuai — coba lagi',
    };
  }

  const praise =
    finalScore >= 88
      ? 'Sangat presisi!'
      : finalScore >= 75
        ? 'Bagus!'
        : 'Tepat!';

  return {
    passed: true,
    score: finalScore,
    reason: 'ok',
    feedback: praise,
  };
}

/**
 * In Quiz mode (blank canvas without tracing silhouette), once the user passes stroke 1,
 * compute a bounded translation offset so writing slightly off-center still evaluates fairly.
 */
export function computeQuizAnchorOffset(
  drawn: Point[],
  expected: Point[],
  maxShift: number = 150,
): { dx: number; dy: number } {
  if (drawn.length < 2 || expected.length < 2) return { dx: 0, dy: 0 };
  const cDrawn = getCentroid(resamplePolyline(drawn, 16));
  const cExp = getCentroid(resamplePolyline(expected, 16));
  const dx = Math.max(-maxShift, Math.min(maxShift, cDrawn.x - cExp.x));
  const dy = Math.max(-maxShift, Math.min(maxShift, cDrawn.y - cExp.y));
  return { dx, dy };
}
