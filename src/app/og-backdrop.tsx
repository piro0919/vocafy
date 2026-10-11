/* eslint-disable @next/next/no-img-element -- 共有の絵を作る仕組み（next/og）は <img> しか読まない */
import { COLORS } from '@/lib/colors';

/** 共有の絵の部品。サイト全体の絵（opengraph-image.tsx）とボカロP・曲の絵（producers/[id]/og.tsx）で使う */

export const OG_SIZE = { width: 1200, height: 630 };

/** 字と線の色。地はアイコンと同じ明るい灰色（2026-10-11 に暗い地と見比べて決めた。看板の絵とそろえる） */
export const OG_COLORS = {
  bg: COLORS.iconBg,
  ink: COLORS.ink,
  muted: COLORS.muted,
  accent: COLORS.accentLight,
};

/** 表紙と顔の画像の影 */
export const OG_SHADOW = '0 20px 48px rgba(16,24,26,0.18)';

/**
 * Google Fonts から、text の文字だけを抜いて取る。ボカロPの名前はどんな字でも来るので、抜いた字を手元に置いておけない。
 * User-Agent を付けずに聞くと、絵を作る仕組み（Satori）が読める TrueType で返る（woff2 は読めない）
 */
export async function googleFont(
  family: string,
  weight: number,
  text: string,
): Promise<ArrayBuffer> {
  const css = await (
    await fetch(
      `https://fonts.googleapis.com/css2?family=${family.replaceAll(' ', '+')}:wght@${weight}&text=${encodeURIComponent(text)}`,
    )
  ).text();
  const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
  if (!url) throw new Error(`${family} を取れませんでした`);
  return (await fetch(url)).arrayBuffer();
}

/** サイトの地の方眼（ambient.tsx）と同じ模様。マスは 30px、4マスごとに濃い線。左下を濃く、右上へ向かって消す */
function grid() {
  const { width: w, height: h } = OG_SIZE;
  const cell = 30;
  const lines: string[] = [];
  for (let x = cell; x < w; x += cell) {
    const major = x % (cell * 4) === 0;
    lines.push(
      `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke-opacity="${major ? 0.09 : 0.045}"/>`,
    );
  }
  for (let y = h - cell; y > 0; y -= cell) {
    const major = (h - y) % (cell * 4) === 0;
    lines.push(
      `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke-opacity="${major ? 0.09 : 0.045}"/>`,
    );
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
<defs><linearGradient id="f" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#fff"/><stop offset="0.65" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="m"><rect width="${w}" height="${h}" fill="url(#f)"/></mask></defs>
<g mask="url(#m)" stroke="${OG_COLORS.ink}" stroke-width="1.5">${lines.join('')}</g></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/** 右上に置く、ピアノロールの音符の棒。方眼のマスに乗せる */
const NOTES = [
  { x: 690, y: 60, w: 120 },
  { x: 840, y: 30, w: 60 },
  { x: 930, y: 90, w: 150 },
  { x: 1110, y: 60, w: 60 },
];

/** 地の方眼と音符の棒。絵の一番外の div（position: relative）の先頭に置く */
export function OgBackdrop() {
  return (
    <>
      <img
        src={grid()}
        width={OG_SIZE.width}
        height={OG_SIZE.height}
        alt=""
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
      {NOTES.map((n) => (
        <div
          key={n.x}
          style={{
            position: 'absolute',
            left: n.x,
            top: n.y + 3,
            width: n.w - 3,
            height: 24,
            borderRadius: 6,
            background: COLORS.miku,
            opacity: 0.35,
          }}
        />
      ))}
    </>
  );
}
