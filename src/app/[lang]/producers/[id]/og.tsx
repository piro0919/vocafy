/* eslint-disable @next/next/no-img-element -- 共有の絵を作る仕組み（next/og）は <img> しか読まない。opengraph-image.tsx の中なら注意は出ないが、ここは共用の関数なので明示する */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import type { Lang } from '@/i18n/config';
import { defineText } from '@/i18n/text';
import type { findProducer, Song } from '@/lib/catalog';
import { formatCount } from '@/lib/format';
import { voiceArtIdByName } from '@/lib/voice-art';
import { favoriteSinger, singerLayout } from './og-layout';
import { googleFont, OG_COLORS as T, OG_SHADOW, OG_SIZE, OgBackdrop } from '../../og-backdrop';

export { OG_SIZE };

const icon = `data:image/png;base64,${await readFile(join(process.cwd(), 'src/app/icon.png'), 'base64')}`;
const logoMark = `data:image/png;base64,${await readFile(join(process.cwd(), 'public/logo-mark.png'), 'base64')}`;

/** 名前の下に添える文。曲名・ボカロP名はどちらの言語でもそのまま出す */
const TEXT = defineText({
  ja: { listen: (n: string) => `${n}曲を、まとめて聴ける。` },
  en: { listen: (n: string) => (n === '1' ? 'Listen to 1 song.' : `Listen to all ${n} songs.`) },
});

type Art = { src: string; width: number; height: number };

/**
 * 歌っているキャラのうち、絵のある人を名前の出てくる順に2人まで（画面の影絵 singer-silhouette.tsx と同じ順）。
 * 影絵は青緑で塗った PNG（src/assets/silhouettes。scripts/silhouettes.ts で書き出す）。縦横は PNG の頭の 16〜23 バイト目
 */
async function singerArts(vocalists: string[]): Promise<Art[]> {
  const ids = [
    ...new Set(vocalists.map((v) => voiceArtIdByName(v.trim())).filter((id) => id !== null)),
  ].slice(0, 2);
  return Promise.all(
    ids.map(async (id) => {
      const file = await readFile(join(process.cwd(), 'src/assets/silhouettes', `${id}.png`));
      return {
        src: `data:image/png;base64,${file.toString('base64')}`,
        width: file.readUInt32BE(16),
        height: file.readUInt32BE(20),
      };
    }),
  );
}

/** ボカロPの絵に出すキャラ（og-layout.ts の favoriteSinger）。名前の配列で返す（曲の絵と同じく singerArts に渡す） */
function favoriteSingers(songs: Pick<Song, 'vocalists'>[]): string[] {
  const top = favoriteSinger(songs, (v) => voiceArtIdByName(v.trim()) !== null);
  return top ? [top] : [];
}

/**
 * 影絵（1人か2人）を1枚の SVG にまとめ、まとめたものを薄くする。1枚ずつ薄くすると、重なった所だけ濃くなる。
 * 並べ方は og-layout.ts の singerLayout。2人目を先に描いて、1人目の後ろに回す
 */
function singersImage(arts: Art[]): { src: string; width: number; height: number } | null {
  const layout = singerLayout(arts);
  if (!layout) return null;
  const { width, height, placements } = layout;
  const image = (a: Art, { x, width: w }: { x: number; width: number }) =>
    `<image xlink:href="${a.src}" x="${x}" y="0" width="${w}" height="${height}"/>`;
  const drawn = arts
    .map((a, i) => image(a, placements[i]!))
    .toReversed()
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}">
<g opacity="0.22">${drawn}</g></svg>`;
  return { src: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`, width, height };
}

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
 * ニコニコの表紙の大きい版（末尾に .L を付けた 360×270。上下に黒い帯の付いた 4:3 で、帯を切ると表紙の枠とほぼ同じ大きさ）。
 * 2012年ごろより前の動画には無く 404 が返るので、そのときは null（顔の画像に戻す）。2026-10-12 に202曲を抜き取って調べ、
 * 2011年までは52曲中1曲、2012年からは150曲中148曲で取れた
 */
async function niconicoCover(thumb: string): Promise<string | null> {
  const url = `${thumb}.L`;
  return (await fetch(url, { method: 'HEAD' })).ok ? url : null;
}

/**
 * ボカロPの画面を共有したときの絵。左に本人の画像、右に名前と曲数。
 * song を渡すと（曲を共有したとき）、名前の代わりに曲名を大きく出し、その下にボカロPの名前を添える。
 * YouTube の曲は、左に顔の画像の代わりに動画の表紙を出す（2026-10-11 に本人と決めた）。表紙には何も重ねず、切らずに横に並べる
 * （規約の III.I.4 が API で取れるものの改変を禁じていて、字を重ねる・ぼかすと当たると読める余地がある）。
 * ニコニコだけの曲は、大きい版の表紙（niconicoCover）がある曲だけ表紙を出し、無い曲は顔の画像のまま（130×100 しか無く、大きく出すとぼやける）。
 * 右下には歌っているキャラの影絵を出す。曲の絵はその曲を歌う2人まで、ボカロPの絵はその人の曲で一番多く歌うキャラ。
 * ロゴは右上（X は大きな画像のカードの左下にサイトの住所を重ねるので、左下を避ける）
 */
export async function producerImage(
  lang: Lang,
  found: Awaited<ReturnType<typeof findProducer>>,
  song?: Pick<Song, 'title' | 'youtubeId' | 'niconicoThumb' | 'vocalists'>,
) {
  const name = found?.producer.name ?? 'Vocafy';
  const picture = found?.producer.picture ?? null;
  const big = song?.title ?? name;
  const sub = song ? name : TEXT[lang].listen(formatCount(found?.songs.length ?? 0));
  const eyebrow = song ? 'SONG' : 'PRODUCER';
  // 表紙・影絵・フォントは互いに待たないので、まとめて取りに行く（前は表紙と影絵を読み終えてからフォントを取っていた）
  const [cover, singers, display, body, tech] = await Promise.all([
    song?.youtubeId
      ? youtubeCover(song.youtubeId)
      : song?.niconicoThumb
        ? niconicoCover(song.niconicoThumb)
        : null,
    singerArts(song ? song.vocalists : favoriteSingers(found?.songs ?? [])),
    googleFont('M PLUS Rounded 1c', 800, big),
    googleFont('M PLUS Rounded 1c', 700, sub),
    googleFont('Orbitron', 900, `${eyebrow}Vocafy`),
  ]);
  const silhouette = singersImage(singers);
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
      {silhouette && (
        // 歌っているキャラの影絵（2026-10-11）。画面の影絵と同じく差し色で薄く塗り、右下に立たせる
        <img
          src={silhouette.src}
          width={silhouette.width}
          height={silhouette.height}
          alt=""
          style={{ position: 'absolute', right: 40, bottom: 0 }}
        />
      )}
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
          // 右上（2026-10-11）。X は大きな画像のカードの左下にサイトの住所を重ねるので、左下を避ける
          right: 72,
          top: 48,
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
