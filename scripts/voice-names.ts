/**
 * 歌声の英語の名前（vocalist.name_en）のうち、まだ無いものを VocaDB に聞いて入れる。ふだんは取り込み（ingest.ts）が最後に同じことをするので、
 * 手で走らせるのは、列を足した直後に取り込みを待たずに入れるときだけ（2026-10-12 に本番と手元の DB に入れた）。
 * 入れる先は DATABASE_URL（.env.local。本番に入れるときは本番の接続先を渡す）
 */
import pg from 'pg';
import { scriptEnv } from './lib/env';
import { fillEnglishVoiceNames } from './lib/voice-names';

async function main() {
  const pool = new pg.Pool({ connectionString: scriptEnv('DATABASE_URL') });
  try {
    console.log(`歌声の英語の名前を ${await fillEnglishVoiceNames(pool)} 件入れました`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
