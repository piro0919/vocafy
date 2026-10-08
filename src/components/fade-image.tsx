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
 * 先に読み込み終わっていて onLoad が来ないこともあるので、出したときにも確かめる
 */
export function FadeImage({ className = '', alt, unoptimized, ...props }: ImageProps) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (ref.current?.complete) setLoaded(true);
  }, []);

  return (
    <Image
      ref={ref}
      alt={alt}
      onLoad={() => setLoaded(true)}
      className={`transition-opacity duration-300 ease-out ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      unoptimized={unoptimized ?? isVideoThumb(props.src)}
      {...props}
    />
  );
}
