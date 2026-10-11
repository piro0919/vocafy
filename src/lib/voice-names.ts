// DB を読むのはサーバーだけ
import 'server-only';
import { unstable_cache } from 'next/cache';
import type { Lang } from '@/i18n/config';
import { db } from './db';
import type { VoiceNames } from './voice-name';

// 配備ごとに作り直す（Vercel の Data cache は配備をまたいで残るので、鍵に配備の番号を入れる。home/[date]/[hour]/page.tsx と同じ）
const DEPLOYMENT = process.env.VERCEL_DEPLOYMENT_ID ?? 'local';

/**
 * 歌声の英語の名前の表（vocalist.name_en。取り込みの最後に VocaDB から入れる。scripts/lib/voice-names.ts）。
 * 英語の名前の無い歌声（VocaDB が日本語の名前を返したもの）は入れない。DB を読むのは配備ごとに1回だけ
 */
const englishNames = unstable_cache(async (): Promise<VoiceNames> => {
  const { rows } = await db().query<{ name: string; name_en: string }>(
    `select regexp_replace(name, ' \\(Unknown\\)$', '') as name, name_en from vocalist
       where name_en is not null and name_en !~ '[ぁ-んァ-ヶ一-龠]'`,
  );
  return Object.fromEntries(rows.map((r) => [r.name, r.name_en]));
}, ['voice-names-en', DEPLOYMENT]);

/** その言語の画面で歌声の名前を引く表。日本語の画面は名前をそのまま出すので null */
export async function voiceNamesFor(lang: Lang): Promise<VoiceNames | null> {
  return lang === 'en' ? englishNames() : null;
}
