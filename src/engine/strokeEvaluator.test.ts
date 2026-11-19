import { describe, expect, test } from 'bun:test';
import { getKanaByChar } from '../data/kanaStrokeData';
import type { Point } from '../types/kana';
import {
  computeQuizAnchorOffset,
  evaluateStroke,
  resamplePolyline,
} from './strokeEvaluator';

function jitter(points: Point[], dx: number, dy: number, amp: number = 8): Point[] {
  return resamplePolyline(points, 28).map((p, i) => ({
    x: p.x + dx + Math.sin(i * 1.1) * amp,
    y: p.y + dy + Math.cos(i * 0.9) * amp,
  }));
}

describe('strokeEvaluator', () => {
  test('menerima goresan yang mengikuti panduan dengan deviasi tangan alami', () => {
    const kanaA = getKanaByChar('あ')!;
    for (const stroke of kanaA.strokes) {
      const drawn = jitter(stroke.median, 14, -10, 10);
      const res = evaluateStroke(drawn, stroke, { mode: 'practice' });
      expect(res.passed).toBe(true);
      expect(res.score).toBeGreaterThanOrEqual(82);
    }
  });

  test('menolak goresan yang ditulis terbalik dengan pesan arah terbalik', () => {
    const kanaA = getKanaByChar('あ')!;
    const stroke1 = kanaA.strokes[0];
    const reversed = [...resamplePolyline(stroke1.median, 24)].reverse();
    const res = evaluateStroke(reversed, stroke1, { mode: 'practice' });
    expect(res.passed).toBe(false);
    expect(res.reason).toBe('wrong_direction');
  });

  test('menolak sentuhan terlalu pendek dan coretan terlalu panjang', () => {
    const kanaKa = getKanaByChar('カ')!;
    const stroke1 = kanaKa.strokes[0];

    const tinyTap: Point[] = [
      stroke1.median[0],
      { x: stroke1.median[0].x + 12, y: stroke1.median[0].y + 4 },
    ];
    const shortRes = evaluateStroke(tinyTap, stroke1, { mode: 'practice' });
    expect(shortRes.passed).toBe(false);
    expect(shortRes.reason).toBe('too_short');

    const zigzag: Point[] = [];
    for (let i = 0; i < 40; i++) {
      zigzag.push({ x: (i % 2 === 0 ? 100 : 900), y: 150 + i * 18 });
    }
    const longRes = evaluateStroke(zigzag, stroke1, { mode: 'practice' });
    expect(longRes.passed).toBe(false);
    expect(longRes.reason).toBe('too_long');
  });

  test('menolak goresan yang dimulai jauh dari titik awal', () => {
    const kanaI = getKanaByChar('い')!;
    const stroke1 = kanaI.strokes[0];
    const farShifted = jitter(stroke1.median, 360, 0, 5);
    const res = evaluateStroke(farShifted, stroke1, { mode: 'practice' });
    expect(res.passed).toBe(false);
    expect(res.reason).toBe('wrong_start');
  });

  test('menerima goresan melingkar kompleks (の) dan dakuten pendek (が)', () => {
    const kanaNo = getKanaByChar('の')!;
    const drawnNo = jitter(kanaNo.strokes[0].median, -12, 14, 14);
    expect(evaluateStroke(drawnNo, kanaNo.strokes[0], { mode: 'practice' }).passed).toBe(true);

    const kanaGa = getKanaByChar('が')!;
    // Strokes 4 & 5 are short dakuten ticks
    for (const idx of [3, 4]) {
      const tick = kanaGa.strokes[idx];
      const drawnTick = jitter(tick.median, 18, -14, 6);
      expect(evaluateStroke(drawnTick, tick, { mode: 'practice' }).passed).toBe(true);
    }
  });

  test('menerima lingkaran handakuten (ぱ/パ) searah maupun berlawanan jarum jam dari sudut mana saja', () => {
    for (const ch of ['ぱ', 'パ']) {
      const kana = getKanaByChar(ch)!;
      const circleStroke = kana.strokes[kana.strokes.length - 1];
      const resampled = resamplePolyline(circleStroke.median, 28);

      // Rotated start (starting halfway around the circle)
      const rotated = [...resampled.slice(14), ...resampled.slice(0, 14)];
      expect(evaluateStroke(rotated, circleStroke, { mode: 'practice' }).passed).toBe(true);

      // Reversed orientation + rotated start
      const reversedRotated = [...rotated].reverse();
      expect(evaluateStroke(reversedRotated, circleStroke, { mode: 'practice' }).passed).toBe(true);
    }
  });

  test('mode kuis mengkompensasi tulisan dari ingatan yang sedikit bergeser melalui anchor offset', () => {
    const kanaA = getKanaByChar('あ')!;
    const shiftX = 110;
    const shiftY = -75;

    const drawn1 = jitter(kanaA.strokes[0].median, shiftX, shiftY, 12);
    const res1 = evaluateStroke(drawn1, kanaA.strokes[0], { mode: 'quiz' });
    expect(res1.passed).toBe(true);

    const anchor = computeQuizAnchorOffset(drawn1, kanaA.strokes[0].median);
    expect(Math.abs(anchor.dx - shiftX)).toBeLessThan(20);
    expect(Math.abs(anchor.dy - shiftY)).toBeLessThan(20);

    for (let i = 1; i < kanaA.strokes.length; i++) {
      const drawn = jitter(kanaA.strokes[i].median, shiftX, shiftY, 14);
      const res = evaluateStroke(drawn, kanaA.strokes[i], {
        mode: 'quiz',
        anchorOffset: anchor,
      });
      expect(res.passed).toBe(true);
    }
  });
});
