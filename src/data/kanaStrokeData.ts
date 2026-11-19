import allHiragana from 'kana-svg-data/dist/allHiragana.json';
import allKatakana from 'kana-svg-data/dist/allKatakana.json';
import type { RawKanaSvgItem } from 'kana-svg-data/dist/allHiragana.json';
import { KANA_CATALOG } from './kanaCatalog';
import type { KanaCharacter, KanaScript, LogicalStroke, Point, StrokeRenderPiece } from '../types/kana';
import { distance, polylineLength } from '../engine/strokeEvaluator';

const rawByCode = new Map<number, RawKanaSvgItem>();
for (const item of allHiragana) {
  rawByCode.set(item.charCode, item);
}
for (const item of allKatakana) {
  rawByCode.set(item.charCode, item);
}

function parseLogicalStrokeNumber(id: string): number {
  const match = id.match(/^(\d+)/);
  if (!match) {
    throw new Error(`Invalid stroke id in kana-svg-data: "${id}"`);
  }
  return Number.parseInt(match[1], 10);
}

function normalizeStrokes(raw: RawKanaSvgItem): LogicalStroke[] {
  const groups = new Map<
    number,
    {
      median: Point[] | null;
      pieces: StrokeRenderPiece[];
    }
  >();

  for (let i = 0; i < raw.strokes.length; i++) {
    const strokeEntry = raw.strokes[i];
    const medianEntry = raw.medians[i];
    const clipEntry = raw.clipPaths[i];
    const strokeNum = parseLogicalStrokeNumber(strokeEntry.id);

    let group = groups.get(strokeNum);
    if (!group) {
      group = { median: null, pieces: [] };
      groups.set(strokeNum, group);
    }

    // AnimCJK stores the full in-bounds centerline in the first sub-segment ("Na")
    if (!group.median && medianEntry) {
      group.median = medianEntry.value.map(([x, y]) => ({ x, y }));
    }

    group.pieces.push({
      id: strokeEntry.id,
      outlinePath: strokeEntry.value,
      clipStrokePath: clipEntry.value,
    });
  }

  return Array.from(groups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([strokeNumber, group]) => {
      const median = group.median ?? [];
      const len = polylineLength(median);
      const startEndDist =
        median.length >= 2 ? distance(median[0], median[median.length - 1]) : Infinity;
      const isClosedLoop = median.length >= 5 && len > 160 && startEndDist < 55;

      return {
        strokeNumber,
        median,
        pieces: group.pieces,
        isClosedLoop,
      };
    });
}

export const KANA_CHARACTERS: KanaCharacter[] = KANA_CATALOG.map((meta) => {
  const charCode = meta.char.charCodeAt(0);
  const raw = rawByCode.get(charCode);
  if (!raw) {
    throw new Error(`Missing stroke vector data for character "${meta.char}" (U+${charCode.toString(16)})`);
  }
  const strokes = normalizeStrokes(raw);
  return {
    ...meta,
    charCode,
    strokes,
    strokeCount: strokes.length,
  };
});

export const KANA_BY_CHAR = new Map<string, KanaCharacter>(
  KANA_CHARACTERS.map((item) => [item.char, item]),
);

export function getKanaByChar(char: string): KanaCharacter | undefined {
  return KANA_BY_CHAR.get(char);
}

export function getKanaByScript(script: KanaScript): KanaCharacter[] {
  return KANA_CHARACTERS.filter((k) => k.script === script);
}
