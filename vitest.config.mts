import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // server-only はサーバーの外で読み込むと止まる。テストはサーバーの外で catalog.ts を読むので、中身の無い版に差し替える
      'server-only': fileURLToPath(new URL('./node_modules/server-only/empty.js', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    projects: [
      // DB の要らないテスト（pnpm test。push の前にも走る）
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['test/**/*.test.ts'],
          exclude: ['test/db/**'],
          // happy-dom を使うテスト（ファイルの頭の @vitest-environment happy-dom）で、外へ取りに行かない。
          // 埋め込み（iframe）の住所を付けると、そのままではニコニコや YouTube のページを本物から読み込もうとした
          environmentOptions: {
            happyDOM: {
              settings: {
                disableIframePageLoading: true,
                disableJavaScriptFileLoading: true,
                disableCSSFileLoading: true,
              },
            },
          },
        },
      },
      // DB を読むテスト（pnpm test:db）。テスト用の DB を作り直して使う（test/db/global-setup.ts）。
      // どのファイルも表を空にしてから自分の場面を入れるので、同時には走らせない
      {
        extends: true,
        test: {
          name: 'db',
          include: ['test/db/**/*.test.ts'],
          globalSetup: ['test/db/global-setup.ts'],
          setupFiles: ['test/db/env.ts'],
          fileParallelism: false,
        },
      },
    ],
  },
});
