// DB を読むのはサーバーだけ
import 'server-only';
import { unstable_cache } from 'next/cache';
import type { Lang } from '@/i18n/config';
import { db } from './db';
import type { ProducerNames } from './producer-name';

// 配備ごとに作り直す（voice-names.ts と同じ）
const DEPLOYMENT = process.env.VERCEL_DEPLOYMENT_ID ?? 'local';

/**
 * ボカロPの英語の名前の表（producer.name_en。取り込みの最後に VocaDB から入れる。scripts/lib/song-names.ts）。
 * 日本語の名前と同じものと、日本語の字が残るもの（英語の名前もローマ字も無い人）は入れない。DB を読むのは配備ごとに1回だけ
 */
export async function loadEnglishProducerNames(): Promise<ProducerNames> {
  const { rows } = await db().query<{ id: number; name_en: string }>(
    `select id, name_en from producer
       where name_en is not null and name_en <> name and name_en !~ '[ぁ-んァ-ヶ一-龠]'`,
  );
  return Object.fromEntries(rows.map((r) => [r.id, r.name_en]));
}

/** 画面に渡す表。検索の索引（配備のときに1回だけ作る）は、作り置きを通さず loadEnglishProducerNames を読む */
const englishProducerNames = unstable_cache(loadEnglishProducerNames, [
  'producer-names-en',
  DEPLOYMENT,
]);

/** その言語の画面でボカロPの名前を引く表。日本語の画面は名前をそのまま出すので null */
export async function producerNamesFor(lang: Lang): Promise<ProducerNames | null> {
  return lang === 'en' ? englishProducerNames() : null;
}
