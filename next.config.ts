import type { NextConfig } from 'next';
// 環境変数を確かめる。欠けていればビルドの頭で止まる
import './src/env';

const nextConfig: NextConfig = {
  // E2E のビルドは別のフォルダに作る（playwright.config.ts が NEXT_DIST_DIR を渡す）。同じ .next に作ると、
  // 手元で動かしている開発サーバーの作業用のファイルを上書きし、E2E のたびに開発サーバーを止めることになった
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  // スマホから手元の開発サーバーを開くため（http://MacBook-Pro.local:3100 のように Mac の名前で開く）。
  // 開発サーバーは、localhost 以外から開かれると画面を動かす部品を渡さない
  allowedDevOrigins: ['*.local'],
  // 共有の絵（producers/[id]/og.tsx）が読むキャラの影絵。読むファイルの名前が曲ごとに変わり、自動では関数に含まれないので名指しする
  outputFileTracingIncludes: {
    '/[lang]/producers/**': ['src/assets/silhouettes/*.png'],
  },
  images: {
    // 変換した画像の作り置きの期限。既定の4時間だと、期限が切れた画像が見られるたびに変換し直し、そのたびに料金がかかる。
    // 変換しているのはボカロPの画像（VocaDB。差し替わると住所の ?v= が変わる）と、背景の色を取るためのニコニコの表紙だけで、
    // 中身は変わらないので、Vercel が作り置きを残す上限の31日にする。動画の表紙は変換していない（fade-image.tsx）
    minimumCacheTTL: 31 * 24 * 60 * 60,
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/vi/**' },
      // ニコニコの表紙。YouTube に本家が無い曲だけ使う
      { protocol: 'https', hostname: 'nicovideo.cdn.nimg.jp', pathname: '/thumbnails/**' },
      // ボカロPの画像（VocaDB）
      { protocol: 'https', hostname: 'static.vocadb.net', pathname: '/img/**' },
    ],
  },
  // 日本語の住所（頭に言語の付かない住所）を、ページのある `app/[lang]` の `/ja/...` につなぐ（src/i18n/config.ts）。
  // afterFiles なので、public のファイル・アイコンやサイトマップのような決まった住所は先に当たり、ここには来ない。
  // [lang] は動く住所なのでここより後に当たる。英語（/en）と、中の住所（/ja）と、API はつながない。
  // トップ（/）は proxy.ts が日付と時のページへ送る
  rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        {
          source: '/:path((?!(?:en|ja)(?:/|$)|api/|search-index(?:/|$)|_next/).+)',
          destination: '/ja/:path',
        },
      ],
      fallback: [],
    };
  },
  redirects() {
    return [
      // 中の住所（/ja/...）を直に開かれたら、頭に言語の付かない住所へ送る。共有の絵（opengraph-image）だけは、
      // Next.js がページの中に /ja/... の住所で書き出すので送らない
      { source: '/ja', destination: '/', permanent: true },
      {
        source: '/ja/:path((?!.*opengraph-image).*)',
        destination: '/:path',
        permanent: true,
      },
      // あいうえお順の行の画面。2026-10-10 に外した（行が3千曲あって探す役に立たず、眺める入口はほかにある）ので、トップへ送る
      { source: '/kana/:rest*', destination: '/', permanent: true },
      { source: '/en/kana/:rest*', destination: '/en', permanent: true },
      // 年の全曲を300曲ずつに分けていたころのページ（/years/2010/2）。2026-10-10 に年の画面を月ごとの代表曲にして無くなった。
      // 月の画面（/years/2010/03）は2桁なので、1桁の番号だけを送る（どの年も 2,200 曲に届かず、ページは8まで）
      { source: '/years/:year/:page([1-9])', destination: '/years/:year', permanent: true },
      { source: '/en/years/:year/:page([1-9])', destination: '/en/years/:year', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // ほかのサイトの枠に入れさせない。YouTube のプレイヤーをこちらが枠に入れるのには関係しない
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // YouTube の埋め込みは、送り元が届かないと再生できない（エラー 153）。送り元を消す設定にしない
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
