import 'server-only';
import pg from 'pg';
import { env } from '@/env';
import { producersByIds, songsByIds } from './catalog';

/**
 * アカウントに残すお気に入り（db/migrations/0006_accounts.sql の favorite_song と favorite_producer）。
 * 表には id と足した時刻だけを持ち、出すときに台帳から今の曲の情報を引く（ブラウザに残す写しと違って古くならない）
 */
let pool: pg.Pool | undefined;

function db(): pg.Pool {
  pool ??= new pg.Pool({ connectionString: env.DATABASE_URL, max: 1 });
  return pool;
}

export type Kind = 'song' | 'producer';

const TABLE = {
  song: ['favorite_song', 'song_id'],
  producer: ['favorite_producer', 'producer_id'],
} as const;

/** そのユーザーのお気に入り。どちらも足した順の新しいものが先 */
export async function readFavorites(userId: string) {
  const [songs, producers] = await Promise.all(
    (['song', 'producer'] as const).map(async (kind) => {
      const [table, column] = TABLE[kind];
      const { rows } = await db().query<{ id: number }>(
        `select ${column} as id from ${table} where user_id = $1 order by added_at desc`,
        [userId],
      );
      return rows.map((r) => r.id);
    }),
  );
  return { songs: await songsByIds(songs), producers: await producersByIds(producers) };
}

/** 1件を足すか外す */
export async function setFavorite(userId: string, kind: Kind, id: number, on: boolean) {
  const [table, column] = TABLE[kind];
  await db().query(
    on
      ? `insert into ${table} (user_id, ${column}) values ($1, $2) on conflict do nothing`
      : `delete from ${table} where user_id = $1 and ${column} = $2`,
    [userId, id],
  );
}

/**
 * ブラウザに残っていたお気に入りを足す（初めてログインした端末で1回だけ）。ids は新しいものが先の並びで、
 * その順が残るように、先頭ほど新しい時刻を付ける。もうアカウントにあるものはそのまま
 */
export async function mergeFavorites(userId: string, kind: Kind, ids: number[]) {
  if (ids.length === 0) return;
  const [table, column] = TABLE[kind];
  await db().query(
    `insert into ${table} (user_id, ${column}, added_at)
     select $1, id, now() - (ord * interval '1 millisecond')
     from unnest($2::int[]) with ordinality as t(id, ord)
     on conflict do nothing`,
    [userId, ids],
  );
}
