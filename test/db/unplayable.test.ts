import { beforeEach, describe, expect, it } from 'vitest';
import { markUnplayable } from '@/lib/unplayable';
import { query, seed } from './seed';

type Row = { id: number; youtube_id: string | null; niconico_id: string | null };

const song = async (id: number) =>
  (await query<Row>('select id, youtube_id, niconico_id from song where id = $1', [id]))[0];

beforeEach(() =>
  seed({
    producers: [{ id: 1 }, { id: 2 }, { id: 3 }],
    songs: [
      // YouTube とニコニコの両方に本家がある曲
      {
        id: 1,
        publishedOn: '2020-01-01',
        youtubeId: 'ytBoth',
        niconicoId: 'smBoth',
        producers: [1, 2],
      },
      // YouTube だけの曲
      { id: 2, publishedOn: '2020-01-01', youtubeId: 'ytOnly', producers: [3] },
      // ニコニコだけの曲
      { id: 3, publishedOn: '2020-01-01', youtubeId: null, niconicoId: 'smOnly', producers: [3] },
    ],
  }),
);

describe('markUnplayable', () => {
  it('YouTube が流せない曲は、ニコニコに本家があればニコニコに切り替える', async () => {
    expect((await markUnplayable('youtube', 'ytBoth')).toSorted()).toEqual([1, 2]);
    expect(await song(1)).toEqual({ id: 1, youtube_id: null, niconico_id: 'smBoth' });
  });

  it('YouTube が流せず、ニコニコにも本家が無い曲は外す', async () => {
    expect(await markUnplayable('youtube', 'ytOnly')).toEqual([3]);
    expect(await song(2)).toBeUndefined();
  });

  it('ニコニコが流せない曲は、YouTube が無ければ外し、あればニコニコだけ外す', async () => {
    await markUnplayable('niconico', 'smOnly');
    expect(await song(3)).toBeUndefined();
    await markUnplayable('niconico', 'smBoth');
    expect(await song(1)).toEqual({ id: 1, youtube_id: 'ytBoth', niconico_id: null });
  });

  it('流せない動画を記録する（取り込みで戻さないため）。同じ動画を二度知らされても1行', async () => {
    await markUnplayable('youtube', 'ytOnly');
    await markUnplayable('youtube', 'ytOnly');
    expect(await query('select service, video_id from unplayable')).toEqual([
      { service: 'youtube', video_id: 'ytOnly' },
    ]);
  });

  it('どの曲にも使われていない動画なら、曲は変えず、作り直す画面も無い', async () => {
    expect(await markUnplayable('youtube', 'ytNobody')).toEqual([]);
    expect(await query('select count(*)::int as n from song')).toEqual([{ n: 3 }]);
  });
});
