'use client';

import { useEffect } from 'react';
import { now } from './player-bar';
import { usePlayer } from './player-provider';
import { SEEK_STEP, VOLUME_STEP } from '@/lib/input';

/**
 * キーボードでプレイヤーを操作する。何か流しているとき（順番待ちがあるとき）だけ受ける。
 *
 * Space 再生・一時停止 / ← → 5秒戻る・進む / Shift+← → 前の曲・次の曲 / ↑ ↓ 音量 / M 消音 / S ランダム / R ループ
 *
 * 次のときは受けない。文字を打っているとき（検索欄など）。キーを自分で使う部品に注目があるとき
 * （再生位置のつまみ。data-own-keys の印）。ボタンやリンクの上の Space は、
 * それを押す動きに任せる。動画を押したあとは注目が YouTube の枠の中に移り、キーは YouTube の側に届く
 * （YouTube の側も Space や ← → で同じように動く）
 */
export function PlayerKeys() {
  const player = usePlayer();

  useEffect(() => {
    if (player.queue.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (target?.closest('[role="slider"], [data-own-keys]')) return;

      const t = now(player.time, player.playing);
      let handled = true;
      switch (e.key) {
        case ' ':
          if (target?.closest('button, a, summary')) return;
          player.toggle();
          break;
        case 'ArrowLeft':
          if (e.shiftKey) player.step(-1);
          else player.seek(Math.max(0, t - SEEK_STEP));
          break;
        case 'ArrowRight':
          if (e.shiftKey) player.step(1);
          else player.seek(Math.min(player.time.duration, t + SEEK_STEP));
          break;
        case 'ArrowUp':
          player.setVolume(Math.min(100, player.volume + VOLUME_STEP));
          break;
        case 'ArrowDown':
          player.setVolume(Math.max(0, player.volume - VOLUME_STEP));
          break;
        case 'm':
        case 'M':
          player.toggleMute();
          break;
        case 's':
        case 'S':
          player.toggleShuffle();
          break;
        case 'r':
        case 'R':
          player.toggleRepeat();
          break;
        default:
          handled = false;
      }
      // ページのスクロールなど、ブラウザがそのキーでするはずの動きは止める
      if (handled) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [player]);

  return null;
}
