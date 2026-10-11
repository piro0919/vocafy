import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { MINUTE_MS } from '@/lib/timing';
import type { Engine, Sound } from './engine';
import { FADE_STEPS, faded } from './fade';
import type { Sleep } from './player-types';

/** スリープタイマーで止めるときに、音を絞りきるまでの長さ（ミリ秒）。眠りかけの耳に急に切れないよう、曲を替えるときより長く */
const SLEEP_FADE_MS = 3000;

/** 選んだ値（分か、いまの曲の終わり。null で切る）を、タイマーの値にする。from は入れた時刻（Date.now() の値） */
export function sleepOf(value: number | 'end' | null, from: number): Sleep | null {
  if (value === null) return null;
  if (value === 'end') return { kind: 'end' };
  return { kind: 'at', at: from + value * MINUTE_MS, from };
}

/**
 * スリープタイマー（playback-mode.tsx の SleepButton から入れる）。時刻で止めるときは、時間が来たら SLEEP_FADE_MS かけて
 * 音を絞ってから一時停止し、音量を元に戻しておく（次に再生を押したときは、いつもの音量で鳴る）。
 * 「この曲が終わったら」は、曲が終わったときに player-provider.tsx が sleepRef を読んで止める（作ったときの関数を
 * 持ち続けるプレイヤーの知らせから読むので、ref にも持つ）。このタブの中だけで持ち、保存しない
 */
export function useSleepTimer(player: RefObject<Engine | null>, sound: RefObject<Sound | null>) {
  const [sleep, setSleepState] = useState<Sleep | null>(null);
  const sleepRef = useRef<Sleep | null>(null);
  const setSleep = useCallback((value: number | 'end' | null) => {
    const next = sleepOf(value, Date.now());
    sleepRef.current = next;
    setSleepState(next);
  }, []);

  useEffect(() => {
    if (sleep?.kind !== 'at') return;
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    // 絞っている途中で切られたとき（タイマーを切る・入れ直す）に、音量を戻すための控え
    let restore: (() => void) | null = null;
    const timer = setTimeout(
      () => {
        // 状態（sleep）を消すのは止め終えてから。先に消すと、このエフェクトの後片付けが走って、絞っている途中の時計まで止まった
        const done = () => {
          sleepRef.current = null;
          setSleepState(null);
        };
        const p = player.current;
        const { volume, muted } = sound.current ?? { volume: 100, muted: false };
        if (!p || muted || volume === 0) {
          p?.pause();
          done();
          return;
        }
        let step = 0;
        restore = () => p.setVolume(volume);
        const tick = () => {
          step += 1;
          if (step > FADE_STEPS) {
            restore = null;
            p.pause();
            p.setVolume(volume);
            done();
            return;
          }
          p.setVolume(faded(volume, step));
          fadeTimer = setTimeout(tick, SLEEP_FADE_MS / FADE_STEPS);
        };
        tick();
      },
      Math.max(0, sleep.at - Date.now()),
    );
    return () => {
      clearTimeout(timer);
      clearTimeout(fadeTimer);
      restore?.();
    };
  }, [sleep, player, sound]);

  return { sleep, sleepRef, setSleep };
}
