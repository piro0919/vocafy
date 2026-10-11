'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FloatingPanel } from './floating-panel';
import { KeyList, useKeyboardTitle } from './keyboard-help';
import { now } from './playback-time';
import { usePlaybackTime, usePlayer } from './player-provider';
import { LONG_SEEK_STEP, SEEK_STEP, VOLUME_STEP } from '@/lib/input';

/**
 * キーボードでプレイヤーとサイトを操作する（一覧は keyboard-help.tsx）。
 *
 * 何か流しているとき（順番待ちがあるとき）だけ受けるもの。Space・K 再生・一時停止 / ← → 5秒戻る・進む / J L 10秒戻る・進む /
 * 0〜9 全体の0〜90%へ / Shift+← →・Shift+P N 前の曲・次の曲 / ↑ ↓ 音量 / M 消音 / S ランダム / R ループ（ここまで YouTube と同じか近い）/
 * H お気に入り / Q 次に流れる曲 / A ラジオ。H・Q・A は、その印（aria-keyshortcuts）を付けた見えているボタンを押す。
 * 帯のボタンと同じ動き（ハートの弾み、板のフォーカスの出入り、ラジオの画面への移動）になる。見えていなければ何もしない。
 * いつでも受けるもの。/ 検索欄へ移る / ? 一覧の板を開く（YouTube と同じ）
 *
 * 次のときは受けない。文字を打っているとき（検索欄など）。キーを自分で使う部品に注目があるとき
 * （再生位置のつまみ。data-own-keys の印）。ボタンやリンクの上の Space は、
 * それを押す動きに任せる。動画を押したあとは注目が YouTube の枠の中に移り、キーは YouTube の側に届く
 * （YouTube の側も Space や ← → で同じように動く）
 */
/** 数字のキーで飛ぶ位置の刻み（5 なら全体の50%。YouTube と同じ） */
const DIGITS = 10;

/** 見えているボタンを押して動かすキー（大文字で引く）と、そのボタンの aria-keyshortcuts */
const KEY_BUTTONS: Record<string, string> = { H: 'H', Q: 'Q', A: 'A' };

/**
 * 当てはまる要素のうち、画面に見えている最初のもの。隠した帯の中（inert）は見えていないとみなす。
 * checkVisibility は Safari 17.4 から。無いブラウザでは、箱を持つか（display: none とその中は持たない）と visibility で見る
 */
function firstShown<T extends HTMLElement>(selector: string): T | undefined {
  return [...document.querySelectorAll<T>(selector)].find((el) => {
    if (el.closest('[inert]')) return false;
    if (typeof el.checkVisibility === 'function') return el.checkVisibility();
    return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  });
}

export function PlayerKeys() {
  const current = usePlayer();
  // キーの受け口は付けたままにし、そのときのプレイヤーの状態を読む。状態をそのまま見張ると、流しているあいだは
  // 再生位置が 0.5 秒ごとに変わるので、そのたびに受け口を付け直していた
  const time = usePlaybackTime();
  const playerRef = useRef(current);
  const timeRef = useRef(time);
  useEffect(() => {
    playerRef.current = current;
    timeRef.current = time;
  }, [current, time]);
  const [helpOpen, setHelpOpen] = useState(false);
  const helpTitle = useKeyboardTitle();
  // 板は初めて開くまで描かない（読み込んだ直後のサーバーの HTML と食い違わせない）。一度描いたら、閉じる動きのために置いたままにする
  const [helpMounted, setHelpMounted] = useState(false);
  // 板を閉じたら、開く前にフォーカスのあった所へ戻す
  const opener = useRef<HTMLElement | null>(null);
  const closeHelp = useCallback(() => setHelpOpen(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const player = playerRef.current;
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (target?.closest('[role="slider"], [data-own-keys]')) return;

      if (e.key === '?') {
        e.preventDefault();
        // フォーカスがどこにも無い（body）ときは持たない。body を開いたボタンとして渡すと、どこを押しても板の外と見なされず閉じない
        if (!helpOpen) {
          const active = document.activeElement;
          opener.current =
            active instanceof HTMLElement && active !== document.body ? active : null;
        }
        setHelpMounted(true);
        setHelpOpen((open) => !open);
        return;
      }
      if (e.key === '/') {
        // 見えている検索欄へ移る（パソコンの上の段。スマホは虫めがねを押すまで欄が無い）
        const field = firstShown<HTMLInputElement>('input[type="search"]');
        if (!field) return;
        e.preventDefault();
        field.focus();
        return;
      }

      if (player.queue.length === 0) return;
      const time = timeRef.current;
      const t = now(time, player.playing);
      const seekBy = (sec: number) => player.seek(Math.min(time.duration, Math.max(0, t + sec)));
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        player.seek((time.duration * Number(e.key)) / DIGITS);
        return;
      }
      const shortcut = KEY_BUTTONS[e.key.toUpperCase()];
      if (shortcut) {
        const button = firstShown<HTMLElement>(`[aria-keyshortcuts="${shortcut}"]`);
        if (!button) return;
        e.preventDefault();
        button.click();
        return;
      }
      let handled = true;
      switch (e.key) {
        case ' ':
          if (target?.closest('button, a, summary')) return;
          player.toggle();
          break;
        case 'k':
        case 'K':
          player.toggle();
          break;
        case 'j':
        case 'J':
          seekBy(-LONG_SEEK_STEP);
          break;
        case 'l':
        case 'L':
          seekBy(LONG_SEEK_STEP);
          break;
        case 'P':
        case 'N':
          // YouTube と同じく Shift と一緒のときだけ
          if (!e.shiftKey) return;
          player.step(e.key === 'N' ? 1 : -1);
          break;
        case 'ArrowLeft':
          if (e.shiftKey) player.step(-1);
          else seekBy(-SEEK_STEP);
          break;
        case 'ArrowRight':
          if (e.shiftKey) player.step(1);
          else seekBy(SEEK_STEP);
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
  }, [helpOpen]);

  // 板は次に流れる曲と同じ外枠で、動画に重ねない置き場所に出す（YouTube の規約）
  if (!helpMounted) return null;
  return createPortal(
    <FloatingPanel open={helpOpen} onClose={closeHelp} trigger={opener} title={helpTitle}>
      <div className="min-h-0 overflow-y-auto pt-1 pb-3">
        <KeyList />
      </div>
    </FloatingPanel>,
    document.body,
  );
}
