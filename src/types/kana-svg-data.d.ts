declare module 'kana-svg-data/dist/allHiragana.json' {
  export interface RawKanaStrokeEntry {
    id: string;
    value: string;
  }
  export interface RawKanaMedianEntry {
    id: string;
    value: Array<[number, number]>;
  }
  export interface RawKanaSvgItem {
    charCode: number;
    strokes: RawKanaStrokeEntry[];
    medians: RawKanaMedianEntry[];
    clipPaths: RawKanaStrokeEntry[];
  }
  const data: RawKanaSvgItem[];
  export default data;
}

declare module 'kana-svg-data/dist/allKatakana.json' {
  import type { RawKanaSvgItem } from 'kana-svg-data/dist/allHiragana.json';
  const data: RawKanaSvgItem[];
  export default data;
}
