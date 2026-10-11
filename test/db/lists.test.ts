import { beforeAll, describe, expect, it } from 'vitest';
import {
  dailyMix,
  findProducer,
  findVoice,
  MIX_SIZE,
  picksOfYear,
  playlistOfDay,
  producers,
  songsOfDay,
} from '@/lib/catalog';
import { seed, type SeedSong } from './seed';

/** 5月5日の曲。1700年から1年に1曲ずつ150曲で、評価点は曲ごとに違う（並べ替えで上位100曲が決まる） */
const MAY_5 = Array.from({ length: 150 }, (_, i) => ({
  id: 10_000 + i,
  publishedOn: `${1700 + i}-05-05`,
  rating: (i * 37) % 150,
}));
const MAY_5_TOP_100 = new Set(
  MAY_5.toSorted((a, b) => b.rating - a.rating || a.id - b.id)
    .slice(0, 100)
    .map((s) => s.id),
);

/** 6月6日の曲。ちょうど100曲（ピックアップにしない上限） */
const JUN_6 = Array.from({ length: 100 }, (_, i) => ({
  id: 20_000 + i,
  publishedOn: `${1900 + i}-06-06`,
}));

/** 2015年。1月に7曲（評価点 1〜7）、3月に2曲。2014年の曲は入らない */
const Y2015 = [
  ...Array.from({ length: 7 }, (_, i) => ({
    id: 30_000 + i,
    publishedOn: `2015-01-0${i + 1}`,
    rating: i + 1,
  })),
  { id: 30_100, publishedOn: '2015-03-10', rating: 1 },
  { id: 30_101, publishedOn: '2015-03-20', rating: 2 },
  { id: 30_200, publishedOn: '2014-12-31', rating: 100 },
];

/** 歌声。初音ミクの根（10）と、その版（11）。12 は別のキャラ */
const VOCALISTS = [
  { id: 10, name: '初音ミク (Unknown)' },
  { id: 11, name: '初音ミク V4X', baseId: 10 },
  { id: 12, name: 'GUMI' },
];

/** ボカロP。2 は全曲を取り込んだ人、3 は昔の曲だけの人、9999 は合作の相手として名前だけ入った人 */
const PRODUCERS = [
  { id: 1 },
  { id: 2, name: '新しい人' },
  { id: 3, name: '昔の人' },
  { id: 9999, name: '合作の相手', complete: false },
];

const songs: SeedSong[] = [
  ...MAY_5,
  ...JUN_6,
  ...Y2015,
  // 歌声: 版の名前で載っていても、根のキャラ（10）の曲として数える
  { id: 40_000, publishedOn: '2020-07-07', vocalists: [11], producers: [2] },
  { id: 40_001, publishedOn: '2019-07-07', vocalists: [10], producers: [2] },
  { id: 40_002, publishedOn: '2019-08-08', vocalists: [12], producers: [3] },
  // 合作: 名前だけの相手（9999）の id が小さくても、全曲を取り込んだ人（2）を曲のボカロPにする
  { id: 40_003, publishedOn: '2021-09-09', producers: [9999, 2] },
  { id: 40_004, publishedOn: '1999-09-09', producers: [3] },
];

const ids = (items: { songId: number }[]) => items.map((s) => s.songId);

beforeAll(() => seed({ producers: PRODUCERS, vocalists: VOCALISTS, songs }));

describe('playlistOfDay（一覧で流す曲）', () => {
  it('100曲を超える一覧は、100曲を選んで新しい順に並べる（ピックアップ）', async () => {
    const list = await playlistOfDay('05-05');
    expect(list.pickup).toBe(true);
    expect(list.total).toBe(150);
    expect(list.songs).toHaveLength(100);
    expect(new Set(ids(list.songs)).size).toBe(100);
    const dates = list.songs.map((s) => s.publishedOn);
    expect(dates).toEqual(dates.toSorted().toReversed());
  });

  it('選ぶ100曲のうち30曲以上は、その一覧の評価点の上位100曲から', async () => {
    const list = await playlistOfDay('05-05');
    expect(ids(list.songs).filter((id) => MAY_5_TOP_100.has(id)).length).toBeGreaterThanOrEqual(30);
  });

  it('同じ日なら同じ100曲を選ぶ（画面に並べた曲と流れる曲が食い違わない）', async () => {
    expect(ids((await playlistOfDay('05-05')).songs)).toEqual(
      ids((await playlistOfDay('05-05')).songs),
    );
  });

  it('100曲までの一覧は、全曲をそのまま流す', async () => {
    const list = await playlistOfDay('06-06');
    expect(list.pickup).toBe(false);
    expect(list.total).toBe(100);
    expect(ids(list.songs)).toEqual(ids((await songsOfDay('06-06', 1)).songs));
  });
});

describe('picksOfYear（年の代表曲）', () => {
  it('月ごとに評価点の上位5曲を選び、新しい月から、月の中も新しい順に並べる', async () => {
    const { songs: picked, monthTotals } = await picksOfYear(2015);
    expect(ids(picked)).toEqual([30_101, 30_100, 30_006, 30_005, 30_004, 30_003, 30_002]);
    expect(Object.fromEntries(monthTotals)).toEqual({ '03': 2, '01': 7 });
  });
});

describe('findVoice（歌声）', () => {
  it('版の名前で載った曲も、根のキャラの曲にまとめ、名前の (Unknown) を外す', async () => {
    const found = await findVoice(10);
    expect(found?.voice).toEqual({ id: 10, name: '初音ミク', songCount: 2 });
    expect(ids(found?.songs ?? [])).toEqual([40_000, 40_001]);
  });

  it('版の id では引けない（キャラごとの画面だけ）', async () => {
    expect(await findVoice(11)).toBeUndefined();
  });
});

describe('ボカロP', () => {
  it('一覧は全曲を取り込んだ人だけで、最近曲を出した人から', async () => {
    const list = await producers();
    expect(list.map((p) => p.id)).toEqual([2, 3, 1]);
    expect(list.find((p) => p.id === 2)?.songCount).toBe(3);
  });

  it('名前だけ入った合作の相手の画面は無い', async () => {
    expect(await findProducer(9999)).toBeUndefined();
    expect((await findProducer(2))?.songs.map((s) => s.id)).toEqual([40_003, 40_000, 40_001]);
  });

  it('合作の曲は、全曲を取り込んだ人の曲として流す', async () => {
    const [song] = (await songsOfDay('09-09', 1)).songs;
    expect(song).toMatchObject({ songId: 40_003, producerId: 2, producerName: '新しい人' });
  });
});

describe('dailyMix（きょうの出会い）', () => {
  it('同じ日なら同じ並びで、重ならずに MIX_SIZE 曲', async () => {
    const a = await dailyMix('2026-10-11', MIX_SIZE);
    expect(a).toHaveLength(MIX_SIZE);
    expect(new Set(ids(a)).size).toBe(MIX_SIZE);
    expect(ids(await dailyMix('2026-10-11', MIX_SIZE))).toEqual(ids(a));
    expect(ids(await dailyMix('2026-10-12', MIX_SIZE))).not.toEqual(ids(a));
  });
});
