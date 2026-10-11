import { beforeAll, describe, expect, it } from 'vitest';
import { GET } from '@/app/api/list/[...path]/route';
import type { QueueItem } from '@/lib/catalog';
import { PAGE_SIZE } from '@/lib/page-size';
import { seed, type SeedSong } from './seed';

/** 7月7日の曲。1ページ（PAGE_SIZE 曲）より1曲多い */
const JUL_7 = Array.from({ length: PAGE_SIZE + 1 }, (_, i) => ({
  id: 1000 + i,
  publishedOn: `${1700 + i}-07-07`,
}));

const songs: SeedSong[] = [
  ...JUL_7,
  { id: 5000, publishedOn: '2015-03-10', vocalists: [10] },
  { id: 5001, publishedOn: '2015-01-10', vocalists: [10] },
];

/** /api/list/... の住所で読む。404 なら null */
async function list(path: string): Promise<number[] | null> {
  const res = await GET(new Request(`http://localhost/api/list/${path}`), {
    params: Promise.resolve({ path: path.split('/') }),
  } as Parameters<typeof GET>[1]);
  if (res.status === 404) return null;
  return ((await res.json()) as QueueItem[]).map((s) => s.songId);
}

beforeAll(() => seed({ vocalists: [{ id: 10, name: '初音ミク' }], songs }));

describe('/api/list（一覧の続き）', () => {
  it('日付の一覧を、新しい順に1ページずつ返す', async () => {
    const first = await list('days/07-07/1');
    expect(first).toHaveLength(PAGE_SIZE);
    expect(first?.[0]).toBe(1000 + PAGE_SIZE);
    expect(await list('days/07-07/2')).toEqual([1000]);
    expect(await list('days/07-07/3')).toEqual([]);
  });

  it('年の月、歌声の年の全曲', async () => {
    expect(await list('years/2015/03/1')).toEqual([5000]);
    expect(await list('voices/10/2015/1')).toEqual([5000, 5001]);
  });

  it('代表曲（年・歌声）ときょうの出会いは1ページだけで、2ページ目からは空', async () => {
    expect(await list('years/2015/1')).toEqual([5000, 5001]);
    expect(await list('years/2015/2')).toEqual([]);
    expect(await list('voices/10/1')).toEqual([5000, 5001]);
    expect(await list('mix/2026-10-11/1')).toHaveLength(18);
    expect(await list('mix/2026-10-11/2')).toEqual([]);
  });

  it('知らない住所と、形の違うページは 404', async () => {
    for (const path of [
      'albums/1/1',
      'days/07-07/0',
      'days/07-07/x',
      'days/07-07/1.5',
      'years/1',
      'mix/today/1',
      'days/07-07/03/1',
    ]) {
      expect(await list(path)).toBeNull();
    }
  });
});
