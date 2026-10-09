// DB に書くのはサーバーだけ
import 'server-only';
import pg from 'pg';
import { env } from '@/env';
import type { Service } from './video-id';

/**
 * 再生中に「流せない」と知らされた動画を、サーバーから確かめ直し、本当に流せなければ台帳から外す。
 * プレイヤーの知らせ（src/components/player/report.ts）を受ける API（src/app/api/unplayable/route.ts）から使う。
 *
 * 知らせはだれでも送れるので、そのまま信じない。確かめるのは DB に触らない外の窓口だけで、DB を起こすのは
 * 本当に流せないと分かったときだけにする（DB は最後に読まれてから5分動き続け、無料プランの計算時間を食う）
 */
const AGENT = { 'User-Agent': 'Vocafy (https://vocafy.kkweb.io)' };

/**
 * 流せるか。true は流せる、false は流せない、null は分からない（窓口の混み合いなど。外さない）。
 * YouTube は oEmbed が 401・403・404 なら流せない（取り込みの scripts/lib/youtube.ts と同じ見方）。
 * ニコニコは動画の情報の窓口（getthumbinfo）が失敗を返すか、埋め込めない（embeddable が 0）なら流せない
 */
export async function isPlayable(service: Service, id: string): Promise<boolean | null> {
  try {
    if (service === 'youtube') {
      const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
      const res = await fetch(url, { headers: AGENT, cache: 'no-store' });
      if (res.ok) return true;
      return [401, 403, 404].includes(res.status) ? false : null;
    }
    const res = await fetch(`https://ext.nicovideo.jp/api/getthumbinfo/${id}`, {
      headers: AGENT,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const xml = await res.text();
    if (xml.includes('status="fail"')) return false;
    return !xml.includes('<embeddable>0</embeddable>');
  } catch {
    return null;
  }
}

let pool: pg.Pool | undefined;

/**
 * 流せない動画を記録し、その動画を使っていた曲を直す。YouTube が流せなければ、ニコニコに本家がある曲は
 * ニコニコに切り替え、無ければ曲ごと外す。ニコニコが流せなければ、YouTube の無い曲を外す。
 * 直した曲の作者（ボカロP）の id を返す。その人の画面を作り直すため
 */
export async function markUnplayable(service: Service, id: string): Promise<number[]> {
  pool ??= new pg.Pool({ connectionString: env.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query(
      `insert into unplayable (service, video_id) values ($1, $2)
       on conflict (service, video_id) do update set checked_at = now()`,
      [service, id],
    );
    const column = service === 'youtube' ? 'youtube_id' : 'niconico_id';
    const { rows } = await client.query<{ producer_id: number }>(
      `select distinct sp.producer_id from song s join song_producer sp on sp.song_id = s.id
       where s.${column} = $1`,
      [id],
    );
    if (service === 'youtube') {
      await client.query(
        'update song set youtube_id = null where youtube_id = $1 and niconico_id is not null',
        [id],
      );
      await client.query('delete from song where youtube_id = $1', [id]);
    } else {
      await client.query('delete from song where niconico_id = $1 and youtube_id is null', [id]);
      await client.query('update song set niconico_id = null where niconico_id = $1', [id]);
    }
    await client.query('commit');
    return rows.map((r) => r.producer_id);
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
