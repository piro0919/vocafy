import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';
import tailwind from 'eslint-plugin-tailwindcss';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  // Tailwind のクラスの決まり（2026-10-11 に本人と決めた）。[...] に値をじかに書かず、globals.css の @theme に名前を付けて使う。
  // 数字をその場で書くと、同じ寸法があちこちで少しずつずれた。文字列の定数（button-styles.ts など）はこの検査に掛からないので、
  // test/design-rules.test.ts でも見る
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { tailwindcss: tailwind },
    settings: { tailwindcss: { cssConfigPath: 'src/app/globals.css' } },
    rules: {
      'tailwindcss/no-arbitrary-value': 'error',
      'tailwindcss/no-custom-classname': [
        'error',
        // globals.css に自前で書いたクラス
        {
          whitelist: [
            'logo',
            'chrome-header',
            'chrome-tabs',
            'chrome-bottom',
            'chrome-bar',
            'page-bottom',
          ],
        },
      ],
    },
  },
  // データ集めのスクリプトは Wikipedia・YouTube・Notion の応答をそのまま扱うので、型を緩める
  {
    files: ['scripts/**'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    // E2E のビルド（playwright.config.ts）
    '.next-e2e/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // 別のセッションの作業用のコピー（git worktree）。読むと同じコードを二重に見て、数万件のエラーになる
    '.claude/**',
    '.playwright-mcp/**',
  ]),
]);

export default eslintConfig;
