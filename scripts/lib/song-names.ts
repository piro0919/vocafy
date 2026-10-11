import type pg from 'pg';
import { artistNames, songsPublishedAfter, type VdbSong } from './vocadb';

/** VocaDB のその言語（Romaji・English）の名前。曲名と同じか、無ければ null */
export function nameIn(song: VdbSong, language: 'Romaji' | 'English'): string | null {
  const name = song.names?.find((n) => n.language === language)?.value;
  return name === undefined || name === song.name ? null : name;
}

/** 日本語の字（かな・漢字）を含む名前。英字の名前は、英語の画面でもそのまま出せば足りる */
const JAPANESE = '[ぁ-んァ-ヶ一-龠]';

/**
 * 名前の無い出し直しの版に、元の曲の英語の名前とローマ字を借りる（2026-10-12）。「ヴァンパイア -Hello ver.-」のように、
 * 版の曲名が元の曲名で始まるときだけ、元の名前に残りの部分を足す（Vampire -Hello ver.-）。名前の出どころは VocaDB のまま。
 * 取り込みは VocaDB の名前で毎回書き直すので、書いたあとに毎回借り直す
 */
export async function borrowVersionNames(db: pg.ClientBase | pg.Pool): Promise<number> {
  const { rowCount } = await db.query(
    `update song v set
       name_en = o.name_en || substr(v.name, length(o.name) + 1),
       romaji = o.romaji || substr(v.name, length(o.name) + 1)
     from song o
     where v.original_id = o.id and v.name_en is null and v.romaji is null
       and (o.name_en is not null or o.romaji is not null)
       and v.name <> o.name and starts_with(v.name, o.name)`,
  );
  return rowCount ?? 0;
}

/**
 * この days 日に出た曲の英語の名前とローマ字を VocaDB に聞き直す（2026-10-12）。名前は利用者があとから足すもので、
 * 新しい曲ほど空いている（2025 年の曲で半分ほど）。毎週の取り込みは 30 日分しか聞かないので、月に1回 1年分を聞いて、
 * あとから足された名前を拾う（.github/workflows/ingest.yml）。DB にある曲の名前だけを書き換え、曲は足さない。
 * 聞く回数は 1年分で約 190 回（VocaDB 全体で1週間に約 370 曲、1回に 100 曲）
 */
export async function refreshSongNames(db: pg.ClientBase | pg.Pool, days: number): Promise<number> {
  const after = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const names = (await songsPublishedAfter(after)).map((s) => ({
    id: s.id,
    romaji: nameIn(s, 'Romaji'),
    name_en: nameIn(s, 'English'),
  }));
  const { rowCount } = await db.query(
    `update song set romaji = x.romaji, name_en = x.name_en
     from jsonb_to_recordset($1) as x(id integer, romaji text, name_en text)
     where song.id = x.id and (song.romaji, song.name_en) is distinct from (x.romaji, x.name_en)`,
    [JSON.stringify(names)],
  );
  await borrowVersionNames(db);
  return rowCount ?? 0;
}

/**
 * 英語の画面に出すボカロPの名前（producer.name_en）のうち、まだ無いものを VocaDB に聞いて入れる（2026-10-12）。
 * 聞くのは、一覧に出る人（全曲を取った人）で、名前に日本語の字を含む人だけ。English の名前、無ければ Romaji の名前。
 * どちらも無い人は日本語の名前をそのまま入れる（毎回聞き直さないため）。取り込み（ingest.ts）の最後に呼ぶ。
 * 聞く回数は、まだ無い人の数（初めは 467 回ほど、以降は新しく入った人の分だけ）
 */
export async function fillEnglishProducerNames(db: pg.ClientBase | pg.Pool): Promise<number> {
  const { rows } = await db.query<{ id: number; name: string }>(
    `select id, name from producer where complete and name ~ $1 and name_en is null order by id`,
    [JAPANESE],
  );
  const filled: { id: number; name_en: string }[] = [];
  for (const { id, name } of rows) {
    const names = await artistNames(id);
    const pick = (language: string) => names.find((n) => n.language === language)?.value;
    filled.push({ id, name_en: pick('English') ?? pick('Romaji') ?? name });
  }
  if (filled.length === 0) return 0;
  await db.query(
    `update producer set name_en = x.name_en
     from jsonb_to_recordset($1) as x(id integer, name_en text)
     where producer.id = x.id`,
    [JSON.stringify(filled)],
  );
  return filled.length;
}
