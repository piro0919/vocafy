import { z } from 'zod';

/**
 * scripts/ が読む鍵。どれも .env.local に置く。
 * スクリプトごとに要る鍵が違うので、使う時点で1つずつ確かめる
 */
const SCHEMA = {
  // 取り込み先の DB。手元は compose.yaml の Postgres、本番は Neon
  DATABASE_URL: z.string().min(1),
  // YouTube Data API の鍵。再生数の線の種を選ぶのに使う（Google Cloud の vocafy プロジェクト。使える API は YouTube Data API v3 だけ）
  YOUTUBE_API_KEY: z.string().min(1),
} as const;

export function scriptEnv(name: keyof typeof SCHEMA): string {
  const result = SCHEMA[name].safeParse(process.env[name]);
  if (!result.success) throw new Error(`${name} が .env.local にありません`);
  return result.data;
}
