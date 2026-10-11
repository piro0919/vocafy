/**
 * 英語の画面に出す名前を入れる（2026-10-12）。
 *
 *   pnpm song-names            ボカロPの英語の名前のうちまだ無いものを聞き、名前の無い出し直しの版に元の曲の名前を借りる
 *   pnpm song-names --days 365 加えて、この 365 日に出た曲の英語の名前とローマ字を VocaDB に聞き直す
 *
 * --days は自動の取り込み（.github/workflows/ingest.yml）が月に1回走らせる。ボカロPの名前と版の名前は取り込みの最後にも入るので、
 * 手で走らせるのは、列を足した直後に取り込みを待たずに入れるときだけ。入れる先は DATABASE_URL
 */
import pg from 'pg';
import { scriptEnv } from './lib/env';
import { borrowVersionNames, fillEnglishProducerNames, refreshSongNames } from './lib/song-names';

async function main() {
  const at = process.argv.indexOf('--days');
  const days = at === -1 ? undefined : Number(process.argv[at + 1]);
  const pool = new pg.Pool({ connectionString: scriptEnv('DATABASE_URL') });
  try {
    if (days !== undefined) {
      console.log(
        `この ${days} 日の曲の名前を ${await refreshSongNames(pool, days)} 曲書き換えました`,
      );
    }
    console.log(`ボカロPの英語の名前を ${await fillEnglishProducerNames(pool)} 件入れました`);
    console.log(`出し直しの版に元の曲の名前を ${await borrowVersionNames(pool)} 曲借りました`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
