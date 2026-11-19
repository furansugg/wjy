import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Eraser,
  Lightbulb,
  Play,
  RotateCcw,
  SkipForward,
  Sparkles,
} from 'lucide-react';
import { getScriptLabel, getSubgroupLabel } from '../data/kanaCatalog';
import { KANA_CHARACTERS } from '../data/kanaStrokeData';
import type {
  KanaCharacter,
  ProgressMap,
  QuizConfig,
  QuizItemResult,
  ThemeMode,
} from '../types/kana';
import { WritingCanvas } from './WritingCanvas';
import type { CanvasSessionState } from './WritingCanvas';

interface QuizWorkspaceProps {
  theme: ThemeMode;
  progress: ProgressMap;
  onRecordCompletion: (char: string, avgScore: number, usedHint: boolean) => void;
  onPracticeChar: (char: string) => void;
}

type QuizPhase = 'setup' | 'active' | 'summary';

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function QuizWorkspace({
  theme,
  progress,
  onRecordCompletion,
  onPracticeChar,
}: QuizWorkspaceProps) {
  const [phase, setPhase] = useState<QuizPhase>('setup');
  const [config, setConfig] = useState<QuizConfig>({
    script: 'hiragana',
    group: 'basic',
    length: 10,
  });

  const [queue, setQueue] = useState<KanaCharacter[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<QuizItemResult[]>([]);
  const [usedHintCurrent, setUsedHintCurrent] = useState(false);
  const [hintStrokeIndex, setHintStrokeIndex] = useState<number | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const [itemDone, setItemDone] = useState(false);
  const [session, setSession] = useState<CanvasSessionState>({
    acceptedCount: 0,
    isComplete: false,
    avgScore: null,
    lastFeedback: null,
    mistakes: 0,
  });

  const hintTimerRef = useRef<number | null>(null);

  const pool = useMemo(() => {
    return KANA_CHARACTERS.filter((k) => {
      if (config.script !== 'both' && k.script !== config.script) return false;
      if (config.group === 'basic' && k.group !== 'basic') return false;
      if (config.group === 'dakuten' && k.group !== 'dakuten') return false;
      if (config.group === 'unmastered' && progress[k.char]?.mastered) return false;
      return true;
    });
  }, [config.script, config.group, progress]);

  useEffect(() => {
    return () => {
      if (hintTimerRef.current !== null) {
        window.clearTimeout(hintTimerRef.current);
      }
    };
  }, []);

  const clearHintTimer = useCallback(() => {
    if (hintTimerRef.current !== null) {
      window.clearTimeout(hintTimerRef.current);
      hintTimerRef.current = null;
    }
    setHintStrokeIndex(null);
  }, []);

  const startQuizWithChars = useCallback(
    (chars: KanaCharacter[]) => {
      if (chars.length === 0) return;
      clearHintTimer();
      setQueue(chars);
      setCurrentIndex(0);
      setResults([]);
      setUsedHintCurrent(false);
      setItemDone(false);
      setResetToken((t) => t + 1);
      setPhase('active');
    },
    [clearHintTimer],
  );

  const handleStartQuiz = () => {
    const selected = shuffle(pool).slice(0, Math.min(config.length, pool.length));
    startQuizWithChars(selected);
  };

  const currentChar = queue[currentIndex] ?? null;

  const handlePeekHint = () => {
    if (!currentChar || itemDone) return;
    setUsedHintCurrent(true);
    setHintStrokeIndex(session.acceptedCount);
    if (hintTimerRef.current !== null) {
      window.clearTimeout(hintTimerRef.current);
    }
    hintTimerRef.current = window.setTimeout(() => {
      setHintStrokeIndex(null);
      hintTimerRef.current = null;
    }, 2200);
  };

  const advanceNext = useCallback(() => {
    clearHintTimer();
    if (currentIndex + 1 >= queue.length) {
      setPhase('summary');
    } else {
      setCurrentIndex((i) => i + 1);
      setUsedHintCurrent(false);
      setItemDone(false);
      setResetToken((t) => t + 1);
    }
  }, [clearHintTimer, currentIndex, queue.length]);

  const handleItemComplete = useCallback(
    ({ avgScore, mistakes }: { avgScore: number; mistakes: number }) => {
      if (!currentChar) return;
      clearHintTimer();
      setItemDone(true);
      onRecordCompletion(currentChar.char, avgScore, usedHintCurrent);
      setResults((prev) => [
        ...prev,
        {
          char: currentChar.char,
          romaji: currentChar.romaji,
          quizPrompt: currentChar.quizPrompt,
          script: currentChar.script,
          passed: !usedHintCurrent,
          usedHint: usedHintCurrent,
          avgScore,
          mistakes,
        },
      ]);
    },
    [clearHintTimer, currentChar, onRecordCompletion, usedHintCurrent],
  );

  const handleSkip = () => {
    if (!currentChar || itemDone) return;
    clearHintTimer();
    setResults((prev) => [
      ...prev,
      {
        char: currentChar.char,
        romaji: currentChar.romaji,
        quizPrompt: currentChar.quizPrompt,
        script: currentChar.script,
        passed: false,
        usedHint: true,
        avgScore: 0,
        mistakes: session.mistakes + 1,
      },
    ]);
    advanceNext();
  };

  if (phase === 'setup') {
    const effectiveCount = Math.min(config.length, pool.length);

    return (
      <section className="quiz-container" aria-label="Pengaturan kuis hafalan">
        <div className="quiz-card">
          <div>
            <h1 className="quiz-card-title">Kuis Hafalan Menulis</h1>
            <p className="quiz-card-subtitle">
              Tulis huruf Jepang langsung dari ingatan tanpa panduan jiplak. Posisi tulisan yang
              sedikit bergeser tetap dinilai adil.
            </p>
          </div>

          <div className="quiz-option-group">
            <span className="quiz-option-label">Aksara</span>
            <div className="quiz-pills">
              {(
                [
                  ['hiragana', 'Hiragana'],
                  ['katakana', 'Katakana'],
                  ['both', 'Campuran'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  className={`quiz-pill ${config.script === val ? 'is-selected' : ''}`}
                  onClick={() => setConfig((c) => ({ ...c, script: val }))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="quiz-option-group">
            <span className="quiz-option-label">Kelompok Huruf</span>
            <div className="quiz-pills">
              {(
                [
                  ['basic', 'Dasar (Gojūon)'],
                  ['dakuten', 'Dakuten & Handakuten'],
                  ['all', 'Semua Huruf'],
                  ['unmastered', 'Belum Dikuasai'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  className={`quiz-pill ${config.group === val ? 'is-selected' : ''}`}
                  onClick={() => setConfig((c) => ({ ...c, group: val }))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="quiz-option-group">
            <span className="quiz-option-label">Jumlah Soal</span>
            <div className="quiz-pills">
              {([5, 10, 20] as const).map((len) => (
                <button
                  key={len}
                  type="button"
                  className={`quiz-pill ${config.length === len ? 'is-selected' : ''}`}
                  onClick={() => setConfig((c) => ({ ...c, length: len }))}
                >
                  {len} huruf
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="quiz-start-btn"
            disabled={pool.length === 0}
            onClick={handleStartQuiz}
          >
            <Play size={16} strokeWidth={2} />
            {pool.length === 0
              ? 'Semua huruf di kategori ini sudah dikuasai!'
              : `Mulai Kuis (${effectiveCount} huruf)`}
          </button>

          <p className="quiz-pool-note">
            Tersedia {pool.length} huruf pada filter ini.
          </p>
        </div>
      </section>
    );
  }

  if (phase === 'active' && currentChar) {
    const progressPct = Math.round(((currentIndex + (itemDone ? 1 : 0)) / queue.length) * 100);

    return (
      <section className="quiz-container" aria-label="Sesi kuis hafalan">
        <div className="quiz-active-top">
          <div className="quiz-progress-meta">
            <span>
              Soal {currentIndex + 1} dari {queue.length}
            </span>
            <button
              type="button"
              className="text-btn-muted"
              onClick={() => {
                clearHintTimer();
                setPhase('setup');
              }}
            >
              Keluar kuis
            </button>
          </div>
          <div className="progress-bar-track" aria-hidden="true">
            <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
          </div>

          <div className="quiz-prompt-box">
            <div className="quiz-prompt-romaji">{currentChar.quizPrompt}</div>
            <div className="quiz-prompt-tags">
              <span className="meta-badge meta-badge-hanko">
                {getScriptLabel(currentChar.script)}
              </span>
              <span className="stroke-counter-text">
                {getSubgroupLabel(currentChar.subgroup)} · {currentChar.strokeCount} goresan
              </span>
            </div>
          </div>
        </div>

        <WritingCanvas
          character={currentChar}
          mode="quiz"
          theme={theme}
          guideLevel="off"
          isAnimating={false}
          hintStrokeIndex={hintStrokeIndex}
          resetToken={resetToken}
          undoToken={0}
          onAnimationEnd={() => {}}
          onStateChange={setSession}
          onComplete={handleItemComplete}
        />

        <div className="feedback-slot" aria-live="polite">
          {itemDone ? (
            <span className="feedback-pill is-complete">
              {usedHintCurrent
                ? `Selesai (dengan bantuan) — huruf ${currentChar.char}`
                : `Benar! Huruf ${currentChar.char} — akurasi ${session.avgScore ?? 100}%`}
            </span>
          ) : session.lastFeedback ? (
            <span
              className={`feedback-pill ${session.lastFeedback.passed ? 'is-ok' : 'is-warn'}`}
            >
              {session.lastFeedback.feedback}
              {session.lastFeedback.passed
                ? ` (${session.acceptedCount}/${currentChar.strokeCount})`
                : ''}
            </span>
          ) : (
            <span className="feedback-pill">
              Tulis {getScriptLabel(currentChar.script)} untuk &ldquo;{currentChar.quizPrompt}
              &rdquo; ({currentChar.strokeCount} goresan)
            </span>
          )}
        </div>

        <div className="control-bar">
          {itemDone ? (
            <button type="button" className="ctrl-btn ctrl-btn-primary" onClick={advanceNext}>
              {currentIndex + 1 >= queue.length ? 'Lihat Ringkasan' : 'Soal Berikutnya'}
              <ArrowRight size={15} strokeWidth={2} />
            </button>
          ) : (
            <>
              <button
                type="button"
                className={`ctrl-btn ${hintStrokeIndex !== null ? 'is-active' : ''}`}
                onClick={handlePeekHint}
                title="Tampilkan posisi goresan saat ini sejenak"
              >
                <Lightbulb size={15} strokeWidth={1.8} />
                Intip Goresan
              </button>

              <button
                type="button"
                className="ctrl-btn"
                onClick={() => setResetToken((t) => t + 1)}
                disabled={session.acceptedCount === 0 && !session.lastFeedback}
              >
                <Eraser size={15} strokeWidth={1.8} />
                Hapus
              </button>

              <button type="button" className="ctrl-btn" onClick={handleSkip}>
                <SkipForward size={15} strokeWidth={1.8} />
                Lewati
              </button>
            </>
          )}
        </div>
      </section>
    );
  }

  // Summary Phase
  const cleanPassCount = results.filter((r) => r.passed).length;
  const completedWithScore = results.filter((r) => r.avgScore > 0);
  const overallAvg =
    completedWithScore.length > 0
      ? Math.round(
          completedWithScore.reduce((sum, r) => sum + r.avgScore, 0) / completedWithScore.length,
        )
      : 0;
  const reviewItems = results.filter((r) => !r.passed);

  return (
    <section className="quiz-container" aria-label="Ringkasan hasil kuis">
      <div className="quiz-card">
        <div>
          <h1 className="quiz-card-title">Ringkasan Kuis</h1>
          <p className="quiz-card-subtitle">
            {cleanPassCount === results.length
              ? 'Luar biasa! Semua huruf berhasil ditulis tepat tanpa bantuan.'
              : 'Klik huruf mana saja di bawah ini untuk langsung berlatih ulang di Mode Latihan.'}
          </p>
        </div>

        <div className="quiz-summary-score">
          <div className="summary-big-num">
            {cleanPassCount} / {results.length}
          </div>
          <div className="summary-stats">
            <div>
              Tanpa bantuan: <strong>{cleanPassCount}</strong>
            </div>
            <div>
              Rata-rata akurasi: <strong>{overallAvg}%</strong>
            </div>
          </div>
        </div>

        <div className="summary-list">
          {results.map((item, idx) => (
            <button
              key={`${item.char}-${idx}`}
              type="button"
              className={`summary-chip ${item.passed ? '' : 'is-missed'}`}
              onClick={() => onPracticeChar(item.char)}
              title={`Latih ulang huruf ${item.char} (${item.romaji})`}
            >
              <span className="summary-chip-char">{item.char}</span>
              <span className="summary-chip-info">
                <strong>{item.romaji.split(' ')[0]}</strong>
                <span>
                  {item.avgScore === 0
                    ? 'Dilewati'
                    : item.usedHint
                      ? `${item.avgScore}% · hint`
                      : `${item.avgScore}%`}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="summary-actions">
          {reviewItems.length > 0 && (
            <button
              type="button"
              className="ctrl-btn ctrl-btn-primary"
              onClick={() => {
                const charsToRetry = reviewItems
                  .map((r) => KANA_CHARACTERS.find((k) => k.char === r.char))
                  .filter((k): k is KanaCharacter => Boolean(k));
                startQuizWithChars(shuffle(charsToRetry));
              }}
            >
              <Sparkles size={15} strokeWidth={1.8} />
              Ulangi {reviewItems.length} Huruf yang Perlu Dilatih
            </button>
          )}
          <button type="button" className="ctrl-btn" onClick={() => setPhase('setup')}>
            <RotateCcw size={15} strokeWidth={1.8} />
            Kuis Baru
          </button>
        </div>
      </div>
    </section>
  );
}
