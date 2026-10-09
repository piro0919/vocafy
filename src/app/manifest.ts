import type { MetadataRoute } from 'next';

/**
 * ホーム画面に置いたときの姿。`display: standalone` でブラウザの URL 欄が消える。
 * `id` を固定しておく。`start_url` を後から変えると別のアプリとして扱われ、入れた人の手元に古い方が残る。
 * アイコンはツインテールが端近くまで伸びていて、丸く切り抜く端末で欠けるので maskable にはしない。
 * 地の色はアイコンの明るい灰色にそろえる（開いた直後の一瞬に出る色）
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Vocafy',
    short_name: 'Vocafy',
    description: 'ボカロ曲を、ずっと聴ける。',
    lang: 'ja',
    scope: '/',
    start_url: '/',
    display: 'standalone',
    background_color: '#ecf0f2',
    theme_color: '#ecf0f2',
    icons: [
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
