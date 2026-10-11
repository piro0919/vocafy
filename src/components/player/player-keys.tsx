'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FloatingPanel } from './floating-panel';
import { KeyList } from './keyboard-help';
import { now } from './player-bar';
import { usePlayer } from './player-provider';
import { SEEK_STEP, VOLUME_STEP } from '@/lib/input';

/**
 * キーボードでプレイヤーとサイトを操作する（一覧は keyboard-help.tsx）。
 *
 * Space 再生・一時停止 / ← → 5秒戻る・進む / Shift+← → 前の曲・次の曲 / ↑ ↓ 音量 / M 消音 / S ランダム / R ループ
 * は、何か流しているとき（順番待ちがあるとき）だけ受ける。/ 検索欄へ移る / ? 一覧の板を開く（YouTube と同じ）は、いつでも受ける
 *
 * 次のときは受けない。文字を打っているとき（検索欄など）。キーを自分で使う部品に注目があるとき
 * （再生位置のつまみ。data-own-keys の印）。ボタンやリンクの上の Space は、
 * それを押す動きに任せる。動画を押したあとは注目が YouTube の枠の中に移り、キーは YouTube の側に届く
 * （YouTube の側も Space や ← → で同じように動く）
 */
export function PlayerKeys() {
  const player = usePlayer();
  const [helpOpen, setHelpOpen] = useState(false);
  // 板は初めて開くまで描かない（読み込んだ直後のサーバーの HTML と食い違わせない）。一度描いたら、閉じる動きのために置いたままにする
  const [helpMounted, setHelpMounted] = useState(false);
  // 板を閉じたら、開く前にフォーカスのあった所へ戻す
  const opener = useRef<HTMLElement | null>(null);
  const closeHelp = useCallback(() => setHelpOpen(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (target?.closest('[role="slider"], [data-own-keys]')) return;

      if (e.key === '?') {
        e.preventDefault();
        if (!helpOpen) opener.current = document.activeElement as HTMLElement | null;
        setHelpMounted(true);
        setHelpOpen((open) => !open);
        return;
      }
      if (e.key === '/') {
        // 見えている検索欄へ移る（パソコンの上の段。スマホは虫めがねを押すまで欄が無い）
        const field = [...document.querySelectorAll<HTMLInputElement>('input[type="search"]')].find(
          (input) => input.offsetParent !== null,
        );
        if (!field) return;
        e.preventDefault();
        field.focus();
        return;
      }

      if (player.queue.length === 0) return;
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
  }, [player, helpOpen]);

  // 板は次に流れる曲と同じ外枠で、動画に重ねない置き場所に出す（YouTube の規約）
  if (!helpMounted) return null;
  return createPortal(
    <FloatingPanel open={helpOpen} onClose={closeHelp} trigger={opener} title="キーボード操作">
      <div className="min-h-0 overflow-y-auto pt-1 pb-3">
        <KeyList />
      </div>
    </FloatingPanel>,
    document.body,
  );
}
