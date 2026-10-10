/* eslint-disable @next/next/no-img-element -- 共有の絵を作る仕組み（next/og）は <img> しか読まない。opengraph-image.tsx の中なら注意は出ないが、ここは共用の関数なので明示する */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import type { findProducer } from '@/lib/catalog';
import { formatCount } from '@/lib/format';

export const OG_SIZE = { width: 1200, height: 630 };

const icon = `data:image/png;base64,${await readFile(join(process.cwd(), 'src/app/icon.png'), 'base64')}`;
const logoFont = await readFile(join(process.cwd(), 'src/assets/orbitron-900-og.ttf'));

/**
 * Noto Sans JP の太字から、text の文字だけを Google Fonts で抜いて取る。ボカロPの名前はどんな字でも来るので、
 * 共通の絵（src/app/opengraph-image.tsx）のように抜いた字を手元に置いておけない。
 * User-Agent を付けずに聞くと、絵を作る仕組み（Satori）が読める TrueType で返る（woff2 は読めない）
 */
async function notoSansJp(text: string): Promise<ArrayBuffer> {
  const css = await (
    await fetch(
      `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=${encodeURIComponent(text)}`,
    )
  ).text();
  const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
  if (!url) throw new Error('Noto Sans JP を取れませんでした');
  return (await fetch(url)).arrayBuffer();
}

/**
 * ボカロPの画面を共有したときの絵。左に本人の画像、右に名前と曲数。地と色は共通の絵と同じ。
 * song を渡すと（曲を共有したとき）、名前の代わりに曲名を大きく出し、その下にボカロPの名前を添える。
 * 動画の表紙は使わない（YouTube の規約で、表紙を別の絵に組み込むのは改変にあたるおそれがある）
 */
export async function producerImage(
  found: Awaited<ReturnType<typeof findProducer>>,
  song?: { title: string },
) {
  const name = found?.producer.name ?? 'Vocafy';
  const picture = found?.producer.picture ?? null;
  const count = `${formatCount(found?.songs.length ?? 0)}曲`;
  const caption = 'の曲を、まとめて聴ける。';
  const big = song?.title ?? name;
  const font = await notoSansJp(song ? `${big}${name}` : `${name}${count}${caption}`);
  // 字の大きさ。右の欄は幅 680px ほど。曲名は名前より長いことが多いので、一段小さめに決める（9字の曲名が 84px だと最後の1字だけ次の行に落ちた）
  const bigSize = song
    ? big.length > 24
      ? 52
      : big.length > 14
        ? 60
        : big.length > 7
          ? 72
          : 96
    : big.length > 14
      ? 64
      : big.length > 8
        ? 84
        : 104;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 80px',
        background: '#ecf0f2',
        color: '#10181a',
        fontFamily: 'Noto Sans JP',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 56, flex: 1 }}>
        {picture ? (
          <img
            src={picture}
            width={300}
            height={300}
            alt=""
            style={{ borderRadius: 9999, objectFit: 'cover', border: '8px solid #39c5bb' }}
          />
        ) : (
          <img src={icon} width={300} height={300} alt="" />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', fontSize: bigSize, lineHeight: 1.15 }}>{big}</div>
          {song ? (
            <div style={{ display: 'flex', fontSize: 40, color: '#0b7770' }}>{name}</div>
          ) : (
            <div style={{ display: 'flex', fontSize: 34, color: '#5d6f73' }}>
              {caption}
              <span style={{ marginLeft: 16, color: '#0b7770' }}>{count}</span>
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, alignSelf: 'flex-end' }}>
        <img src={icon} width={64} height={64} alt="" />
        <div style={{ display: 'flex', fontFamily: 'Orbitron', fontWeight: 900, fontSize: 48 }}>
          Voca<span style={{ color: '#0b7770' }}>fy</span>
        </div>
      </div>
    </div>,
    {
      ...OG_SIZE,
      fonts: [
        { name: 'Noto Sans JP', data: font, weight: 700 },
        { name: 'Orbitron', data: logoFont, weight: 900 },
      ],
    },
  );
}
