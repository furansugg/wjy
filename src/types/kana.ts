export type KanaScript = 'hiragana' | 'katakana';

export type KanaGroup = 'basic' | 'dakuten';

export type KanaSubgroup = 'gojuon' | 'dakuten' | 'handakuten';

export type AppMode = 'practice' | 'quiz';

export type GuideLevel = 'full' | 'faint' | 'off';

export type ThemeMode = 'washi' | 'sumi';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
  time?: number;
}

export interface StrokeRenderPiece {
  id: string;
  outlinePath: string;
  clipStrokePath: string;
}

export interface LogicalStroke {
  strokeNumber: number;
  median: Point[];
  pieces: StrokeRenderPiece[];
  isClosedLoop: boolean;
}

export interface KanaMeta {
  char: string;
  romaji: string;
  quizPrompt: string;
  script: KanaScript;
  group: KanaGroup;
  subgroup: KanaSubgroup;
  rowKey: string;
  rowLabel: string;
  colIndex: number; // 0..4 corresponding to a, i, u, e, o
}

export interface KanaCharacter extends KanaMeta {
  charCode: number;
  strokes: LogicalStroke[];
  strokeCount: number;
}

export type StrokeFailReason =
  | 'ok'
  | 'too_short'
  | 'too_long'
  | 'wrong_direction'
  | 'wrong_start'
  | 'wrong_shape';

export interface StrokeEvaluationResult {
  passed: boolean;
  score: number;
  reason: StrokeFailReason;
  feedback: string;
}

export interface CharacterProgress {
  completions: number;
  bestScore: number;
  mastered: boolean;
  lastPracticedAt: number;
}

export type ProgressMap = Record<string, CharacterProgress>;

export type QuizScriptFilter = 'hiragana' | 'katakana' | 'both';

export type QuizGroupFilter = 'basic' | 'dakuten' | 'all' | 'unmastered';

export interface QuizConfig {
  script: QuizScriptFilter;
  group: QuizGroupFilter;
  length: 5 | 10 | 20;
}

export interface QuizItemResult {
  char: string;
  romaji: string;
  quizPrompt: string;
  script: KanaScript;
  passed: boolean;
  usedHint: boolean;
  avgScore: number;
  mistakes: number;
}
