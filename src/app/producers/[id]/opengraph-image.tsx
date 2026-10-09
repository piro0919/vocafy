import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { findProducer } from '@/lib/catalog';
import { formatCount } from '@/lib/format';

export const alt = 'Vocafy のボカロPの画面';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// ボカロPの画面と同じく、配備まで作り置く。絵を作るのは SNS が共有されたリンクを読みに来たときだけで、
// 同じ人の2回目からは作らない（関数も DB も動かない）
export const revalidate = false;

// ボカロPの画面と同じく、ビルドのときには作らず最初に読まれたときに作る。これが無いと、開くたびに作る扱いになった
export function generateStaticParams() {
  return [];
}

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

/** ボカロPの画面を共有したときの絵。左に本人の画像、右に名前と曲数。地と色は共通の絵と同じ */
export default async function OpengraphImage({ params }: { params: Promise<{ id: string }> }) {
  const found = await findProducer(Number((await params).id));
  const name = found?.producer.name ?? 'Vocafy';
  const picture = found?.producer.picture ?? null;
  const count = `${formatCount(found?.songs.length ?? 0)} 曲`;
  const caption = 'の曲を、まとめて聴ける。';
  const font = await notoSansJp(`${name}${count}${caption}`);
  const nameSize = name.length > 14 ? 64 : name.length > 8 ? 84 : 104;

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
          <div style={{ display: 'flex', fontSize: nameSize, lineHeight: 1.15 }}>{name}</div>
          <div style={{ display: 'flex', fontSize: 34, color: '#5d6f73' }}>
            {caption}
            <span style={{ marginLeft: 16, color: '#0b7770' }}>{count}</span>
          </div>
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
      ...size,
      fonts: [
        { name: 'Noto Sans JP', data: font, weight: 700 },
        { name: 'Orbitron', data: logoFont, weight: 900 },
      ],
    },
  );
}
