'use client';

import { useEffect, useState } from 'react';
import type { QueueItem } from '@/lib/catalog';
import { voiceArtByName } from '@/lib/voice-art';
import { singerOfVocalists } from './theme/voice';

/**
 * 動画を大きく出す画面の、一覧の右下に置く、歌っているキャラの影絵。スマホは小さめにして、再生の帯の上に置く。
 * キャラの絵（public/characters）の形で切り抜き、差し色で薄く塗る。ロゴの影絵と同じ扱いにする。
 * 色のある絵のままだと、一覧の字の後ろで目立って読みにくくなり、AI で作った絵が画面の主役に近くなるので影絵にした（2026-10-11）。
 * 画面に固定し、字の後ろに回す（押せない）。曲が替わったら、いまの影絵を消してから次を出す。
 * song はその画面で動画を大きく出しているときの曲（出していなければ null）
 */
export function SingerSilhouette({ song }: { song: QueueItem | null }) {
  const singer = song ? singerOfVocalists(song.vocalists) : null;
  const art = singer ? voiceArtByName(singer) : null;
  // 描いている絵と、見えているか
  const [shown, setShown] = useState<string | null>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (art === shown) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (shown) {
      timers.push(setTimeout(() => setOn(false), 0));
      timers.push(setTimeout(() => setShown(art), FADE_MS));
    } else {
      timers.push(setTimeout(() => setShown(art), 0));
    }
    return () => timers.forEach(clearTimeout);
  }, [art, shown]);

  // 描いたら、透明の状態を一度描いてから浮かび上がらせる
  useEffect(() => {
    if (!shown) return;
    const frame = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(frame);
  }, [shown]);

  if (!shown) return null;
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed right-4 bottom-[calc(4rem+12px+16px)] -z-10 size-40 bg-accent transition-opacity duration-700 ease-(--ease-out) lg:right-8 lg:bottom-[calc(4rem+12px+24px)] lg:size-64 ${on ? 'opacity-10 dark:opacity-12' : 'opacity-0'}`}
      style={{
        maskImage: `url(${shown})`,
        maskSize: 'contain',
        maskRepeat: 'no-repeat',
        maskPosition: 'bottom right',
      }}
    />
  );
}

/** 消えるのにかかる長さ（duration-700 と同じ） */
const FADE_MS = 700;
