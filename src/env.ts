import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

/**
 * サイトが読む環境変数の検査。next.config.ts が読み込むので、欠けていればビルドの頭で止まる。
 * scripts/ の鍵は手元でしか使わないので、ここではなく scripts/lib/env.ts で確かめる
 */
export const env = createEnv({
  server: {
    // 曲の台帳。手元は compose.yaml の Postgres、本番は Neon（プールを通す接続文字列）
    DATABASE_URL: z.string().min(1),
  },
  client: {},
  runtimeEnv: { DATABASE_URL: process.env.DATABASE_URL },
  emptyStringAsUndefined: true,
});
