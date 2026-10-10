'use client';

import { useEffect, useState } from 'react';
import { MOTION } from '@/lib/motion';
import type { QueueItem } from '@/lib/catalog';
import { voiceArtByName } from '@/lib/voice-art';

/**
 * 動画を大きく出す画面の、一覧の右下に置く、歌っているキャラの影絵。スマホは小さめにして、再生の帯の上に置く。
 * キャラの絵（public/characters）の形で切り抜き、差し色で薄く塗る。ロゴの影絵と同じ扱いにする。
 * 色のある絵のままだと、一覧の字の後ろで目立って読みにくくなり、AI で作った絵が画面の主役に近くなるので影絵にした（2026-10-11）。
 * 画面に固定し、字の後ろに回す（押せない）。曲が替わったら、いまの影絵を消してから次を出す。
 * 絵のあるキャラが何人も歌っている曲は、名前の出てくる順に CYCLE_MS ごとに入れ替える（2026-10-11 に本人と決めた。
 * 前は先頭の1人だけで、さみしいと言われた）。並べる形は、右下の場所が一覧の字に重なる広さになるのでやめた。
 * song はその画面で動画を大きく出しているときの曲（出していなければ null）
 */
export function SingerSilhouette({ song }: { song: QueueItem | null }) {
  const arts = song ? artsOf(song.vocalists) : '';
  // 入れ替えた回数。曲が替わったら（arts が変わったら）先頭の人に戻す
  const [turn, setTurn] = useState({ arts, count: 0 });
  const count = turn.arts === arts ? turn.count : 0;
  const list = arts ? arts.split(SEP) : [];
  const art = list.length > 0 ? list[count % list.length] : null;

  useEffect(() => {
    if (!arts.includes(SEP)) return;
    const timer = setInterval(
      () => setTurn((t) => ({ arts, count: (t.arts === arts ? t.count : 0) + 1 })),
      CYCLE_MS,
    );
    return () => clearInterval(timer);
  }, [arts]);
  // 描いている絵と、見えているか
  const [shown, setShown] = useState<string | null>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (art === shown) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (shown) {
      timers.push(setTimeout(() => setOn(false), 0));
      timers.push(setTimeout(() => setShown(art), MOTION.slow));
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
      className={`pointer-events-none fixed right-4 bottom-(--above-bar) -z-behind size-40 bg-accent transition-opacity duration-slow sm:right-8 lg:size-64 ${on ? 'opacity-10 dark:opacity-12' : 'opacity-0'}`}
      style={{
        maskImage: `url(${shown})`,
        maskSize: 'contain',
        maskRepeat: 'no-repeat',
        maskPosition: 'bottom right',
      }}
    />
  );
}

/** 何人も歌っている曲で、次のキャラに替えるまでの長さ */
const CYCLE_MS = 16000;

const SEP = '|';

/** 曲の歌声（「初音ミク・鏡音リン」の形）のうち、絵のあるキャラの絵を、名前の出てくる順に SEP でつないだもの */
function artsOf(vocalists: string): string {
  const arts = vocalists
    .split('・')
    .map((name) => voiceArtByName(name.trim()))
    .filter((art): art is string => art !== null);
  return [...new Set(arts)].join(SEP);
}
