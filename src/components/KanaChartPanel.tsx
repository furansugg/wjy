import { useMemo, useState } from 'react';
import { RotateCcw, Search, X } from 'lucide-react';
import { KANA_GRID, VOWEL_HEADERS, getScriptLabel } from '../data/kanaCatalog';
import type { KanaGroup, KanaMeta, KanaScript, ProgressMap } from '../types/kana';

interface KanaChartPanelProps {
  script: KanaScript;
  group: KanaGroup;
  selectedChar: string;
  progress: ProgressMap;
  isOpenMobile: boolean;
  onGroupChange: (group: KanaGroup) => void;
  onSelectChar: (char: string) => void;
  onCloseMobile: () => void;
  onResetProgress: () => void;
}

export function KanaChartPanel({
  script,
  group,
  selectedChar,
  progress,
  isOpenMobile,
  onGroupChange,
  onSelectChar,
  onCloseMobile,
  onResetProgress,
}: KanaChartPanelProps) {
  const [query, setQuery] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const rows = KANA_GRID[script][group];
  const normalizedQuery = query.trim().toLowerCase();

  const groupMetaList = useMemo(() => {
    const items: KanaMeta[] = [];
    for (const row of rows) {
      for (const cell of row.cells) {
        if (cell) items.push(cell);
      }
    }
    return items;
  }, [rows]);

  const groupMasteredCount = useMemo(
    () => groupMetaList.filter((item) => progress[item.char]?.mastered).length,
    [groupMetaList, progress],
  );

  const filteredItems = useMemo(() => {
    if (!normalizedQuery) return null;
    const allScriptRows = [...KANA_GRID[script].basic, ...KANA_GRID[script].dakuten];
    const matched: KanaMeta[] = [];
    for (const row of allScriptRows) {
      for (const cell of row.cells) {
        if (!cell) continue;
        if (
          cell.romaji.toLowerCase().includes(normalizedQuery) ||
          cell.char.includes(normalizedQuery)
        ) {
          matched.push(cell);
        }
      }
    }
    return matched;
  }, [normalizedQuery, script]);

  const pct =
    groupMetaList.length > 0 ? Math.round((groupMasteredCount / groupMetaList.length) * 100) : 0;

  return (
    <>
      <div
        className={`drawer-backdrop ${isOpenMobile ? 'is-open' : ''}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />
      <aside
        className={`chart-panel ${isOpenMobile ? 'is-open' : ''}`}
        aria-label={`Tabel ${getScriptLabel(script)}`}
      >
        <div className="chart-panel-header">
          <span className="chart-title">Tabel {getScriptLabel(script)}</span>
          <button
            type="button"
            className="icon-btn chart-close-btn"
            onClick={onCloseMobile}
            aria-label="Tutup tabel huruf"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        <div className="chart-tabs" role="tablist" aria-label="Kelompok huruf">
          <button
            type="button"
            role="tab"
            aria-selected={group === 'basic'}
            className={`chart-tab ${group === 'basic' ? 'is-active' : ''}`}
            onClick={() => onGroupChange('basic')}
          >
            Dasar (46)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={group === 'dakuten'}
            className={`chart-tab ${group === 'dakuten' ? 'is-active' : ''}`}
            onClick={() => onGroupChange('dakuten')}
          >
            Dakuten (25)
          </button>
        </div>

        <div className="chart-search-wrap">
          <Search size={14} strokeWidth={1.8} className="chart-search-icon" />
          <input
            type="text"
            className="chart-search-input"
            placeholder="Cari romaji (mis. ka, shi, pa)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Cari huruf berdasarkan romaji"
          />
          {query && (
            <button
              type="button"
              className="chart-search-clear"
              onClick={() => setQuery('')}
              aria-label="Hapus pencarian"
            >
              <X size={13} strokeWidth={1.8} />
            </button>
          )}
        </div>

        <div className="chart-scroll">
          {filteredItems ? (
            filteredItems.length === 0 ? (
              <div className="chart-empty-state">Tidak ditemukan huruf untuk &ldquo;{query}&rdquo;.</div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '5px',
                }}
              >
                {filteredItems.map((cell) => {
                  const isMastered = Boolean(progress[cell.char]?.mastered);
                  const isSelected = cell.char === selectedChar;
                  return (
                    <button
                      key={cell.char}
                      type="button"
                      className={`kana-tile ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => {
                        onSelectChar(cell.char);
                        onCloseMobile();
                      }}
                      title={`${cell.char} (${cell.romaji})${isMastered ? ' — Dikuasai' : ''}`}
                    >
                      <span className="kana-tile-char">{cell.char}</span>
                      <span className="kana-tile-romaji">{cell.romaji.split(' ')[0]}</span>
                      {isMastered && <span className="kana-tile-mastered" aria-label="Dikuasai" />}
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <>
              <div className="chart-vowel-header" aria-hidden="true">
                <span />
                {VOWEL_HEADERS.map((v) => (
                  <span key={v}>{v}</span>
                ))}
              </div>
              {rows.map((row) => (
                <div key={row.rowKey} className="chart-row">
                  <span className="chart-row-label" aria-hidden="true">
                    {row.rowLabel}
                  </span>
                  {row.cells.map((cell, idx) => {
                    if (!cell) {
                      return <div key={`${row.rowKey}-empty-${idx}`} className="chart-cell-empty" />;
                    }
                    const isMastered = Boolean(progress[cell.char]?.mastered);
                    const isSelected = cell.char === selectedChar;
                    return (
                      <button
                        key={cell.char}
                        type="button"
                        className={`kana-tile ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => {
                          onSelectChar(cell.char);
                          onCloseMobile();
                        }}
                        aria-pressed={isSelected}
                        title={`${cell.char} (${cell.romaji})${isMastered ? ' — Dikuasai' : ''}`}
                      >
                        <span className="kana-tile-char">{cell.char}</span>
                        <span className="kana-tile-romaji">{cell.romaji.split(' ')[0]}</span>
                        {isMastered && (
                          <span className="kana-tile-mastered" aria-label="Dikuasai" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </>
          )}
        </div>

        <div className="chart-footer">
          <div className="chart-progress-row">
            <span>
              {group === 'basic' ? 'Dasar' : 'Dakuten'} {getScriptLabel(script)}
            </span>
            <strong>
              {groupMasteredCount} / {groupMetaList.length} ({pct}%)
            </strong>
          </div>
          <div className="progress-bar-track" aria-hidden="true">
            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
          </div>

          {!confirmReset ? (
            <button
              type="button"
              className="reset-link-btn"
              onClick={() => setConfirmReset(true)}
            >
              <RotateCcw size={11} strokeWidth={1.8} />
              Reset progres tersimpan
            </button>
          ) : (
            <div className="reset-confirm-row">
              <span>Hapus semua progres?</span>
              <div className="reset-confirm-actions">
                <button
                  type="button"
                  className="text-btn-danger"
                  onClick={() => {
                    onResetProgress();
                    setConfirmReset(false);
                  }}
                >
                  Ya, hapus
                </button>
                <button
                  type="button"
                  className="text-btn-muted"
                  onClick={() => setConfirmReset(false)}
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
