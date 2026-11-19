import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CharacterProgress, ProgressMap } from '../types/kana';

const PROGRESS_STORAGE_KEY = 'kana-sho-progress-v1';

function readProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as ProgressMap;
    }
  } catch {
    // ignore malformed storage
  }
  return {};
}

export function useProgress() {
  const [progress, setProgress] = useState<ProgressMap>(readProgress);

  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // ignore quota errors
    }
  }, [progress]);

  const recordCompletion = useCallback((char: string, avgScore: number, usedHint: boolean = false) => {
    const clampedScore = Math.max(0, Math.min(100, Math.round(avgScore)));
    setProgress((prev) => {
      const existing: CharacterProgress = prev[char] ?? {
        completions: 0,
        bestScore: 0,
        mastered: false,
        lastPracticedAt: 0,
      };
      const masteredNow = existing.mastered || (!usedHint && clampedScore >= 70);
      return {
        ...prev,
        [char]: {
          completions: existing.completions + 1,
          bestScore: Math.max(existing.bestScore, clampedScore),
          mastered: masteredNow,
          lastPracticedAt: Date.now(),
        },
      };
    });
  }, []);

  const toggleMastered = useCallback((char: string) => {
    setProgress((prev) => {
      const existing = prev[char] ?? {
        completions: 0,
        bestScore: 0,
        mastered: false,
        lastPracticedAt: Date.now(),
      };
      return {
        ...prev,
        [char]: {
          ...existing,
          mastered: !existing.mastered,
          lastPracticedAt: Date.now(),
        },
      };
    });
  }, []);

  const resetProgress = useCallback(() => {
    setProgress({});
  }, []);

  const masteredCount = useMemo(
    () => Object.values(progress).filter((p) => p.mastered).length,
    [progress],
  );

  return {
    progress,
    masteredCount,
    recordCompletion,
    toggleMastered,
    resetProgress,
  };
}
