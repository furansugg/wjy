import { useEffect, useId, useMemo, useState } from 'react';
import type { GuideLevel, KanaCharacter, Point } from '../types/kana';

interface StrokeAnimationLayerProps {
  character: KanaCharacter;
  activeStrokeIndex: number;
  guideLevel: GuideLevel;
  isAnimating: boolean;
  hintStrokeIndex: number | null;
  onAnimationEnd: () => void;
}

function parseClipPathLength(clipStrokePath: string): number {
  const nums = clipStrokePath.match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 4) return 400;
  let total = 0;
  for (let i = 2; i + 1 < nums.length; i += 2) {
    const x0 = Number(nums[i - 2]);
    const y0 = Number(nums[i - 1]);
    const x1 = Number(nums[i]);
    const y1 = Number(nums[i + 1]);
    total += Math.hypot(x1 - x0, y1 - y0);
  }
  return Math.max(120, total);
}

function getInitialAngleDeg(median: Point[]): number {
  if (median.length < 2) return 0;
  const start = median[0];
  // Find a point reasonably far from start to get stable visual direction
  let target = median[1];
  for (let i = 1; i < median.length; i++) {
    if (Math.hypot(median[i].x - start.x, median[i].y - start.y) >= 45) {
      target = median[i];
      break;
    }
  }
  return (Math.atan2(target.y - start.y, target.x - start.x) * 180) / Math.PI;
}

