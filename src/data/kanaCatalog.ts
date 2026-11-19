import type { KanaGroup, KanaMeta, KanaScript, KanaSubgroup } from '../types/kana';

interface RowSpec {
  rowKey: string;
  rowLabel: string;
  subgroup: KanaSubgroup;
  cells: Array<[string, string, string?] | null>; // [char, romaji, optional quizPrompt]
}

const HIRAGANA_BASIC_ROWS: RowSpec[] = [
  { rowKey: 'a', rowLabel: 'a', subgroup: 'gojuon', cells: [['あ', 'a'], ['い', 'i'], ['う', 'u'], ['え', 'e'], ['お', 'o']] },
  { rowKey: 'k', rowLabel: 'k', subgroup: 'gojuon', cells: [['か', 'ka'], ['き', 'ki'], ['く', 'ku'], ['け', 'ke'], ['こ', 'ko']] },
  { rowKey: 's', rowLabel: 's', subgroup: 'gojuon', cells: [['さ', 'sa'], ['し', 'shi'], ['す', 'su'], ['せ', 'se'], ['そ', 'so']] },
  { rowKey: 't', rowLabel: 't', subgroup: 'gojuon', cells: [['た', 'ta'], ['ち', 'chi'], ['つ', 'tsu'], ['て', 'te'], ['と', 'to']] },
  { rowKey: 'n', rowLabel: 'n', subgroup: 'gojuon', cells: [['な', 'na'], ['に', 'ni'], ['ぬ', 'nu'], ['ね', 'ne'], ['の', 'no']] },
  { rowKey: 'h', rowLabel: 'h', subgroup: 'gojuon', cells: [['は', 'ha'], ['ひ', 'hi'], ['ふ', 'fu'], ['へ', 'he'], ['ほ', 'ho']] },
  { rowKey: 'm', rowLabel: 'm', subgroup: 'gojuon', cells: [['ま', 'ma'], ['み', 'mi'], ['む', 'mu'], ['め', 'me'], ['も', 'mo']] },
  { rowKey: 'y', rowLabel: 'y', subgroup: 'gojuon', cells: [['や', 'ya'], null, ['ゆ', 'yu'], null, ['よ', 'yo']] },
  { rowKey: 'r', rowLabel: 'r', subgroup: 'gojuon', cells: [['ら', 'ra'], ['り', 'ri'], ['る', 'ru'], ['れ', 're'], ['ろ', 'ro']] },
  { rowKey: 'w', rowLabel: 'w', subgroup: 'gojuon', cells: [['わ', 'wa'], null, null, null, ['を', 'wo', 'wo (o)']] },
  { rowKey: 'nn', rowLabel: 'n', subgroup: 'gojuon', cells: [['ん', 'n'], null, null, null, null] },
];

const HIRAGANA_DAKUTEN_ROWS: RowSpec[] = [
  { rowKey: 'g', rowLabel: 'g', subgroup: 'dakuten', cells: [['が', 'ga'], ['ぎ', 'gi'], ['ぐ', 'gu'], ['げ', 'ge'], ['ご', 'go']] },
  { rowKey: 'z', rowLabel: 'z', subgroup: 'dakuten', cells: [['ざ', 'za'], ['じ', 'ji'], ['ず', 'zu'], ['ぜ', 'ze'], ['ぞ', 'zo']] },
  { rowKey: 'd', rowLabel: 'd', subgroup: 'dakuten', cells: [['だ', 'da'], ['ぢ', 'ji (di)', 'ji (di)'], ['づ', 'zu (du)', 'zu (du)'], ['で', 'de'], ['ど', 'do']] },
  { rowKey: 'b', rowLabel: 'b', subgroup: 'dakuten', cells: [['ば', 'ba'], ['び', 'bi'], ['ぶ', 'bu'], ['べ', 'be'], ['ぼ', 'bo']] },
  { rowKey: 'p', rowLabel: 'p', subgroup: 'handakuten', cells: [['ぱ', 'pa'], ['ぴ', 'pi'], ['ぷ', 'pu'], ['ぺ', 'pe'], ['ぽ', 'po']] },
];

const KATAKANA_BASIC_ROWS: RowSpec[] = [
  { rowKey: 'a', rowLabel: 'a', subgroup: 'gojuon', cells: [['ア', 'a'], ['イ', 'i'], ['ウ', 'u'], ['エ', 'e'], ['オ', 'o']] },
  { rowKey: 'k', rowLabel: 'k', subgroup: 'gojuon', cells: [['カ', 'ka'], ['キ', 'ki'], ['ク', 'ku'], ['ケ', 'ke'], ['コ', 'ko']] },
  { rowKey: 's', rowLabel: 's', subgroup: 'gojuon', cells: [['サ', 'sa'], ['シ', 'shi'], ['ス', 'su'], ['セ', 'se'], ['ソ', 'so']] },
  { rowKey: 't', rowLabel: 't', subgroup: 'gojuon', cells: [['タ', 'ta'], ['チ', 'chi'], ['ツ', 'tsu'], ['テ', 'te'], ['ト', 'to']] },
  { rowKey: 'n', rowLabel: 'n', subgroup: 'gojuon', cells: [['ナ', 'na'], ['ニ', 'ni'], ['ヌ', 'nu'], ['ネ', 'ne'], ['ノ', 'no']] },
  { rowKey: 'h', rowLabel: 'h', subgroup: 'gojuon', cells: [['ハ', 'ha'], ['ヒ', 'hi'], ['フ', 'fu'], ['ヘ', 'he'], ['ホ', 'ho']] },
  { rowKey: 'm', rowLabel: 'm', subgroup: 'gojuon', cells: [['マ', 'ma'], ['ミ', 'mi'], ['ム', 'mu'], ['メ', 'me'], ['モ', 'mo']] },
  { rowKey: 'y', rowLabel: 'y', subgroup: 'gojuon', cells: [['ヤ', 'ya'], null, ['ユ', 'yu'], null, ['ヨ', 'yo']] },
  { rowKey: 'r', rowLabel: 'r', subgroup: 'gojuon', cells: [['ラ', 'ra'], ['リ', 'ri'], ['ル', 'ru'], ['レ', 're'], ['ロ', 'ro']] },
  { rowKey: 'w', rowLabel: 'w', subgroup: 'gojuon', cells: [['ワ', 'wa'], null, null, null, ['ヲ', 'wo', 'wo (o)']] },
  { rowKey: 'nn', rowLabel: 'n', subgroup: 'gojuon', cells: [['ン', 'n'], null, null, null, null] },
];

