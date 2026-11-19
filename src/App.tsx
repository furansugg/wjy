import { useCallback, useMemo, useState } from 'react';
import { Header } from './components/Header';
import { KanaChartPanel } from './components/KanaChartPanel';
import { PracticeWorkspace } from './components/PracticeWorkspace';
import { QuizWorkspace } from './components/QuizWorkspace';
import { KANA_CHARACTERS, getKanaByChar, getKanaByScript } from './data/kanaStrokeData';
import { useProgress } from './hooks/useProgress';
import { useTheme } from './hooks/useTheme';
import type { AppMode, KanaGroup, KanaScript } from './types/kana';

export function App() {
  const { theme, toggleTheme } = useTheme();
  const { progress, masteredCount, recordCompletion, resetProgress } = useProgress();

  const [mode, setMode] = useState<AppMode>('practice');
  const [script, setScript] = useState<KanaScript>('hiragana');
  const [group, setGroup] = useState<KanaGroup>('basic');
  const [selectedChar, setSelectedChar] = useState<string>('あ');
  const [mobileChartOpen, setMobileChartOpen] = useState(false);

  const scriptChars = useMemo(() => getKanaByScript(script), [script]);

  const currentCharacter = useMemo(() => {
    return getKanaByChar(selectedChar) ?? scriptChars[0] ?? KANA_CHARACTERS[0];
  }, [selectedChar, scriptChars]);

  const currentIndexInScript = useMemo(
    () => scriptChars.findIndex((c) => c.char === currentCharacter.char),
    [scriptChars, currentCharacter.char],
  );

  const handleScriptChange = useCallback(
    (nextScript: KanaScript) => {
      if (nextScript === script) return;
      setScript(nextScript);
      // Try to keep the exact same romaji counterpart (e.g., あ -> ア, が -> ガ)
      const nextList = getKanaByScript(nextScript);
      const counterpart = nextList.find(
        (item) => item.romaji === currentCharacter.romaji && item.group === currentCharacter.group,
      );
      const fallback = nextList.find((item) => item.group === group) ?? nextList[0];
      if (counterpart) {
        setSelectedChar(counterpart.char);
        setGroup(counterpart.group);
      } else if (fallback) {
        setSelectedChar(fallback.char);
        setGroup(fallback.group);
      }
    },
    [script, currentCharacter, group],
  );

  const handleSelectChar = useCallback((char: string) => {
    const found = getKanaByChar(char);
    if (!found) return;
    setScript(found.script);
    setGroup(found.group);
    setSelectedChar(found.char);
    setMode('practice');
  }, []);

  const handlePrev = useCallback(() => {
    if (currentIndexInScript <= 0) return;
    const prevChar = scriptChars[currentIndexInScript - 1];
    setSelectedChar(prevChar.char);
    setGroup(prevChar.group);
  }, [currentIndexInScript, scriptChars]);

  const handleNext = useCallback(() => {
    if (currentIndexInScript < 0 || currentIndexInScript >= scriptChars.length - 1) return;
    const nextChar = scriptChars[currentIndexInScript + 1];
    setSelectedChar(nextChar.char);
    setGroup(nextChar.group);
  }, [currentIndexInScript, scriptChars]);

  return (
    <div className="app-shell">
      <Header
        script={script}
        mode={mode}
        theme={theme}
        masteredCount={masteredCount}
        totalCount={KANA_CHARACTERS.length}
        onScriptChange={handleScriptChange}
        onModeChange={setMode}
        onToggleTheme={toggleTheme}
        onOpenMobileChart={() => setMobileChartOpen(true)}
      />

      <main className="app-main">
        {mode === 'practice' ? (
          <div className="practice-layout">
            <KanaChartPanel
              script={script}
              group={group}
              selectedChar={currentCharacter.char}
              progress={progress}
              isOpenMobile={mobileChartOpen}
              onGroupChange={setGroup}
              onSelectChar={handleSelectChar}
              onCloseMobile={() => setMobileChartOpen(false)}
              onResetProgress={resetProgress}
            />

            <PracticeWorkspace
              character={currentCharacter}
              characterProgress={progress[currentCharacter.char]}
              theme={theme}
              hasPrev={currentIndexInScript > 0}
              hasNext={currentIndexInScript >= 0 && currentIndexInScript < scriptChars.length - 1}
              onPrev={handlePrev}
              onNext={handleNext}
              onRecordCompletion={(char, score) => recordCompletion(char, score, false)}
            />
          </div>
        ) : (
          <QuizWorkspace
            theme={theme}
            progress={progress}
            onRecordCompletion={recordCompletion}
            onPracticeChar={handleSelectChar}
          />
        )}
      </main>

      <footer className="app-footer">
        <span>Kana・書 — Latihan Menulis Hiragana &amp; Katakana</span>
        <span className="footer-sep" aria-hidden="true">
          ·
        </span>
        <span>Data urutan goresan: AnimCJK (LGPL-3.0+)</span>
      </footer>
    </div>
  );
}
export default App;
