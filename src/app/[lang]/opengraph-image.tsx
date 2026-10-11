import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { OG_COLORS, OG_SIZE, OgBackdrop } from './og-backdrop';

export const alt = 'Vocafy — ボカロ曲を、ずっと聴ける。';
export const size = OG_SIZE;
export const contentType = 'image/png';

// 跳ねるデフォルメの初音ミクの影絵。地のタイルの無いロゴ（public/logo-mark.png）を使い、後ろの方眼を見せる。地色はアイコンの明るい灰色
const logoMark = `data:image/png;base64,${await readFile(join(process.cwd(), 'public/logo-mark.png'), 'base64')}`;
// M PLUS Rounded 1c の太字（サイトの見出しと同じ字）から、この絵で使う文字だけを抜いたもの（Google Fonts の text= で取得）。
// 題字を変えて文字が増えたら取り直す。無い文字は豆腐になる
const font = await readFile(join(process.cwd(), 'src/assets/mplus-rounded-700-og.ttf'));
// ロゴの字（Orbitron 900）から「Vocafy」の6文字だけを抜いたもの（Google Fonts の text= で取得）。
// サイトのロゴ（nav.tsx・globals.css の .logo）と同じ字
const logoFont = await readFile(join(process.cwd(), 'src/assets/orbitron-900-og.ttf'));

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        background: OG_COLORS.bg,
        color: OG_COLORS.ink,
        fontFamily: 'Rounded',
      }}
    >
      <OgBackdrop notes />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          // アイコンと文字のまとまりを、絵の真ん中に置く（左から 80px に置いていたら、左に寄って見えた）
          justifyContent: 'center',
          gap: 48,
          width: '100%',
          padding: '0 80px',
        }}
      >
        <img src={logoMark} width={285} height={240} alt="" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              fontFamily: 'Orbitron',
              fontWeight: 900,
              fontSize: 120,
            }}
          >
            Voca<span style={{ color: OG_COLORS.accent }}>fy</span>
          </div>
          <div style={{ fontSize: 34, color: OG_COLORS.muted }}>ボカロ曲を、ずっと聴ける。</div>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'Rounded', data: font, weight: 700 },
        { name: 'Orbitron', data: logoFont, weight: 900 },
      ],
    },
  );
}
