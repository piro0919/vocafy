import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'Vocafy — ボカロ曲を、ボカロPごとに聴ける。';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// アイコンは scripts/build-icons.py が書き出したもの（地は #0e0d12 に塗り直してある）。地色もアイコンに合わせる
const icon = `data:image/png;base64,${await readFile(join(process.cwd(), 'src/app/icon.png'), 'base64')}`;
// Noto Sans JP の太字から、この絵で使う文字だけを抜いたもの（Google Fonts の text= で取得）。
// 題字を変えて文字が増えたら取り直す。無い文字は豆腐になる
const font = await readFile(join(process.cwd(), 'src/assets/noto-sans-jp-700-og.ttf'));
// ロゴの字（Playfair Display の斜体 900）から「Vocafy」の6文字だけを抜いたもの（Google Fonts の text= で取得）。
// サイトのロゴ（nav.tsx・globals.css の .logo）と同じ字
const logoFont = await readFile(
  join(process.cwd(), 'src/assets/playfair-display-900-italic-og.ttf'),
);

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 48,
        padding: '0 80px',
        background: '#0e0d12',
        color: '#f3f2f7',
        fontFamily: 'Noto Sans JP',
      }}
    >
      <img src={icon} width={260} height={260} alt="" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Playfair Display',
            fontStyle: 'italic',
            fontWeight: 900,
            fontSize: 132,
            letterSpacing: -2,
          }}
        >
          Voca<span style={{ color: '#b69bff' }}>fy</span>
        </div>
        <div style={{ fontSize: 34, color: '#a3a0b0' }}>ボカロ曲を、ボカロPごとに聴ける。</div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'Noto Sans JP', data: font, weight: 700 },
        { name: 'Playfair Display', data: logoFont, weight: 900, style: 'italic' },
      ],
    },
  );
}
