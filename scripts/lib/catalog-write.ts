import type pg from 'pg';
import type { ProducerLinks } from '../../src/lib/catalog';
import type { Source } from './dead';
import { producersOf, vocalistsOf } from './pick';
import { borrowVersionNames, nameIn } from './song-names';
import type { VdbSong } from './vocadb';

/** DB に書く行。表ごとにまとめ、1回ずつで書く */
export type CatalogRows = {
  producers: {
    id: number;
    name: string;
    picture: string | null;
    links: ProducerLinks | null;
    complete: boolean;
  }[];
  vocalists: { id: number; name: string; kind: string; base_id: number }[];
  songs: {
    id: number;
    name: string;
    published_on: string | null;
    rating_score: number;
    favorited_times: number;
    youtube_id: string | null;
    niconico_id: string | null;
    seed: boolean;
    niconico_thumb: string | null;
    romaji: string | null;
    name_en: string | null;
    original_id: number | null;
  }[];
  songProducers: { song_id: number; producer_id: number }[];
  songVocalists: { song_id: number; vocalist_id: number; support: boolean }[];
  /** 前の取り込みで入ったが、今回は流せないと分かった曲。消す */
  dropped: number[];
};

/**
 * 集めた曲から、DB に書く行を作る。合作の相手も作者として表に入る（complete は全曲を取ったボカロPだけ）。
 * 画像とリンクは全曲を取ったボカロPの分だけあり、ほかは null
 */
export function catalogRows({
  kept,
  dropped,
  sources,
  seedIds,
  producerIds,
  names,
  pictures,
  links,
  vocalists,
  roots,
}: {
  kept: VdbSong[];
  dropped: VdbSong[];
  /** 流せない動画を外したあとの流す先 */
  sources: Map<number, Source>;
  seedIds: Set<number>;
  /** 全曲を取ったボカロP */
  producerIds: Set<number>;
  /** VocaDB の名前を置き換えるボカロP */
  names: Map<number, string>;
  pictures: Map<number, string | null>;
  links: Map<number, ProducerLinks>;
  /** 表に入れる歌声（曲に出てこない根の歌声も含む）と、その根 */
  vocalists: Map<number, { id: number; name: string; artistType: string }>;
  roots: Map<number, number>;
}): CatalogRows {
  const producers = new Map(kept.flatMap((s) => producersOf(s)).map((p) => [p.id, p]));
  return {
    producers: [...producers.values()].map((p) => ({
      id: p.id,
      name: names.get(p.id) ?? p.name,
      picture: pictures.get(p.id) ?? null,
      links: links.get(p.id) ?? null,
      complete: producerIds.has(p.id),
    })),
    vocalists: [...vocalists.values()].map((v) => ({
      id: v.id,
      name: v.name,
      kind: v.artistType,
      base_id: roots.get(v.id) ?? v.id,
    })),
    songs: kept.map((s) => {
      const source = sources.get(s.id)!;
      return {
        id: s.id,
        name: s.name,
        published_on: s.publishDate?.slice(0, 10) ?? null,
        rating_score: s.ratingScore,
        favorited_times: s.favoritedTimes,
        youtube_id: source.youtubeId,
        niconico_id: source.niconicoId,
        seed: seedIds.has(s.id),
        niconico_thumb: source.niconicoThumb,
        // 英語の画面に出し、検索でも引けるよう残す。曲名と同じなら（英語の曲名など）持たない
        romaji: nameIn(s, 'Romaji'),
        name_en: nameIn(s, 'English'),
        original_id: s.originalVersionId ?? null,
      };
    }),
    songProducers: kept.flatMap((s) =>
      producersOf(s).map((p) => ({ song_id: s.id, producer_id: p.id })),
    ),
    songVocalists: kept.flatMap((s) =>
      vocalistsOf(s).map((v) => ({ song_id: s.id, vocalist_id: v.id, support: v.support })),
    ),
    dropped: dropped.map((s) => s.id),
  };
}

/**
 * 行を DB に書く。1つのトランザクションで、表ごとに JSON にまとめて1回で書く（1行ずつ書くと、海の向こうの DB では往復が
 * 数万回になって1時間を超えた）。取り込みは足すか書き換えるだけで、消すのは流せないと分かった曲だけ。
 * - ボカロP: 全曲を取った印（complete）は一度付いたら外さない。画像は空で上書きしない。リンクは全曲を取った人の分だけ書き換える
 * - 曲: 種の印（seed）は一度付いたら外さない。作者と歌声は、VocaDB の今の登録に合わせて入れ直す
 */
export async function writeCatalog(client: pg.ClientBase, rows: CatalogRows) {
  await client.query('begin');
  try {
    await client.query(
      `insert into producer (id, name, picture, links, complete)
       select id, name, picture, coalesce(links, '{}'), complete
       from jsonb_to_recordset($1) as x(id integer, name text, picture text, links jsonb, complete boolean)
       on conflict (id) do update set name = excluded.name,
         picture = coalesce(excluded.picture, producer.picture),
         links = case when excluded.complete then excluded.links else producer.links end,
         complete = producer.complete or excluded.complete`,
      [JSON.stringify(rows.producers)],
    );
    await client.query(
      `insert into vocalist (id, name, kind, base_id)
       select * from jsonb_to_recordset($1) as x(id integer, name text, kind text, base_id integer)
       on conflict (id) do update set name = excluded.name, kind = excluded.kind, base_id = excluded.base_id`,
      [JSON.stringify(rows.vocalists)],
    );
    await client.query(
      `insert into song (id, name, published_on, rating_score, favorited_times, youtube_id, niconico_id, seed, niconico_thumb,
         romaji, name_en, original_id)
       select * from jsonb_to_recordset($1) as x(id integer, name text, published_on date,
         rating_score integer, favorited_times integer, youtube_id text, niconico_id text, seed boolean,
         niconico_thumb text, romaji text, name_en text, original_id integer)
       on conflict (id) do update set name = excluded.name, published_on = excluded.published_on,
         niconico_thumb = excluded.niconico_thumb, romaji = excluded.romaji, name_en = excluded.name_en,
         original_id = excluded.original_id,
         rating_score = excluded.rating_score, favorited_times = excluded.favorited_times,
         youtube_id = excluded.youtube_id, niconico_id = excluded.niconico_id,
         seed = song.seed or excluded.seed, imported_at = now()`,
      [JSON.stringify(rows.songs)],
    );
    const ids = rows.songs.map((s) => s.id);
    // 前の取り込みで入ったが、今回は流せないと分かった曲を消す（作者と歌声のつながりも一緒に消える）
    await client.query('delete from song where id = any($1)', [rows.dropped]);
    await client.query('delete from song_producer where song_id = any($1)', [ids]);
    await client.query('delete from song_vocalist where song_id = any($1)', [ids]);
    await client.query(
      `insert into song_producer (song_id, producer_id)
       select distinct * from jsonb_to_recordset($1) as x(song_id integer, producer_id integer)`,
      [JSON.stringify(rows.songProducers)],
    );
    await client.query(
      `insert into song_vocalist (song_id, vocalist_id, support)
       select distinct on (song_id, vocalist_id) *
       from jsonb_to_recordset($1) as x(song_id integer, vocalist_id integer, support boolean)
       order by song_id, vocalist_id, support`,
      [JSON.stringify(rows.songVocalists)],
    );
    await borrowVersionNames(client);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}
