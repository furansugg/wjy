import { describe, expect, test } from 'bun:test';
import { KANA_CHARACTERS, getKanaByChar, getKanaByScript } from './kanaStrokeData';

describe('kanaStrokeData (142 karakter Hiragana & Katakana)', () => {
  test('memuat tepat 142 karakter (71 Hiragana + 71 Katakana)', () => {
    expect(KANA_CHARACTERS.length).toBe(142);

    const hiragana = getKanaByScript('hiragana');
    const katakana = getKanaByScript('katakana');
    expect(hiragana.length).toBe(71);
    expect(katakana.length).toBe(71);

    expect(hiragana.filter((k) => k.group === 'basic').length).toBe(46);
    expect(hiragana.filter((k) => k.group === 'dakuten').length).toBe(25);
    expect(katakana.filter((k) => k.group === 'basic').length).toBe(46);
    expect(katakana.filter((k) => k.group === 'dakuten').length).toBe(25);

    const uniqueChars = new Set(KANA_CHARACTERS.map((k) => k.char));
    expect(uniqueChars.size).toBe(142);
  });

  test('setiap karakter memiliki nomor goresan berurutan, median dalam kanvas, dan potongan SVG valid', () => {
    for (const kana of KANA_CHARACTERS) {
      expect(kana.strokeCount).toBeGreaterThanOrEqual(1);
      expect(kana.strokes.length).toBe(kana.strokeCount);

      kana.strokes.forEach((stroke, idx) => {
        expect(stroke.strokeNumber).toBe(idx + 1);
        expect(stroke.median.length).toBeGreaterThanOrEqual(2);
        expect(stroke.pieces.length).toBeGreaterThanOrEqual(1);

        for (const piece of stroke.pieces) {
          expect(piece.outlinePath.length).toBeGreaterThan(5);
          expect(piece.clipStrokePath.length).toBeGreaterThan(5);
        }

        for (const pt of stroke.median) {
          expect(pt.x).toBeGreaterThanOrEqual(-50);
          expect(pt.x).toBeLessThanOrEqual(1074);
          expect(pt.y).toBeGreaterThanOrEqual(-50);
          expect(pt.y).toBeLessThanOrEqual(1074);
        }
      });
    }
  });

  test('jumlah goresan logis karakter kunci sesuai standar penulisan Jepang', () => {
    const expectedCounts: Record<string, number> = {
      あ: 3,
      い: 2,
      お: 3,
      き: 4,
      さ: 3,
      の: 1,
      ぬ: 2,
      が: 5,
      ぱ: 4,
      ん: 1,
      ア: 2,
      カ: 2,
      シ: 3,
      ツ: 3,
      ガ: 4,
      パ: 3,
      ン: 2,
    };

    for (const [char, count] of Object.entries(expectedCounts)) {
      const found = getKanaByChar(char);
      expect(found).toBeDefined();
      expect(found?.strokeCount).toBe(count);
    }
  });

  test('hanya lingkaran handakuten (゜) pada 10 huruf p yang terdeteksi sebagai closed loop', () => {
    const closedLoopChars: string[] = [];
    for (const kana of KANA_CHARACTERS) {
      for (const stroke of kana.strokes) {
        if (stroke.isClosedLoop) {
          closedLoopChars.push(`${kana.char}#${stroke.strokeNumber}`);
        }
      }
    }

    expect(closedLoopChars.length).toBe(10);
    for (const ch of ['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ', 'パ', 'ピ', 'プ', 'ペ', 'ポ']) {
      const k = getKanaByChar(ch)!;
      expect(k.strokes[k.strokes.length - 1].isClosedLoop).toBe(true);
    }
  });
});
