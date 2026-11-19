import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { renderInkStroke } from '../engine/brushRenderer';
import { computeQuizAnchorOffset, evaluateStroke } from '../engine/strokeEvaluator';
import type {
  GuideLevel,
  KanaCharacter,
  Point,
  StrokeEvaluationResult,
  ThemeMode,
} from '../types/kana';
import { StrokeAnimationLayer } from './StrokeAnimationLayer';

export interface CanvasSessionState {
  acceptedCount: number;
  isComplete: boolean;
  avgScore: number | null;
  lastFeedback: StrokeEvaluationResult | null;
  mistakes: number;
}

interface WritingCanvasProps {
  character: KanaCharacter;
  mode: 'practice' | 'quiz';
  theme: ThemeMode;
  guideLevel: GuideLevel;
  isAnimating: boolean;
  hintStrokeIndex: number | null;
  resetToken: number;
  undoToken: number;
  onAnimationEnd: () => void;
  onInterruptAnimation?: () => void;
  onStateChange?: (state: CanvasSessionState) => void;
  onComplete?: (summary: { avgScore: number; mistakes: number }) => void;
}

interface AcceptedStroke {
  points: Point[];
  score: number;
}

interface RejectedFlash {
  points: Point[];
  startedAt: number;
}

const FLASH_DURATION_MS = 460;

function readCssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return val || fallback;
}

