import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import pg from 'pg';
import type { VdbSong } from '../../scripts/lib/vocadb';
import { query, seed } from './seed';
import { testUrl } from './urls';

/**
 * 英語の画面に出す名前を DB に入れる処理（scripts/lib/song-names.ts）。VocaDB には聞かず、返事を差し替える
 */

const asked: number[] = [];
const recent = vi.hoisted(() => ({ songs: [] as unknown[] }));
vi.mock('../../scripts/lib/vocadb', () => ({
  artistNames: async (id: number) => {
    asked.push(id);
    return (
      (
        {
          1: [
            { language: 'English', value: 'DECO*27' },
            { language: 'Romaji', value: 'DECO 27' },
          ],
          2: [{ language: 'Romaji', value: 'Hachi' }],
        } as Record<number, { language: string; value: string }[]>
      )[id] ?? []
    );
  },
  songsPublishedAfter: async () => recent.songs,
}));

const { borrowVersionNames, fillEnglishProducerNames, nameIn, refreshSongNames } =
  await import('../../scripts/lib/song-names');

const pool = new pg.Pool({ connectionString: testUrl });
afterAll(() => pool.end());

beforeEach(async () => {
  asked.length = 0;
  await seed({
    producers: [
      { id: 1, name: 'デコニーナ' },
      { id: 2, name: 'ハチ' },
      { id: 3, name: '名前なし' },
      { id: 4, name: 'kz' },
      { id: 5, name: '合作の人', complete: false },
    ],
    songs: [
      { id: 10, publishedOn: '2010-01-01', name: 'ヴァンパイア' },
      { id: 11, publishedOn: '2011-01-01', name: 'ヴァンパイア -Hello ver.-' },
      { id: 12, publishedOn: '2012-01-01', name: '別の曲' },
    ],
  });
});

const songNames = async () =>
  Object.fromEntries(
    (
      await query<{ id: number; name_en: string | null; romaji: string | null }>(
        'select id, name_en, romaji from song order by id',
      )
    ).map((r) => [r.id, [r.name_en, r.romaji]]),
  );

describe('nameIn（VocaDB のその言語の名前）', () => {
  const song = (names: { language: string; value: string }[]) =>
    ({ name: '千本桜', names }) as unknown as VdbSong;

  it('その言語の名前を返す。曲名と同じか、無ければ null', () => {
    expect(nameIn(song([{ language: 'Romaji', value: 'Senbonzakura' }]), 'Romaji')).toBe(
      'Senbonzakura',
    );
    expect(nameIn(song([{ language: 'English', value: '千本桜' }]), 'English')).toBeNull();
    expect(nameIn(song([]), 'English')).toBeNull();
  });
});

describe('borrowVersionNames（出し直しの版に元の曲の名前を借りる）', () => {
  it('版の曲名が元の曲名で始まるときだけ、元の名前に残りの部分を足す', async () => {
    await query(
      "update song set name_en = 'Vampire', romaji = 'Vanpaia' where id = 10; update song set original_id = 10 where id in (11, 12)",
    );
    expect(await borrowVersionNames(pool)).toBe(1);
    const names = await songNames();
    expect(names[11]).toEqual(['Vampire -Hello ver.-', 'Vanpaia -Hello ver.-']);
    expect(names[12]).toEqual([null, null]);
  });

  it('もう名前のある版は書き換えない', async () => {
    await query(
      "update song set name_en = 'Vampire' where id = 10; update song set original_id = 10, name_en = 'Own name' where id = 11",
    );
    expect(await borrowVersionNames(pool)).toBe(0);
    expect((await songNames())[11]).toEqual(['Own name', null]);
  });
});

describe('refreshSongNames（あとから足された名前を拾う）', () => {
  it('DB にある曲の名前だけを書き換え、曲は足さない。そのあと版に名前を借り直す', async () => {
    await query('update song set original_id = 10 where id = 11');
    recent.songs = [
      {
        id: 10,
        name: 'ヴァンパイア',
        names: [
          { language: 'English', value: 'Vampire' },
          { language: 'Romaji', value: 'Vanpaia' },
        ],
      },
      { id: 999, name: '入っていない曲', names: [{ language: 'English', value: 'Not here' }] },
    ];
    expect(await refreshSongNames(pool, 365)).toBe(1);
    const names = await songNames();
    expect(names[10]).toEqual(['Vampire', 'Vanpaia']);
    expect(names[11]).toEqual(['Vampire -Hello ver.-', 'Vanpaia -Hello ver.-']);
    expect(Object.keys(names)).toEqual(['10', '11', '12']);
  });
});

describe('fillEnglishProducerNames（ボカロPの英語の名前）', () => {
  it('全曲を取った、日本語の名前の人だけを聞き、English、無ければ Romaji、どちらも無ければ日本語のまま入れる', async () => {
    expect(await fillEnglishProducerNames(pool)).toBe(3);
    expect(asked).toEqual([1, 2, 3]);
    const rows = await query<{ id: number; name_en: string | null }>(
      'select id, name_en from producer order by id',
    );
    expect(rows.map((r) => r.name_en)).toEqual(['DECO*27', 'Hachi', '名前なし', null, null]);
  });

  it('2回目は、もう入っている人を聞き直さない', async () => {
    await fillEnglishProducerNames(pool);
    asked.length = 0;
    expect(await fillEnglishProducerNames(pool)).toBe(0);
    expect(asked).toEqual([]);
  });
});
