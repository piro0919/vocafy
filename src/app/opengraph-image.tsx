import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { COLORS } from '@/lib/colors';

export const alt = 'Vocafy — ボカロ曲を、ずっと聴ける。';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// アイコンは src/assets/icon-source.png（ChatGPT で生成した、跳ねるデフォルメの初音ミクの影絵）を縮めたもの。地色もアイコンの明るい灰色（COLORS.iconBg）に合わせる
const icon = `data:image/png;base64,${await readFile(join(process.cwd(), 'src/app/icon.png'), 'base64')}`;
// Noto Sans JP の太字から、この絵で使う文字だけを抜いたもの（Google Fonts の text= で取得）。
// 題字を変えて文字が増えたら取り直す。無い文字は豆腐になる
const font = await readFile(join(process.cwd(), 'src/assets/noto-sans-jp-700-og.ttf'));
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
        alignItems: 'center',
        // アイコンと文字のまとまりを、絵の真ん中に置く（左から 80px に置いていたら、左に寄って見えた）
        justifyContent: 'center',
        gap: 48,
        padding: '0 80px',
        background: COLORS.iconBg,
        color: COLORS.ink,
        fontFamily: 'Noto Sans JP',
      }}
    >
      <img src={icon} width={260} height={260} alt="" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Orbitron',
            fontWeight: 900,
            fontSize: 120,
          }}
        >
          Voca<span style={{ color: COLORS.accentLight }}>fy</span>
        </div>
        <div style={{ fontSize: 34, color: COLORS.muted }}>ボカロ曲を、ずっと聴ける。</div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'Noto Sans JP', data: font, weight: 700 },
        { name: 'Orbitron', data: logoFont, weight: 900 },
      ],
    },
  );
}