export function WritingCanvas({
  character,
  mode,
  theme,
  guideLevel,
  isAnimating,
  hintStrokeIndex,
  resetToken,
  undoToken,
  onAnimationEnd,
  onInterruptAnimation,
  onStateChange,
  onComplete,
}: WritingCanvasProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [canvasCssSize, setCanvasCssSize] = useState(380);
  const [accepted, setAccepted] = useState<AcceptedStroke[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [lastFeedback, setLastFeedback] = useState<StrokeEvaluationResult | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const isDrawingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const activePointsRef = useRef<Point[]>([]);
  const rejectedFlashRef = useRef<RejectedFlash | null>(null);
  const anchorOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const prevUndoTokenRef = useRef(undoToken);
  const shakeTimerRef = useRef<number | null>(null);

  const isComplete = accepted.length >= character.strokeCount;
  const avgScore =
    accepted.length > 0
      ? Math.round(accepted.reduce((sum, s) => sum + s.score, 0) / accepted.length)
      : null;

  // Reset internal session whenever character or resetToken changes
  useEffect(() => {
    setAccepted([]);
    setMistakes(0);
    setLastFeedback(null);
    setIsShaking(false);
    isDrawingRef.current = false;
    activePointerIdRef.current = null;
    activePointsRef.current = [];
    rejectedFlashRef.current = null;
    anchorOffsetRef.current = { dx: 0, dy: 0 };
  }, [character.char, resetToken]);

  // Handle external undo requests
  useEffect(() => {
    if (undoToken === prevUndoTokenRef.current) return;
    prevUndoTokenRef.current = undoToken;
    setAccepted((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice(0, -1);
      if (next.length === 0) {
        anchorOffsetRef.current = { dx: 0, dy: 0 };
      }
      return next;
    });
    setLastFeedback(null);
  }, [undoToken]);

  // Notify parent of session state
  useEffect(() => {
    onStateChange?.({
      acceptedCount: accepted.length,
      isComplete,
      avgScore,
      lastFeedback,
      mistakes,
    });
  }, [accepted.length, isComplete, avgScore, lastFeedback, mistakes, onStateChange]);

  // Observe responsive stage size
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        setCanvasCssSize(Math.round(rect.width));
      }
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Draw all layers on the 2D canvas
  const redrawCanvas = useCallback(
    (now: number = performance.now()) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const targetPx = Math.max(1, Math.round(canvasCssSize * dpr));
      if (canvas.width !== targetPx || canvas.height !== targetPx) {
        canvas.width = targetPx;
        canvas.height = targetPx;
      }

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvasCssSize, canvasCssSize);

      const inkColor = readCssVar('--ink-primary', theme === 'sumi' ? '#f0ece1' : '#1f1e1b');
      const warnColor = readCssVar('--accent-warn', theme === 'sumi' ? '#e09948' : '#c47629');

      // Accepted strokes
      for (const stroke of accepted) {
        renderInkStroke(ctx, stroke.points, canvasCssSize, {
          color: inkColor,
          baseWidth: 52,
          opacity: 0.96,
        });
      }

      // Active live stroke
      if (activePointsRef.current.length > 0) {
        renderInkStroke(ctx, activePointsRef.current, canvasCssSize, {
          color: inkColor,
          baseWidth: 54,
          opacity: 0.92,
        });
      }

      // Fading rejected stroke feedback
      const flash = rejectedFlashRef.current;
      if (flash) {
        const elapsed = now - flash.startedAt;
        if (elapsed < FLASH_DURATION_MS) {
          const opacity = Math.max(0, 1 - elapsed / FLASH_DURATION_MS) * 0.78;
          renderInkStroke(ctx, flash.points, canvasCssSize, {
            color: warnColor,
            baseWidth: 46,
            opacity,
          });
        } else {
          rejectedFlashRef.current = null;
        }
      }

      ctx.restore();
    },
    [accepted, canvasCssSize, theme],
  );

  // Redraw when accepted strokes, canvas size, or theme changes
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Cleanup shake timer
  useEffect(() => {
    return () => {
      if (shakeTimerRef.current !== null) {
        window.clearTimeout(shakeTimerRef.current);
      }
    };
  }, []);

  const animateRejectedFade = useCallback(() => {
    const step = (now: number) => {
      redrawCanvas(now);
      if (rejectedFlashRef.current) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [redrawCanvas]);

  const toLogicalPoint = useCallback((e: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 1024;
    const y = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 1024;
    return {
      x: Math.max(0, Math.min(1024, x)),
      y: Math.max(0, Math.min(1024, y)),
      pressure: e.pressure,
      time: performance.now(),
    };
  }, []);

  const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (isComplete) return;

    if (isAnimating) {
      onInterruptAnimation?.();
    }

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointerIdRef.current = e.pointerId;
    isDrawingRef.current = true;
    rejectedFlashRef.current = null;

    const pt = toLogicalPoint(e);
    activePointsRef.current = [pt];
    redrawCanvas();
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();

    const pt = toLogicalPoint(e);
    const pts = activePointsRef.current;
    const last = pts[pts.length - 1];

    // Filter ultra-tiny pointer jitter (< 4 units in 1024 space)
    if (!last || Math.hypot(pt.x - last.x, pt.y - last.y) >= 4) {
      pts.push(pt);
      redrawCanvas();
    }
  };

  const finishStroke = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    isDrawingRef.current = false;
    activePointerIdRef.current = null;

    const drawn = activePointsRef.current;
    activePointsRef.current = [];

    const expectedStroke = character.strokes[accepted.length];
    if (!expectedStroke) {
      redrawCanvas();
      return;
    }

    const result = evaluateStroke(drawn, expectedStroke, {
      mode,
      anchorOffset: mode === 'quiz' && accepted.length > 0 ? anchorOffsetRef.current : undefined,
    });

    setLastFeedback(result);

    if (result.passed) {
      if (mode === 'quiz' && accepted.length === 0) {
        anchorOffsetRef.current = computeQuizAnchorOffset(drawn, expectedStroke.median);
      }
      const nextAccepted = [...accepted, { points: drawn, score: result.score }];
      setAccepted(nextAccepted);

      if (nextAccepted.length >= character.strokeCount) {
        const finalAvg = Math.round(
          nextAccepted.reduce((sum, s) => sum + s.score, 0) / nextAccepted.length,
        );
        onComplete?.({ avgScore: finalAvg, mistakes });
      }
    } else {
      setMistakes((m) => m + 1);
      rejectedFlashRef.current = { points: drawn, startedAt: performance.now() };
      animateRejectedFade();

      setIsShaking(false);
      if (shakeTimerRef.current !== null) {
        window.clearTimeout(shakeTimerRef.current);
      }
      requestAnimationFrame(() => {
        setIsShaking(true);
        shakeTimerRef.current = window.setTimeout(() => setIsShaking(false), 320);
      });
    }
  };

  return (
    <div
      ref={stageRef}
      className={`canvas-stage ${isShaking ? 'is-shake' : ''}`}
      aria-label={`Kanvas latihan menulis huruf ${character.romaji}`}
    >
      {/* Layer 1: Traditional Japanese masume cross-guidelines */}
      <svg className="canvas-layer masume-svg" viewBox="0 0 100 100" aria-hidden="true">
        <line
          x1="50"
          y1="0"
          x2="50"
          y2="100"
          stroke="var(--masume-line)"
          strokeWidth="0.45"
          strokeDasharray="2.2 2.2"
        />
        <line
          x1="0"
          y1="50"
          x2="100"
          y2="50"
          stroke="var(--masume-line)"
          strokeWidth="0.45"
          strokeDasharray="2.2 2.2"
        />
        <rect
          x="8"
          y="8"
          width="84"
          height="84"
          fill="none"
          stroke="var(--masume-line)"
          strokeWidth="0.3"
          opacity="0.55"
        />
      </svg>

      {/* Layer 2: Tracing silhouette, active stroke indicator, and calligraphic stroke animation */}
      <StrokeAnimationLayer
        character={character}
        activeStrokeIndex={accepted.length}
        guideLevel={guideLevel}
        isAnimating={isAnimating}
        hintStrokeIndex={hintStrokeIndex}
        onAnimationEnd={onAnimationEnd}
      />

      {/* Layer 3: User calligraphic ink drawing canvas */}
      <canvas
        ref={canvasRef}
        className="canvas-layer draw-canvas"
        style={{ opacity: isAnimating ? 0.08 : 1, transition: 'opacity 180ms ease' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishStroke}
        onPointerCancel={finishStroke}
      />

      {/* Layer 4: Hanko completion seal */}
      {isComplete && !isAnimating && (
        <div className="hanko-stamp" aria-label={`Selesai dengan akurasi ${avgScore ?? 100}%`}>
          <span className="hanko-stamp-kanji">済</span>
          {avgScore !== null && <span className="hanko-stamp-score">{avgScore}%</span>}
        </div>
      )}
    </div>
  );
}
