import type { NextConfig } from 'next';
// 環境変数を確かめる。欠けていればビルドの頭で止まる
import './src/env';

const nextConfig: NextConfig = {
  images: {
    // 変換した画像の作り置きの期限。既定の4時間だと、期限が切れた画像が見られるたびに変換し直し、そのたびに料金がかかる。
    // 変換しているのはボカロPの画像（VocaDB。差し替わると住所の ?v= が変わる）と、背景の色を取るためのニコニコの表紙だけで、
    // 中身は変わらないので、Vercel が作り置きを残す上限の31日にする。動画の表紙は変換していない（fade-image.tsx）
    minimumCacheTTL: 2678400,
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/vi/**' },
      // ニコニコの表紙。YouTube に本家が無い曲だけ使う
      { protocol: 'https', hostname: 'nicovideo.cdn.nimg.jp', pathname: '/thumbnails/**' },
      // ボカロPの画像（VocaDB）
      { protocol: 'https', hostname: 'static.vocadb.net', pathname: '/img/**' },
    ],
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