export function StrokeAnimationLayer({
  character,
  activeStrokeIndex,
  guideLevel,
  isAnimating,
  hintStrokeIndex,
  onAnimationEnd,
}: StrokeAnimationLayerProps) {
  const uid = useId().replace(/:/g, '');
  const [animState, setAnimState] = useState<{ strokeIdx: number; progress: number }>({
    strokeIdx: 0,
    progress: 0,
  });

  const strokeTimings = useMemo(() => {
    return character.strokes.map((stroke) => {
      const pieceLengths = stroke.pieces.map((p) => parseClipPathLength(p.clipStrokePath));
      const maxLen = Math.max(...pieceLengths, 180);
      // Natural calligraphic pacing: ~320ms for short ticks, ~760ms for long loops
      const durationMs = Math.max(300, Math.min(840, 220 + maxLen * 0.34));
      return { pieceLengths, maxLen, durationMs };
    });
  }, [character]);

  useEffect(() => {
    if (!isAnimating) {
      setAnimState({ strokeIdx: 0, progress: 0 });
      return;
    }

    let rafId = 0;
    const pauseBetweenMs = 210;
    const endHoldMs = 450;
    const startTime = performance.now();

    // Build cumulative timeline per stroke
    const schedule: Array<{ start: number; drawEnd: number; end: number }> = [];
    let cursor = 80;
    for (const t of strokeTimings) {
      const drawEnd = cursor + t.durationMs;
      const end = drawEnd + pauseBetweenMs;
      schedule.push({ start: cursor, drawEnd, end });
      cursor = end;
    }
    const totalDuration = cursor + endHoldMs;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      if (elapsed >= totalDuration) {
        onAnimationEnd();
        return;
      }

      let currentIdx = schedule.length - 1;
      let progress = 1;
      for (let i = 0; i < schedule.length; i++) {
        const slot = schedule[i];
        if (elapsed < slot.start) {
          currentIdx = i;
          progress = 0;
          break;
        }
        if (elapsed <= slot.drawEnd) {
          currentIdx = i;
          const linear = (elapsed - slot.start) / Math.max(1, slot.drawEnd - slot.start);
          // Smooth ease-in-out cubic
          progress =
            linear < 0.5
              ? 4 * linear * linear * linear
              : 1 - Math.pow(-2 * linear + 2, 3) / 2;
          break;
        }
        if (elapsed <= slot.end) {
          currentIdx = i;
          progress = 1;
          break;
        }
      }

      setAnimState({ strokeIdx: currentIdx, progress });
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isAnimating, strokeTimings, onAnimationEnd]);

  // Determine which stroke's start indicator to display when not animating
  const activeStroke =
    !isAnimating && activeStrokeIndex < character.strokes.length
      ? character.strokes[activeStrokeIndex]
      : null;

  const showHintOnly = !isAnimating && guideLevel === 'off' && hintStrokeIndex !== null;
  const hintedStroke =
    showHintOnly && hintStrokeIndex !== null && hintStrokeIndex < character.strokes.length
      ? character.strokes[hintStrokeIndex]
      : null;

  const indicatorStroke = isAnimating
    ? character.strokes[animState.strokeIdx] ?? null
    : showHintOnly
      ? hintedStroke
      : guideLevel !== 'off'
        ? activeStroke
        : null;

  return (
    <svg
      className="canvas-layer guide-svg"
      viewBox="0 0 1024 1024"
      aria-hidden="true"
    >
      <defs>
        {character.strokes.map((stroke) =>
          stroke.pieces.map((piece) => (
            <clipPath key={`${uid}-${piece.id}`} id={`${uid}-clip-${piece.id}`}>
              <path d={piece.outlinePath} />
            </clipPath>
          )),
        )}
      </defs>

      {/* Base silhouette guide */}
      {(isAnimating || guideLevel !== 'off') &&
        character.strokes.map((stroke, idx) => {
          const isCurrentHighlight =
            !isAnimating && guideLevel === 'full' && idx === activeStrokeIndex;
          const fillColor = isAnimating
            ? 'var(--ink-guide-faint)'
            : isCurrentHighlight
              ? 'var(--ink-guide-active)'
              : guideLevel === 'full'
                ? 'var(--ink-guide)'
                : 'var(--ink-guide-faint)';

          return (
            <g key={`sil-${stroke.strokeNumber}`} fill={fillColor}>
              {stroke.pieces.map((piece) => (
                <path key={piece.id} d={piece.outlinePath} />
              ))}
            </g>
          );
        })}

      {/* Temporary single-stroke hint in Quiz Mode */}
      {hintedStroke && (
        <g fill="var(--ink-guide-active)">
          {hintedStroke.pieces.map((piece) => (
            <path key={`hint-${piece.id}`} d={piece.outlinePath} />
          ))}
        </g>
      )}

      {/* Calligraphic clip-path animation layer */}
      {isAnimating &&
        character.strokes.map((stroke, idx) => {
          if (idx > animState.strokeIdx) return null;
          const timing = strokeTimings[idx];
          const isFullyRevealed = idx < animState.strokeIdx;
          const drawnDistance = isFullyRevealed ? timing.maxLen : timing.maxLen * animState.progress;

          return (
            <g key={`anim-${stroke.strokeNumber}`}>
              {stroke.pieces.map((piece, pIdx) => {
                const pieceLen = timing.pieceLengths[pIdx];
                const dashOffset = Math.max(0, pieceLen - drawnDistance);
                return (
                  <path
                    key={`anim-piece-${piece.id}`}
                    d={piece.clipStrokePath}
                    clipPath={`url(#${uid}-clip-${piece.id})`}
                    fill="none"
                    stroke="var(--ink-primary)"
                    strokeWidth={148}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={pieceLen + 10}
                    strokeDashoffset={dashOffset}
                  />
                );
              })}
            </g>
          );
        })}

      {/* Active stroke starting dot, number badge, and initial direction arrow */}
      {indicatorStroke && indicatorStroke.median.length > 0 && (() => {
        const start = indicatorStroke.median[0];
        const angle = getInitialAngleDeg(indicatorStroke.median);
        const showFullDetails = isAnimating || guideLevel === 'full' || showHintOnly;

        return (
          <g>
            {showFullDetails && !indicatorStroke.isClosedLoop && (
              <g transform={`translate(${start.x}, ${start.y}) rotate(${angle})`}>
                <line
                  x1={26}
                  y1={0}
                  x2={78}
                  y2={0}
                  stroke="var(--accent-hanko)"
                  strokeWidth={6}
                  strokeLinecap="round"
                  opacity={0.75}
                />
                <path
                  d="M 62,-13 L 82,0 L 62,13"
                  fill="none"
                  stroke="var(--accent-hanko)"
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.75}
                />
              </g>
            )}

            <circle
              cx={start.x}
              cy={start.y}
              r={showFullDetails ? 28 : 18}
              fill="var(--accent-hanko)"
              className="stroke-start-pulse"
            />
            <circle
              cx={start.x}
              cy={start.y}
              r={showFullDetails ? 21 : 11}
              fill="var(--accent-hanko)"
            />
            {showFullDetails && (
              <text
                x={start.x}
                y={start.y + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#fcfbf7"
                fontSize={24}
                fontWeight={700}
                fontFamily="var(--font-ui)"
              >
                {indicatorStroke.strokeNumber}
              </text>
            )}
          </g>
        );
      })()}
    </svg>
  );
}
