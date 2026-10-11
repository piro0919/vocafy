import pg from 'pg';
import { testUrl } from './urls';

/** テストで入れる1曲。書かない列は、流せる YouTube の曲として埋める */
export type SeedSong = {
  id: number;
  publishedOn: string | null;
  rating?: number;
  name?: string;
  /** null にすると YouTube に本家が無い曲になる */
  youtubeId?: string | null;
  niconicoId?: string | null;
  niconicoThumb?: string | null;
  producers?: number[];
  vocalists?: number[];
};

export type SeedData = {
  producers?: { id: number; name?: string; complete?: boolean }[];
  vocalists?: { id: number; name: string; baseId?: number | null }[];
  songs: SeedSong[];
};

/** 曲の作者を書かなかったときのボカロP */
const DEFAULT_PRODUCER = 1;

/** 表を空にしてから data を入れる。テストのファイルごとに、自分の場面だけで確かめる */
export async function seed(data: SeedData) {
  const client = new pg.Client({ connectionString: testUrl });
  await client.connect();
  try {
    await client.query('truncate song, producer, vocalist, unplayable, "user" cascade');
    const producers = data.producers ?? [{ id: DEFAULT_PRODUCER }];
    await client.query(
      `insert into producer (id, name, complete)
       select id, name, complete from json_to_recordset($1) as x(id int, name text, complete boolean)`,
      [JSON.stringify(producers.map((p) => ({ name: `P${p.id}`, complete: true, ...p })))],
    );
    await client.query(
      `insert into vocalist (id, name, kind, base_id)
       select id, name, 'Vocaloid', base_id from json_to_recordset($1) as x(id int, name text, base_id int)`,
      [JSON.stringify((data.vocalists ?? []).map((v) => ({ base_id: v.baseId ?? null, ...v })))],
    );
    const songs = data.songs.map((s) => ({
      id: s.id,
      name: s.name ?? `曲${s.id}`,
      published_on: s.publishedOn,
      rating_score: s.rating ?? 0,
      youtube_id: s.youtubeId === undefined ? `yt${s.id}` : s.youtubeId,
      niconico_id: s.niconicoId ?? null,
      niconico_thumb: s.niconicoThumb ?? null,
    }));
    await client.query(
      `insert into song (id, name, published_on, rating_score, youtube_id, niconico_id, niconico_thumb)
       select * from json_to_recordset($1) as x(id int, name text, published_on date, rating_score int,
         youtube_id text, niconico_id text, niconico_thumb text)`,
      [JSON.stringify(songs)],
    );
    await client.query(
      `insert into song_producer (song_id, producer_id)
       select song_id, producer_id from json_to_recordset($1) as x(song_id int, producer_id int)`,
      [
        JSON.stringify(
          data.songs.flatMap((s) =>
            (s.producers ?? [DEFAULT_PRODUCER]).map((p) => ({ song_id: s.id, producer_id: p })),
          ),
        ),
      ],
    );
    await client.query(
      `insert into song_vocalist (song_id, vocalist_id)
       select song_id, vocalist_id from json_to_recordset($1) as x(song_id int, vocalist_id int)`,
      [
        JSON.stringify(
          data.songs.flatMap((s) =>
            (s.vocalists ?? []).map((v) => ({ song_id: s.id, vocalist_id: v })),
          ),
        ),
      ],
    );
  } finally {
    await client.end();
  }
}

/** ログインした人を足す（お気に入りの表は人の表を指す） */
export async function addUser(id: string) {
  const client = new pg.Client({ connectionString: testUrl });
  await client.connect();
  try {
    await client.query(
      `insert into "user" (id, name, email, "emailVerified") values ($1, $1, $1 || '@example.com', true)`,
      [id],
    );
  } finally {
    await client.end();
  }
}

/** テストの中で表を直に読む */
export async function query<T extends pg.QueryResultRow>(text: string, params: unknown[] = []) {
  const client = new pg.Client({ connectionString: testUrl });
  await client.connect();
  try {
    return (await client.query<T>(text, params)).rows;
  } finally {
    await client.end();
  }
}
