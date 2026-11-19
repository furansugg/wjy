import { Grid2x2, Moon, Sun } from 'lucide-react';
import type { AppMode, KanaScript, ThemeMode } from '../types/kana';

interface HeaderProps {
  script: KanaScript;
  mode: AppMode;
  theme: ThemeMode;
  masteredCount: number;
  totalCount: number;
  onScriptChange: (script: KanaScript) => void;
  onModeChange: (mode: AppMode) => void;
  onToggleTheme: () => void;
  onOpenMobileChart: () => void;
}

export function Header({
  script,
  mode,
  theme,
  masteredCount,
  totalCount,
  onScriptChange,
  onModeChange,
  onToggleTheme,
  onOpenMobileChart,
}: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-left">
        <div className="brand" aria-label="Kana Sho">
          <span className="brand-seal" aria-hidden="true">
            書
          </span>
          <span className="brand-name">Kana</span>
        </div>

        {mode === 'practice' && (
          <div className="segmented" role="tablist" aria-label="Pilih aksara">
            <button
              type="button"
              role="tab"
              aria-selected={script === 'hiragana'}
              className={`segmented-btn ${script === 'hiragana' ? 'is-active' : ''}`}
              onClick={() => onScriptChange('hiragana')}
            >
              Hiragana <span className="segmented-kana">あ</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={script === 'katakana'}
              className={`segmented-btn ${script === 'katakana' ? 'is-active' : ''}`}
              onClick={() => onScriptChange('katakana')}
            >
              Katakana <span className="segmented-kana">ア</span>
            </button>
          </div>
        )}
      </div>

      <div className="header-center">
        <div className="segmented" role="tablist" aria-label="Pilih mode belajar">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'practice'}
            className={`segmented-btn ${mode === 'practice' ? 'is-active' : ''}`}
            onClick={() => onModeChange('practice')}
          >
            Latihan
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'quiz'}
            className={`segmented-btn ${mode === 'quiz' ? 'is-active' : ''}`}
            onClick={() => onModeChange('quiz')}
          >
            Kuis Hafalan
          </button>
        </div>
      </div>

      <div className="header-right">
        <div className="progress-pill" title="Total huruf yang sudah dikuasai">
          <span className="progress-dot" aria-hidden="true" />
          <span>
            {masteredCount} / {totalCount} dikuasai
          </span>
        </div>

        {mode === 'practice' && (
          <button
            type="button"
            className="icon-btn mobile-chart-btn"
            onClick={onOpenMobileChart}
            aria-label="Buka tabel huruf"
            title="Tabel Huruf"
          >
            <Grid2x2 size={17} strokeWidth={1.7} />
          </button>
        )}

        <button
          type="button"
          className="icon-btn"
          onClick={onToggleTheme}
          aria-label={theme === 'washi' ? 'Aktifkan mode gelap Sumi' : 'Aktifkan mode terang Washi'}
          title={theme === 'washi' ? 'Mode Gelap (Sumi)' : 'Mode Terang (Washi)'}
        >
          {theme === 'washi' ? (
            <Moon size={17} strokeWidth={1.7} />
          ) : (
            <Sun size={17} strokeWidth={1.7} />
          )}
        </button>
      </div>
    </header>
  );
}
