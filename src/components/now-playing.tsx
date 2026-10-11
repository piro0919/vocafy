'use client';

import { usePlayer } from './player/player-provider';
import { defineText } from '@/i18n/text';
import { useText } from '@/i18n/navigation';

const TEXT = defineText({
  ja: { playing: '再生中' },
  en: { playing: 'Now playing' },
});

/**
 * いま流している曲がこのボカロPのものなら、題名の横に揺れる棒を出す。
 * サムネイルの上には再生ボタン以外を重ねられないので（YouTube の規約）、印は文字の側に置く
 */
export function NowPlaying({ producerId }: { producerId: number }) {
  const { current, playing } = usePlayer();
  if (current?.producerId !== producerId) return null;
  return <Bars playing={playing} />;
}

/** 棒ごとの伸び縮み。Tailwind が拾えるよう名前を書き切る */
const BAR_ANIMATIONS = ['animate-eq-1', 'animate-eq-2', 'animate-eq-3'];

/** 再生中の印。棒ごとに違う並びで伸び縮みさせ、音に揺れて見せる。一時停止中は止める */
export function Bars({ playing }: { playing: boolean }) {
  const t = useText(TEXT);
  return (
    <span aria-label={t.playing} className="inline-flex h-3 shrink-0 items-end gap-0.5">
      {BAR_ANIMATIONS.map((animation) => (
        <span
          key={animation}
          className={`w-0.5 origin-bottom rounded-full bg-accent ${animation}`}
          style={{
            height: '100%',
            animationPlayState: playing ? 'running' : 'paused',
          }}
        />
      ))}
    </span>
  );
}
