/**
 * 手元で走らせる速度と品質の計測（koidamashii・comic-time と同じ形）。
 * `pnpm lighthouse` で本番ビルドを立ち上げ、主な4画面を3回ずつ測る。
 * 結果は .lighthouseci に書き出すだけで、どこへも送らない。
 *
 * 検索・ライブラリ・設定の画面は検索エンジンに載せない（noindex）ので、SEO の採点が必ず落ちる。測らない。
 * アルバムとアーティストの id は Notion のページの id で、書き出し直しても変わらない
 */
const port = 3200;
const base = `http://localhost:${port}`;

module.exports = {
  ci: {
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
      },
    },
    collect: {
      numberOfRuns: 3,
      startServerCommand: `pnpm exec next start -p ${port}`,
      url: [`${base}/`, `${base}/producers`, `${base}/producers/45`],
    },
    upload: {
      outputDir: './.lighthouseci',
      target: 'filesystem',
    },
  },
};
