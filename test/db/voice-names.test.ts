import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import pg from 'pg';
import { query, seed } from './seed';
import { testUrl } from './urls';

/**
 * 歌声の英語の名前を入れる（scripts/lib/voice-names.ts）。VocaDB には聞かず、返事を差し替える。
 * 聞くのは、キャラごとにまとめた元の歌声のうち、日本語の名前で、まだ英語の名前の無いものだけ
 */

const asked: number[] = [];
vi.mock('../../scripts/lib/vocadb', () => ({
  voicebankEnglishName: async (id: number) => {
    asked.push(id);
    return { 1: 'Hatsune Miku', 3: 'Kasane Teto (Unknown)' }[id] ?? `名前${id}`;
  },
}));

const { fillEnglishVoiceNames } = await import('../../scripts/lib/voice-names');

const pool = new pg.Pool({ connectionString: testUrl });
afterAll(() => pool.end());

beforeAll(() =>
  seed({
    vocalists: [
      { id: 1, name: '初音ミク' },
      // 元の歌声（1）にまとめる版。画面には元の名前を出すので聞かない
      { id: 2, name: '初音ミク V4X', baseId: 1 },
      { id: 3, name: '重音テト (Unknown)' },
      // 英字の名前は、英語の画面でもそのまま出せば足りるので聞かない
      { id: 4, name: 'GUMI' },
      { id: 5, name: '歌手不明' },
    ],
    songs: [],
  }),
);

const names = async () =>
  Object.fromEntries(
    (
      await query<{ id: number; name_en: string | null }>(
        'select id, name_en from vocalist order by id',
      )
    ).map((r) => [r.id, r.name_en]),
  );

describe('fillEnglishVoiceNames', () => {
  it('日本語の名前の元の歌声だけを聞き、「 (Unknown)」を外して入れる', async () => {
    expect(await fillEnglishVoiceNames(pool)).toBe(3);
    expect(asked).toEqual([1, 3, 5]);
    expect(await names()).toEqual({
      1: 'Hatsune Miku',
      2: null,
      3: 'Kasane Teto',
      4: null,
      // 英語の名前の無い歌声は、VocaDB が返す日本語の名前をそのまま入れ、次から聞き直さない
      5: '名前5',
    });
  });

  it('2回目は、もう入っている歌声を聞き直さない', async () => {
    asked.length = 0;
    expect(await fillEnglishVoiceNames(pool)).toBe(0);
    expect(asked).toEqual([]);
  });
});
