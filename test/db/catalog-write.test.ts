import pg from 'pg';
import { beforeEach, describe, expect, it } from 'vitest';
import { type CatalogRows, catalogRows, writeCatalog } from '../../scripts/lib/catalog-write';
import type { VdbSong } from '../../scripts/lib/vocadb';
import { query, seed } from './seed';
import { testUrl } from './urls';

const miku = { id: 10, name: '初音ミク', artistType: 'Vocaloid' };
const deco = { id: 45, name: 'DECO*27', artistType: 'Producer' };
const partner = { id: 99, name: '合作の相手', artistType: 'Producer' };

const vdb = (over: Partial<VdbSong> = {}): VdbSong => ({
  id: 1,
  name: 'ゴーストルール',
  songType: 'Original',
  publishDate: '2016-01-08T00:00:00Z',
  ratingScore: 100,
  favoritedTimes: 10,
  artists: [
    { artist: deco, name: deco.name, categories: 'Producer', isSupport: false },
    { artist: partner, name: partner.name, categories: 'Producer', isSupport: false },
    { artist: miku, name: miku.name, categories: 'Vocalist', isSupport: false },
  ],
  ...over,
});

const rows = (over: Partial<Parameters<typeof catalogRows>[0]> = {}) =>
  catalogRows({
    kept: [vdb()],
    dropped: [],
    sources: new Map([[1, { youtubeId: 'yt1', niconicoId: 'sm1', niconicoThumb: null }]]),
    seedIds: new Set([1]),
    producerIds: new Set([45]),
    names: new Map(),
    pictures: new Map([[45, 'deco.png']]),
    links: new Map([[45, { x: 'https://x.com/deco27' }]]),
    vocalists: new Map([[10, miku]]),
    roots: new Map([[10, 10]]),
    ...over,
  });

async function write(r: CatalogRows) {
  const client = new pg.Client({ connectionString: testUrl });
  await client.connect();
  try {
    await writeCatalog(client, r);
  } finally {
    await client.end();
  }
}

beforeEach(() => seed({ producers: [], songs: [] }));

describe('catalogRows（DB に書く行）', () => {
  it('全曲を取ったボカロPだけ complete。合作の相手は名前だけで、画像もリンクも無い', () => {
    expect(rows().producers).toEqual([
      {
        id: 45,
        name: 'DECO*27',
        picture: 'deco.png',
        links: { x: 'https://x.com/deco27' },
        complete: true,
      },
      { id: 99, name: '合作の相手', picture: null, links: null, complete: false },
    ]);
  });

  it('ローマ字は、曲名と違うときだけ持つ', () => {
    const named = (romaji: string) =>
      rows({ kept: [vdb({ names: [{ language: 'Romaji', value: romaji }] })] });
    expect(named('Ghost Rule').songs[0]?.romaji).toBe('Ghost Rule');
    expect(named('ゴーストルール').songs[0]?.romaji).toBeNull();
    expect(rows().songs[0]?.romaji).toBeNull();
  });

  it('投稿日は日付だけにする', () => {
    expect(rows().songs[0]?.published_on).toBe('2016-01-08');
  });
});

describe('writeCatalog（DB に書く）', () => {
  it('書いた曲が、作者と歌声つきで入る', async () => {
    await write(rows());
    expect(await query('select id, youtube_id, seed from song')).toEqual([
      { id: 1, youtube_id: 'yt1', seed: true },
    ]);
    expect(await query('select producer_id from song_producer order by 1')).toEqual([
      { producer_id: 45 },
      { producer_id: 99 },
    ]);
    expect(await query('select vocalist_id from song_vocalist')).toEqual([{ vocalist_id: 10 }]);
  });

  it('全曲を取った印と種の印は、一度付いたら次の取り込みで外さない', async () => {
    await write(rows());
    await write(rows({ producerIds: new Set(), seedIds: new Set() }));
    expect(await query('select complete from producer where id = 45')).toEqual([
      { complete: true },
    ]);
    expect(await query('select seed from song where id = 1')).toEqual([{ seed: true }]);
  });

  it('新しく出た曲だけを足すとき（その人の全曲は取り直さない）、画像とリンクと全曲の印はそのまま', async () => {
    await write(rows());
    await write(rows({ producerIds: new Set(), pictures: new Map(), links: new Map() }));
    expect(await query('select id, picture, links, complete from producer where id = 45')).toEqual([
      { id: 45, picture: 'deco.png', links: { x: 'https://x.com/deco27' }, complete: true },
    ]);
  });

  it('作者と歌声は、VocaDB の今の登録に合わせて入れ直す', async () => {
    await write(rows());
    const solo = vdb({
      artists: [
        { artist: deco, name: deco.name, categories: 'Producer', isSupport: false },
        { artist: miku, name: miku.name, categories: 'Vocalist', isSupport: false },
      ],
    });
    await write(rows({ kept: [solo] }));
    expect(await query('select producer_id from song_producer')).toEqual([{ producer_id: 45 }]);
  });

  it('流せないと分かった曲は消す', async () => {
    await write(rows());
    await write(rows({ kept: [], dropped: [vdb()] }));
    expect(await query('select count(*)::int as n from song')).toEqual([{ n: 0 }]);
  });
});