const KATAKANA_DAKUTEN_ROWS: RowSpec[] = [
  { rowKey: 'g', rowLabel: 'g', subgroup: 'dakuten', cells: [['ガ', 'ga'], ['ギ', 'gi'], ['グ', 'gu'], ['ゲ', 'ge'], ['ゴ', 'go']] },
  { rowKey: 'z', rowLabel: 'z', subgroup: 'dakuten', cells: [['ザ', 'za'], ['ジ', 'ji'], ['ズ', 'zu'], ['ゼ', 'ze'], ['ゾ', 'zo']] },
  { rowKey: 'd', rowLabel: 'd', subgroup: 'dakuten', cells: [['ダ', 'da'], ['ヂ', 'ji (di)', 'ji (di)'], ['ヅ', 'zu (du)', 'zu (du)'], ['デ', 'de'], ['ド', 'do']] },
  { rowKey: 'b', rowLabel: 'b', subgroup: 'dakuten', cells: [['バ', 'ba'], ['ビ', 'bi'], ['ブ', 'bu'], ['ベ', 'be'], ['ボ', 'bo']] },
  { rowKey: 'p', rowLabel: 'p', subgroup: 'handakuten', cells: [['パ', 'pa'], ['ピ', 'pi'], ['プ', 'pu'], ['ペ', 'pe'], ['ポ', 'po']] },
];

function flattenRows(rows: RowSpec[], script: KanaScript, group: KanaGroup): KanaMeta[] {
  const result: KanaMeta[] = [];
  for (const row of rows) {
    row.cells.forEach((cell, colIndex) => {
      if (!cell) return;
      const [char, romaji, quizPrompt] = cell;
      result.push({
        char,
        romaji,
        quizPrompt: quizPrompt ?? romaji,
        script,
        group,
        subgroup: row.subgroup,
        rowKey: row.rowKey,
        rowLabel: row.rowLabel,
        colIndex,
      });
    });
  }
  return result;
}

export interface KanaGridRow {
  rowKey: string;
  rowLabel: string;
  subgroup: KanaSubgroup;
  cells: Array<KanaMeta | null>;
}

function buildGridRows(rows: RowSpec[], script: KanaScript, group: KanaGroup): KanaGridRow[] {
  return rows.map((row) => ({
    rowKey: row.rowKey,
    rowLabel: row.rowLabel,
    subgroup: row.subgroup,
    cells: row.cells.map((cell, colIndex) => {
      if (!cell) return null;
      const [char, romaji, quizPrompt] = cell;
      return {
        char,
        romaji,
        quizPrompt: quizPrompt ?? romaji,
        script,
        group,
        subgroup: row.subgroup,
        rowKey: row.rowKey,
        rowLabel: row.rowLabel,
        colIndex,
      };
    }),
  }));
}

export const KANA_GRID: Record<KanaScript, Record<KanaGroup, KanaGridRow[]>> = {
  hiragana: {
    basic: buildGridRows(HIRAGANA_BASIC_ROWS, 'hiragana', 'basic'),
    dakuten: buildGridRows(HIRAGANA_DAKUTEN_ROWS, 'hiragana', 'dakuten'),
  },
  katakana: {
    basic: buildGridRows(KATAKANA_BASIC_ROWS, 'katakana', 'basic'),
    dakuten: buildGridRows(KATAKANA_DAKUTEN_ROWS, 'katakana', 'dakuten'),
  },
};

export const KANA_CATALOG: KanaMeta[] = [
  ...flattenRows(HIRAGANA_BASIC_ROWS, 'hiragana', 'basic'),
  ...flattenRows(HIRAGANA_DAKUTEN_ROWS, 'hiragana', 'dakuten'),
  ...flattenRows(KATAKANA_BASIC_ROWS, 'katakana', 'basic'),
  ...flattenRows(KATAKANA_DAKUTEN_ROWS, 'katakana', 'dakuten'),
];

export const VOWEL_HEADERS = ['a', 'i', 'u', 'e', 'o'] as const;

export function getSubgroupLabel(subgroup: KanaSubgroup): string {
  switch (subgroup) {
    case 'gojuon':
      return 'Dasar (Gojūon)';
    case 'dakuten':
      return 'Dakuten (゛)';
    case 'handakuten':
      return 'Handakuten (゜)';
  }
}

export function getScriptLabel(script: KanaScript): string {
  return script === 'hiragana' ? 'Hiragana' : 'Katakana';
}
