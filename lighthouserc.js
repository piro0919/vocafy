/**
 * 速度と品質の計測（koidamashii・comic-time と同じ形）。CI（ci.yml の lighthouse）でも手元でも、
 * `pnpm lighthouse` で本番ビルドを立ち上げ、トップ・ボカロPの一覧・ボカロPの画面を3回ずつ測る。
 * 結果は .lighthouseci に書き出すだけで、どこへも送らない（CI は artifact に上げる）。
 *
 * お気に入り・履歴・設定・再生用の画面は検索エンジンに載せない（noindex）ので、SEO の採点が必ず落ちる。測らない。
 * ボカロPの 45 は DECO＊27 で、CI の小さな台帳（db/fixture.sql）にもいる
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
