'use client';

import Image, { type ImageProps } from 'next/image';
import { useEffect, useRef, useState } from 'react';

/**
 * Vercel の画像変換を通さない、動画の表紙の置き場所。どれも元から小さい画像（YouTube は 320×180 で 15KB ほど）で、
 * 変換しても軽くならない。変換は1枚ごと・作り置きの期限ごとに料金がかかり、曲数に比例して膨らむので通さない。
 * 表紙に手を加えずにそのまま見せる形なので、YouTube の規約の面でも素直
 */
const VIDEO_THUMB_HOSTS = ['https://i.ytimg.com/', 'https://nicovideo.cdn.nimg.jp/'];

const isVideoThumb = (src: ImageProps['src']) =>
  typeof src === 'string' && VIDEO_THUMB_HOSTS.some((host) => src.startsWith(host));

/**
 * 読み込めたらふわっと出す画像。読み込んだ順にいきなり現れるのを避ける。
 * 先に読み込み終わっていて onLoad が来ないこともあるので、出したときにも確かめる。
 * 指を乗せたときの拡大（group-hover:scale）も同じ指定で動かす。使う側で transition を足しても、
 * Tailwind の並びで transition-opacity が後に来て勝ち、拡大が一瞬で切り替わっていた。
 * 最初に見える画像（loading="eager"）はフェードさせず、初めから見せる（2026-10-12）。透明なあいだの画像は
 * Chrome が LCP に数えないので、JavaScript が動いて読み込みを見届けるまで LCP が決まらず、本番の Lighthouse で
 * トップの LCP が 10 秒を超えていた
 */
export function FadeImage({ className = '', alt, unoptimized, ...props }: ImageProps) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(props.loading === 'eager');

  useEffect(() => {
    if (ref.current?.complete) setLoaded(true);
  }, []);

  return (
    <Image
      ref={ref}
      alt={alt}
      onLoad={() => setLoaded(true)}
      className={`transition duration-move ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      unoptimized={unoptimized ?? isVideoThumb(props.src)}
      {...props}
    />
  );
}
