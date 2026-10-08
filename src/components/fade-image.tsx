'use client';

import Image, { type ImageProps } from 'next/image';
import { useEffect, useRef, useState } from 'react';

/**
 * 読み込めたらふわっと出す画像。読み込んだ順にいきなり現れるのを避ける。
 * 先に読み込み終わっていて onLoad が来ないこともあるので、出したときにも確かめる
 */
export function FadeImage({ className = '', alt, ...props }: ImageProps) {
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
      {...props}
    />
  );
}
