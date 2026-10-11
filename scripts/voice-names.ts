/**
 * 歌声の英語の名前の表（src/lib/voice-names-en.ts）を書き出す。英語の画面で、日本語の名前の代わりに出す（2026-10-12 に本人と決めた）。
 * 曲名・ボカロP名は英語の画面でも日本語のままだが、歌声はキャラの公式の英語表記（Hatsune Miku など）があるので訳す。
 *
 * 画面に出す歌声の名前は、キャラごとにまとめた元の歌声の名前（catalog.ts の VOCALIST_NAMES）なので、その名前ごとに
 * VocaDB の英語の名前を聞く。日本語の字を含む名前だけを聞く（GUMI・IA のように英字の名前は、そのまま出せば足りる）。
 * 表を DB に持たないのは、お気に入りや再生の控えが曲の情報を名前の文字列ごとブラウザに残していて、表で引き直せば
 * 控えの名前も英語にできるため。
 *
 * 表に無い歌声（取り込みで新しく入った歌声など）は、英語の画面でも日本語のまま出る。歌声が増えたら `pnpm voice-names` で書き出し直す。
 * 手元の DB（DATABASE_URL）を読み、VocaDB には名前1つにつき1回聞く（2026-10-12 は 519 回）
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import pg from 'pg';
import { scriptEnv } from './lib/env';
import { voicebankEnglishName } from './lib/vocadb';

const OUT = 'src/lib/voice-names-en.ts';
const JAPANESE = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;
const unknown = (name: string) => name.replace(/ \(Unknown\)$/, '');

async function main() {
  const pool = new pg.Pool({ connectionString: scriptEnv('DATABASE_URL') });
  const { rows } = await pool.query<{ id: number; name: string }>(
    `select b.id, b.name from vocalist b
     where b.id in (select coalesce(v.base_id, v.id) from vocalist v)
     order by b.id`,
  );
  await pool.end();

  const targets = rows.filter((r) => JAPANESE.test(r.name));
  console.log(`日本語の名前の歌声: ${targets.length} 件`);

  const table = new Map<string, string>();
  for (const [i, r] of targets.entries()) {
    const ja = unknown(r.name);
    const en = unknown(await voicebankEnglishName(r.id));
    // 英語の名前が無い歌声は、VocaDB が日本語の名前を返す
    if (en !== ja && !JAPANESE.test(en)) table.set(ja, en);
    if ((i + 1) % 50 === 0) console.log(`  ${i + 1} / ${targets.length}`);
  }

  const entries = [...table].sort(([a], [b]) => a.localeCompare(b, 'ja'));
  writeFileSync(
    OUT,
    [
      '// pnpm voice-names で書き出した表。手で直さない（scripts/voice-names.ts）',
      '/** 歌声の日本語の名前（画面に出す名前）から、英語の名前を引く */',
      'export const VOICE_NAMES_EN: Readonly<Record<string, string>> = {',
      ...entries.map(([ja, en]) => `  ${JSON.stringify(ja)}: ${JSON.stringify(en)},`),
      '};',
      '',
    ].join('\n'),
  );
  // 引用符の要らない鍵（ずんだもん など）は整形が引用符を外すので、書き出したあとに整形をかけてそろえる
  execFileSync('pnpm', ['exec', 'prettier', '--write', OUT]);
  console.log(`${OUT} に ${entries.length} 件を書き出しました`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
