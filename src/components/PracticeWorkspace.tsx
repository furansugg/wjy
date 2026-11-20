import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eraser,
  Eye,
  EyeOff,
  Play,
  RotateCcw,
  Square,
  Undo2,
} from 'lucide-react';
import { getScriptLabel, getSubgroupLabel } from '../data/kanaCatalog';
import type { CharacterProgress, GuideLevel, KanaCharacter, ThemeMode } from '../types/kana';
import { WritingCanvas } from './WritingCanvas';
import type { CanvasSessionState } from './WritingCanvas';

interface PracticeWorkspaceProps {
  character: KanaCharacter;
  characterProgress?: CharacterProgress;
  theme: ThemeMode;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onRecordCompletion: (char: string, avgScore: number) => void;
}

const GUIDE_CYCLE: GuideLevel[] = ['full', 'faint', 'off'];

function getGuideLabel(level: GuideLevel): string {
  switch (level) {
    case 'full':
      return 'Panduan: Penuh';
    case 'faint':
      return 'Panduan: Samar';
    case 'off':
      return 'Panduan: Mati';
  }
}

export function PracticeWorkspace({
  character,
  characterProgress,
  theme,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onRecordCompletion,
}: PracticeWorkspaceProps) {
  const [guideLevel, setGuideLevel] = useState<GuideLevel>('full');
  const [isAnimating, setIsAnimating] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [undoToken, setUndoToken] = useState(0);
  const [session, setSession] = useState<CanvasSessionState>({
    acceptedCount: 0,
    isComplete: false,
    avgScore: null,
    lastFeedback: null,
    mistakes: 0,
  });

  // Stop animation when switching character
  useEffect(() => {
    setIsAnimating(false);
  }, [character.char]);

  const handleClear = useCallback(() => {
    setIsAnimating(false);
    setResetToken((t) => t + 1);
  }, []);

  const handleUndo = useCallback(() => {
    setIsAnimating(false);
    setUndoToken((t) => t + 1);
  }, []);

  const handleToggleAnimation = useCallback(() => {
    setIsAnimating((prev) => !prev);
  }, []);

  const handleCycleGuide = useCallback(() => {
    setGuideLevel((prev) => {
      const idx = GUIDE_CYCLE.indexOf(prev);
      return GUIDE_CYCLE[(idx + 1) % GUIDE_CYCLE.length];
    });
  }, []);

  const handleComplete = useCallback(
    ({ avgScore }: { avgScore: number; mistakes: number }) => {
      onRecordCompletion(character.char, avgScore);
    },
    [character.char, onRecordCompletion],
  );

  // Keyboard shortcuts (ignored when typing in search input)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.key === 'ArrowLeft' && hasPrev) {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'ArrowRight' && hasNext) {
        e.preventDefault();
        onNext();
      } else if (e.key === ' ') {
        e.preventDefault();
        handleToggleAnimation();
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleClear();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasPrev, hasNext, onPrev, onNext, handleToggleAnimation, handleClear, handleUndo]);

  const isMastered = Boolean(characterProgress?.mastered);

  return (
    <section className="studio-column" aria-label="Area latihan menulis">
      <div className="char-header">
        <button
          type="button"
          className="nav-arrow-btn"
          onClick={onPrev}
          disabled={!hasPrev}
          aria-label="Huruf sebelumnya"
          title="Huruf sebelumnya (←)"
        >
          <ArrowLeft size={18} strokeWidth={1.8} />
        </button>

        <div className="char-identity">
          <div className="char-romaji-display">{character.romaji}</div>
          <span className="char-category">
            {getScriptLabel(character.script)} · {getSubgroupLabel(character.subgroup)}
          </span>
        </div>

        <button
          type="button"
          className="nav-arrow-btn"
          onClick={onNext}
          disabled={!hasNext}
          aria-label="Huruf berikutnya"
          title="Huruf berikutnya (→)"
        >
          <ArrowRight size={18} strokeWidth={1.8} />
        </button>
      </div>

      {/* Stroke step progress dots */}
      <div className="stroke-steps">
        <div className="stroke-progress">
          <div className="stroke-dots" aria-label="Progres goresan">
            {character.strokes.map((stroke, idx) => {
              const done = idx < session.acceptedCount;
              const current = idx === session.acceptedCount && !session.isComplete;
              return (
                <span
                  key={stroke.strokeNumber}
                  className={`stroke-dot ${done ? 'is-done' : current ? 'is-current' : ''}`}
                  title={`Goresan ${stroke.strokeNumber}`}
                >
                  {done ? <Check size={12} strokeWidth={2.5} /> : stroke.strokeNumber}
                </span>
              );
            })}
          </div>
          <span className="stroke-counter-text">
            {session.isComplete
              ? `Selesai — ${character.strokeCount} goresan tuntas`
              : `Goresan ${Math.min(session.acceptedCount + 1, character.strokeCount)} dari ${character.strokeCount}`}
          </span>
        </div>

        {characterProgress && (isMastered || characterProgress.bestScore > 0) && (
          <div className="char-score">
            {isMastered && (
              <span className="char-mastered"><Check size={13} /> Dikuasai</span>
            )}
            {characterProgress.bestScore > 0 && (
              <span className="best-score-label">
                Skor terbaik: <strong>{characterProgress.bestScore}%</strong>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Interactive Masume Writing Canvas */}
      <WritingCanvas
        character={character}
        mode="practice"
        theme={theme}
        guideLevel={guideLevel}
        isAnimating={isAnimating}
        hintStrokeIndex={null}
        resetToken={resetToken}
        undoToken={undoToken}
        onAnimationEnd={() => setIsAnimating(false)}
        onInterruptAnimation={() => setIsAnimating(false)}
        onStateChange={setSession}
        onComplete={handleComplete}
      />

      {/* Feedback pill slot */}
      <div className="feedback-slot" aria-live="polite">
        {isAnimating ? (
          <span className="feedback-pill">Memutar animasi urutan goresan...</span>
        ) : session.isComplete ? (
          <span className="feedback-pill is-complete">
            Selesai! Akurasi {session.avgScore ?? 100}% —{' '}
            {(session.avgScore ?? 0) >= 85
              ? 'Sangat rapi!'
              : (session.avgScore ?? 0) >= 70
                ? 'Huruf dikuasai!'
                : 'Coba sekali lagi agar makin mantap'}
          </span>
        ) : session.lastFeedback ? (
          <span
            className={`feedback-pill ${session.lastFeedback.passed ? 'is-ok' : 'is-warn'}`}
          >
            {session.lastFeedback.feedback}
            {session.lastFeedback.passed ? ` (${session.lastFeedback.score}%)` : ''}
          </span>
        ) : (
          <span className="feedback-pill">
            {guideLevel === 'off'
              ? 'Tulis huruf dari ingatan Anda di atas kotak'
              : 'Ikuti titik merah dan arah panah untuk mulai menulis'}
          </span>
        )}
      </div>

      {/* Minimalist control bar */}
      <div className="control-bar">
        {session.isComplete ? (
          <>
            <button type="button" className="ctrl-btn" onClick={handleClear}>
              <RotateCcw size={15} strokeWidth={1.8} />
              Ulangi
            </button>
            <button
              type="button"
              className={`ctrl-btn ${isAnimating ? 'is-active' : ''}`}
              onClick={handleToggleAnimation}
            >
              {isAnimating ? (
                <Square size={14} strokeWidth={1.8} />
              ) : (
                <Play size={14} strokeWidth={1.8} />
              )}
              {isAnimating ? 'Hentikan' : 'Animasi'}
            </button>
            {hasNext && (
              <button type="button" className="ctrl-btn ctrl-btn-primary" onClick={onNext}>
                Huruf Berikutnya
                <ArrowRight size={15} strokeWidth={2} />
              </button>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              className={`ctrl-btn ${isAnimating ? 'is-active' : ''}`}
              onClick={handleToggleAnimation}
              title="Putar animasi urutan goresan (Spasi)"
            >
              {isAnimating ? (
                <Square size={14} strokeWidth={1.8} />
              ) : (
                <Play size={14} strokeWidth={1.8} />
              )}
              {isAnimating ? 'Hentikan' : 'Animasi'}
            </button>

            <button
              type="button"
              className="ctrl-btn"
              onClick={handleCycleGuide}
              title="Ubah tingkat panduan jiplak"
            >
              {guideLevel === 'off' ? (
                <EyeOff size={15} strokeWidth={1.8} />
              ) : (
                <Eye size={15} strokeWidth={1.8} />
              )}
              {getGuideLabel(guideLevel)}
            </button>

            <button
              type="button"
              className="ctrl-btn"
              onClick={handleUndo}
              disabled={session.acceptedCount === 0}
              title="Urungkan goresan terakhir (Ctrl+Z)"
            >
              <Undo2 size={15} strokeWidth={1.8} />
              Urungkan
            </button>

            <button
              type="button"
              className="ctrl-btn"
              onClick={handleClear}
              disabled={session.acceptedCount === 0 && !session.lastFeedback}
              title="Bersihkan kanvas (R)"
            >
              <Eraser size={15} strokeWidth={1.8} />
              Hapus
            </button>
          </>
        )}
      </div>

      <div className="shortcut-hint" aria-hidden="true">
        <span>
          <span className="kbd">Spasi</span>Animasi
        </span>
        <span>
          <span className="kbd">R</span>Ulangi
        </span>
        <span>
          <span className="kbd">←</span>
          <span className="kbd">→</span>Pindah huruf
        </span>
      </div>
    </section>
  );
}
