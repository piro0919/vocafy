import { beforeAll, describe, expect, it } from 'vitest';
import { onThisDay } from '@/lib/catalog';
import { seed, type SeedSong } from './seed';

/** 10月11日の曲。1995年から1年に1曲ずつ30曲で、新しい年ほど評価点が高い */
const OCT_11 = Array.from({ length: 30 }, (_, i) => ({
  id: 1000 + i,
  publishedOn: `${1995 + i}-10-11`,
  rating: i * 10,
}));
/** 評価点の上位24曲（大きな1曲の8枠はここから選ぶ） */
const TOP_24 = new Set(OCT_11.slice(-24).map((s) => s.id));

const songs: SeedSong[] = [
  ...OCT_11,
  // 流せない曲（YouTube に本家が無く、ニコニコの表紙も取れていない）と、投稿日の無い曲は出さない
  { id: 2000, publishedOn: '2020-10-11', youtubeId: null, niconicoId: 'sm1' },
  { id: 2001, publishedOn: null },
  // 3月5日は2曲だけ。前後に広げると、3月6日に3曲、3月8日に5曲
  { id: 3001, publishedOn: '2010-03-05' },
  { id: 3002, publishedOn: '2011-03-05' },
  ...[3011, 3012, 3013].map((id, i) => ({ id, publishedOn: `${2012 + i}-03-06` })),
  ...[3021, 3022, 3023, 3024, 3025].map((id, i) => ({ id, publishedOn: `${2015 + i}-03-08` })),
  { id: 4001, publishedOn: '2024-02-29' },
  { id: 5001, publishedOn: '2020-01-01' },
];

const ids = (items: { songId: number }[]) => items.map((s) => s.songId);

beforeAll(() => seed({ songs }));

describe('onThisDay', () => {
  it('その月日の流せる曲を、新しい年から並べる', async () => {
    const { songs: found } = await onThisDay('2026-10-11', 1);
    expect(ids(found)).toEqual(OCT_11.map((s) => s.id).toReversed());
  });

  it('大きな1曲は1日24枠で、その日の曲から重ならずに選び、8枠以上は評価点の上位24曲から', async () => {
    const { heroes } = await onThisDay('2026-10-11', 1);
    expect(heroes).toHaveLength(24);
    expect(new Set(ids(heroes)).size).toBe(24);
    expect(ids(heroes).every((id) => id >= 1000 && id < 1030)).toBe(true);
    expect(ids(heroes).filter((id) => TOP_24.has(id)).length).toBeGreaterThanOrEqual(8);
  });

  it('大きな1曲の並びは、同じ日なら同じで、日が替わると替わる', async () => {
    const a = await onThisDay('2026-10-11', 1);
    const b = await onThisDay('2026-10-11', 1);
    const nextYear = await onThisDay('2027-10-11', 1);
    expect(ids(b.heroes)).toEqual(ids(a.heroes));
    expect(ids(nextYear.heroes)).not.toEqual(ids(a.heroes));
    // 混ざっている（曲の id の順のままではない）
    expect(ids(a.heroes)).not.toEqual(ids(a.heroes).toSorted((x, y) => x - y));
  });

  it('曲の少ない日は、前後の日へ1日ずつ広げて min 曲に届いたところで止める', async () => {
    const { songs: found, heroes } = await onThisDay('2026-03-05', 4);
    // 近い日から、同じ日の中は新しい年から
    expect(ids(found)).toEqual([3002, 3001, 3013, 3012, 3011]);
    // 大きな1曲は、その日の曲があればその日の曲だけから
    expect(ids(heroes).toSorted((x, y) => x - y)).toEqual([3001, 3002]);
  });

  it('広げるのは3日まで', async () => {
    const { songs: found } = await onThisDay('2026-03-05', 100);
    expect(found).toHaveLength(10);
    expect(ids(found)).not.toContain(4001);
  });

  it('2月29日の曲も、前後の日の曲として拾う', async () => {
    const { songs: found, heroes } = await onThisDay('2026-02-28', 1);
    expect(ids(found)).toEqual([4001]);
    // その日の曲が無ければ、広げた曲から選ぶ
    expect(ids(heroes)).toEqual([4001]);
    expect(ids((await onThisDay('2028-02-29', 1)).songs)).toEqual([4001]);
  });

  it('年をまたいで前後の日を数える（12月31日の翌日は1月1日）', async () => {
    expect(ids((await onThisDay('2026-12-31', 1)).songs)).toEqual([5001]);
  });
});
