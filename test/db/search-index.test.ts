import { beforeAll, describe, expect, it } from 'vitest';
import { searchDetails, searchIndex } from '@/lib/catalog';
import { seed } from './seed';

beforeAll(() =>
  seed({
    producers: [{ id: 1 }, { id: 2 }, { id: 9999, complete: false }],
    vocalists: [{ id: 10, name: '初音ミク' }],
    songs: [
      { id: 100, name: '曲A', publishedOn: '2020-01-01', producers: [1], vocalists: [10] },
      { id: 101, name: '曲B', publishedOn: '2022-01-01', producers: [2] },
      { id: 102, name: '曲C', publishedOn: '2021-01-01', producers: [1] },
      // ニコニコだけの曲は、2段目にニコニコの表紙を持つ
      {
        id: 103,
        name: '曲D',
        publishedOn: '2019-01-01',
        producers: [2],
        youtubeId: null,
        niconicoId: 'sm103',
        niconicoThumb: 'https://nico/103',
      },
      // 合作の相手（9999）と全曲を取り込んだ人（1）の曲は、1 の曲として引く
      { id: 104, name: '曲E', publishedOn: '2018-01-01', producers: [9999, 1] },
      // 名前だけ入った人だけの曲と、流せない曲は索引に入れない
      { id: 105, name: '曲F', publishedOn: '2018-01-01', producers: [9999] },
      { id: 106, name: '曲G', publishedOn: '2018-01-01', youtubeId: null, niconicoId: 'sm106' },
    ],
  }),
);

describe('検索の索引', () => {
  it('1段目の曲は、そのボカロPの番号と一緒に新しい順で並ぶ', async () => {
    const index = await searchIndex();
    const name = (i: number) => index.producers[i][0];
    expect(index.songs.map(([title, i]) => [title, name(i)])).toEqual([
      ['曲B', 2],
      ['曲C', 1],
      ['曲A', 1],
      ['曲D', 2],
      ['曲E', 1],
    ]);
    expect(index.producers.map(([id]) => id)).not.toContain(9999);
  });

  it('2段目は、1段目でそのボカロPの曲が出てくる順と同じ（何番目かで引く）', async () => {
    const index = await searchIndex();
    for (const [p, [id]] of index.producers.entries()) {
      const titles = index.songs.filter(([, i]) => i === p).map(([title]) => title);
      const details = await searchDetails(id);
      expect(details).toHaveLength(titles.length);
      expect(details.map(([songId]) => `曲${'ABCDEFG'[songId - 100]}`)).toEqual(titles);
    }
  });

  it('2段目には、流す先の動画の ID と、ニコニコの曲だけ表紙を持つ', async () => {
    expect(await searchDetails(2)).toEqual([
      [101, 'yt101', null, ''],
      [103, 'sm103', 'https://nico/103', ''],
    ]);
    expect((await searchDetails(1))[1]).toEqual([100, 'yt100', null, '初音ミク']);
  });

  it('一覧に出ないボカロPの2段目は空', async () => {
    expect(await searchDetails(9999)).toEqual([]);
  });
});
