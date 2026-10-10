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
  redirects() {
    return [
      // あいうえお順の行の画面。2026-10-10 に外した（行が3千曲あって探す役に立たず、眺める入口はほかにある）ので、トップへ送る
      { source: '/kana/:rest*', destination: '/', permanent: true },
      // 年の全曲を300曲ずつに分けていたころのページ（/years/2010/2）。2026-10-10 に年の画面を月ごとの代表曲にして無くなった。
      // 月の画面（/years/2010/03）は2桁なので、1桁の番号だけを送る（どの年も 2,200 曲に届かず、ページは8まで）
      { source: '/years/:year/:page([1-9])', destination: '/years/:year', permanent: true },
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
