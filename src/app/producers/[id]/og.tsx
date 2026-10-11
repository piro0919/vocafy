/* eslint-disable @next/next/no-img-element -- 共有の絵を作る仕組み（next/og）は <img> しか読まない。opengraph-image.tsx の中なら注意は出ないが、ここは共用の関数なので明示する */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import type { findProducer, Song } from '@/lib/catalog';
import { formatCount } from '@/lib/format';
import { googleFont, OG_COLORS as T, OG_SHADOW, OG_SIZE, OgBackdrop } from '../../og-backdrop';

export { OG_SIZE };

const icon = `data:image/png;base64,${await readFile(join(process.cwd(), 'src/app/icon.png'), 'base64')}`;
const logoMark = `data:image/png;base64,${await readFile(join(process.cwd(), 'public/logo-mark.png'), 'base64')}`;

/**
 * YouTube の表紙のうち、ある中で一番大きいもの。maxresdefault（1280×720）は古い動画に無く、無いと 404 が返る。
 * sddefault・hqdefault は上下に黒い帯の付いた 4:3 なので、16:9 の枠に object-cover で収めて帯だけを切る（thumb.ts の smallThumbOf と同じ）
 */
async function youtubeCover(videoId: string): Promise<string> {
  for (const name of ['maxresdefault', 'sddefault']) {
    const url = `https://i.ytimg.com/vi/${videoId}/${name}.jpg`;
    if ((await fetch(url, { method: 'HEAD' })).ok) return url;
  }
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * ボカロPの画面を共有したときの絵。左に本人の画像、右に名前と曲数。
 * song を渡すと（曲を共有したとき）、名前の代わりに曲名を大きく出し、その下にボカロPの名前を添える。
 * YouTube の曲は、左に顔の画像の代わりに動画の表紙を出す（2026-10-11 に本人と決めた）。表紙には何も重ねず、切らずに横に並べる
 * （規約の III.I.4 が API で取れるものの改変を禁じていて、字を重ねる・ぼかすと当たると読める余地がある）。
 * ニコニコだけの曲は顔の画像のまま。表紙の9割が 130×100 で、大きく出すとぼやける
 */
export async function producerImage(
  found: Awaited<ReturnType<typeof findProducer>>,
  song?: Pick<Song, 'title' | 'youtubeId'>,
) {
  const name = found?.producer.name ?? 'Vocafy';
  const picture = found?.producer.picture ?? null;
  const count = `${formatCount(found?.songs.length ?? 0)}曲`;
  const big = song?.title ?? name;
  const sub = song ? name : `${count}を、まとめて聴ける。`;
  const eyebrow = song ? 'SONG' : 'PRODUCER';
  const cover = song?.youtubeId ? await youtubeCover(song.youtubeId) : null;
  const [display, body, tech] = await Promise.all([
    googleFont('M PLUS Rounded 1c', 800, big),
    googleFont('M PLUS Rounded 1c', 700, sub),
    googleFont('Orbitron', 900, `${eyebrow}Vocafy`),
  ]);
  // 字の大きさ。右の欄は幅 640px ほど（表紙のときも、表紙の幅を顔の画像に近づけてそろえた）
  const bigSize = big.length > 24 ? 52 : big.length > 14 ? 62 : big.length > 8 ? 76 : 96;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        background: T.bg,
        color: T.ink,
        fontFamily: 'Rounded',
      }}
    >
      <OgBackdrop />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 56,
          padding: '0 80px',
          width: '100%',
        }}
      >
        {cover ? (
          <img
            src={cover}
            width={352}
            height={198}
            alt=""
            style={{
              borderRadius: 16,
              objectFit: 'cover',
              boxShadow: OG_SHADOW,
            }}
          />
        ) : (
          <img
            src={picture ?? icon}
            width={300}
            height={300}
            alt=""
            style={{
              borderRadius: 9999,
              objectFit: 'cover',
              boxShadow: OG_SHADOW,
            }}
          />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              fontFamily: 'Orbitron',
              fontSize: 24,
              letterSpacing: 6,
              color: T.accent,
              marginBottom: 12,
            }}
          >
            {eyebrow}
          </div>
          <div style={{ display: 'flex', fontSize: bigSize, lineHeight: 1.2, letterSpacing: -1 }}>
            {big}
          </div>
          <div
            style={{
              display: 'flex',
              fontFamily: 'RoundedBody',
              fontSize: 36,
              color: song ? T.accent : T.muted,
              marginTop: 16,
            }}
          >
            {sub}
          </div>
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          right: 72,
          bottom: 56,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <img src={logoMark} width={67} height={56} alt="" style={{ objectFit: 'contain' }} />
        <div style={{ display: 'flex', fontFamily: 'Orbitron', fontSize: 44, color: T.ink }}>
          Voca<span style={{ color: T.accent }}>fy</span>
        </div>
      </div>
    </div>,
    {
      ...OG_SIZE,
      fonts: [
        { name: 'Rounded', data: display, weight: 800 },
        { name: 'RoundedBody', data: body, weight: 700 },
        { name: 'Orbitron', data: tech, weight: 900 },
      ],
    },
  );
}
