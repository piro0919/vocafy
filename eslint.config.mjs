import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';
import magicNumbers from '@piro0919/eslint-config';
import tailwind from '@piro0919/eslint-config/tailwind';
import hollowTests from 'eslint-plugin-hollow-tests';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  // 決まりは全リポジトリで共有する（piro0919/eslint-config）。[...] に値をじかに書かず、globals.css の @theme に名前を付けて使う。
  // 文字列の定数（button-styles.ts など）はこの検査に掛からないので、test/design-rules.test.ts でも見る
  ...tailwind({
    cssConfigPath: 'src/app/globals.css',
    files: ['src/**/*.{ts,tsx}'],
    level: 'error',
    // globals.css に自前で書いたクラス
    whitelist: [
      'logo',
      'chrome-header',
      'chrome-tabs',
      'chrome-bottom',
      'chrome-bar',
      'page-bottom',
    ],
  }),
  // データ集めのスクリプトは Wikipedia・YouTube・Notion の応答をそのまま扱うので、型を緩める
  {
    files: ['scripts/**'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  // 名前の無い数字を落とす（piro0919/eslint-config）。VocaDB の番号の表と、CSS を使わずに描く共有の絵は除く
  ...magicNumbers({
    files: ['src/**/*.{ts,tsx}'],
    level: 'error',
    ignores: [
      'src/lib/voice-art.ts',
      'src/app/\\[lang\\]/opengraph-image.tsx',
      'src/app/\\[lang\\]/og-backdrop.tsx',
      'src/app/\\[lang\\]/producers/\\[id\\]/og.tsx',
    ],
  }),
  // Chrome 110 より前のブラウザに無い関数を使わない（Sentry の VOCAFY-9。QQ Browser で検索が toSorted で落ちた）。
  // ブラウザに配るかはファイルの場所で見分けにくいので、配列の関数は src の全体で止める。groupBy などはページ（サーバー）でだけ許す
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'MemberExpression[property.name=/^(toSorted|toReversed|toSpliced)$/]',
          message: '古いブラウザに無い。[...list].sort() などで書く',
        },
      ],
    },
  },
  {
    files: ['src/components/**/*.{ts,tsx}', 'src/lib/**/*.ts', 'src/i18n/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'MemberExpression[property.name=/^(toSorted|toReversed|toSpliced)$/]',
          message: '古いブラウザに無い。[...list].sort() などで書く',
        },
        {
          selector:
            'MemberExpression[object.name=/^(Map|Object|Promise)$/][property.name=/^(groupBy|withResolvers)$/]',
          message: '古いブラウザに無い',
        },
      ],
    },
  },
  // 何も確かめずに通るテスト（確かめる文が無い・条件の中にしか無い）を落とす（eslint-plugin-hollow-tests、2026-10-12）
  { ...hollowTests.configs.recommended, files: ['test/**/*.{ts,tsx}', 'e2e/**/*.ts'] },
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
