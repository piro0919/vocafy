import type pg from 'pg';
import { voicebankEnglishName } from './vocadb';

/** 日本語の字（かな・漢字）を含む名前。英字の名前（GUMI・IA など）は、英語の画面でもそのまま出せば足りる */
const JAPANESE = '[ぁ-んァ-ヶ一-龠]';
const unknown = (name: string) => name.replace(/ \(Unknown\)$/, '');

/**
 * 歌声の英語の名前（vocalist.name_en）のうち、まだ無いものを VocaDB に聞いて入れる（2026-10-12）。英語の画面で、
 * 日本語の名前の代わりに出す。画面に出す歌声の名前は、キャラごとにまとめた元の歌声の名前（catalog.ts の VOCALIST_NAMES）なので、
 * 元の歌声のうち日本語の名前のものだけを聞く。取り込み（ingest.ts）の最後に呼ぶので、新しく入った歌声も次の配備で英語になる。
 * 英語の名前が無い歌声は VocaDB が日本語の名前を返すので、それをそのまま入れる（毎回聞き直さないため。画面には日本語のまま出る）。
 * 聞く回数は、まだ無い歌声の数（初めは 519 回、以降は新しく入った歌声の分だけ）
 */
export async function fillEnglishVoiceNames(db: pg.Pool | pg.PoolClient): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    `select b.id from vocalist b
     where b.id in (select coalesce(v.base_id, v.id) from vocalist v)
       and b.name ~ $1 and b.name_en is null
     order by b.id`,
    [JAPANESE],
  );
  const names: { id: number; name_en: string }[] = [];
  for (const { id } of rows) names.push({ id, name_en: unknown(await voicebankEnglishName(id)) });
  if (names.length === 0) return 0;
  await db.query(
    `update vocalist set name_en = x.name_en
     from jsonb_to_recordset($1) as x(id integer, name_en text)
     where vocalist.id = x.id`,
    [JSON.stringify(names)],
  );
  return names.length;
}
