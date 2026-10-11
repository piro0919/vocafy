'use client';

import { Link, useText } from '@/i18n/navigation';
import { type PointerEvent as ReactPointerEvent, useEffect, useRef } from 'react';
import type { QueueItem } from '@/lib/catalog';
import { EASE_OUT, MOTION, prefersReducedMotion } from '@/lib/motion';
import { Icon } from '../icon';
import type { FrameMode } from './use-frame-layout';
import { type DockSide, savedDockSide, saveDockSide } from './player-storage';
import { ownerHref } from './player-rules';
import type { Owner } from './player-types';
import { DRAG_SLOP } from '@/lib/input';
import { resetDockSize, startDockResize, useDockSize } from './dock-size';
import { GLASS } from '@/components/surface-styles';
import { defineText } from '@/i18n/text';
import { useVoiceNames } from '@/components/voice-names';

const TEXT = defineText({
  ja: { resize: '大きさを変える', close: 'プレイヤーを閉じる' },
  en: { resize: 'Resize', close: 'Close player' },
});

export /**
 * 右下の窓の位置と大きさ。スマホでは下のタブと帯の上、パソコンでは帯の上。
 * スマホは画面が狭いので、規約の下限（200×200）ちょうどの正方形にする。16:9 の動画は窓の中で上下に黒い帯が入る。
 * パソコンは 16:9 の 356×200。
 * 左に寄せたとき（html の data-dock が left）は、パソコンでは左のメニューの板（--spacing-sidebar）の右に置く
 */
const DOCK =
  'fixed right-gutter bottom-(--dock-bottom) size-dock md:w-dock-wide [html[data-dock=left]_&]:right-auto [html[data-dock=left]_&]:left-gutter md:[html[data-dock=left]_&]:left-(--beside-sidebar)';

/**
 * 窓のすぐ上に付ける帯。窓と帯で一枚の板に見せ、角の丸みと縁の線をほかの浮いた板（左のメニュー・下の再生の帯）にそろえる。
 * 動画の側の線は外へ描く（ring）。枠の内側に線（border）を引くと、動画が 200×200（YouTube の規約の下限）を割る
 */
const DOCK_STRIP =
  'fixed right-gutter bottom-(--dock-strip-bottom) h-dock-strip w-dock md:w-dock-wide [html[data-dock=left]_&]:right-auto [html[data-dock=left]_&]:left-gutter md:[html[data-dock=left]_&]:left-(--beside-sidebar)';
/** 離したとき、これだけ引いていれば、引いた向きの側へ寄せる */
const DRAG_SWITCH = 48;
/** 出入りの動き。閉じたあとは少し下へずらして消す */
export const FADE = 'transition-show duration-move';
export const HIDDEN = 'pointer-events-none invisible translate-y-4 opacity-0';

/**
 * 右下の窓の上に付ける帯。押すと流している並びの持ち主の画面へ移り、そこで大きく出る。× で再生ごと止める
 */
export function DockStrip({
  mode,
  shown,
  owner,
  onClose,
}: {
  mode: FrameMode;
  /** 帯に出す曲。閉じたあとも、帯が消えきるまでは最後の曲 */
  shown: QueueItem | null;
  /** 流している並びの持ち主。帯の行き先 */
  owner: Owner;
  onClose: () => void;
}) {
  const t = useText(TEXT);
  const voices = useVoiceNames();
  const strip = useRef<HTMLDivElement>(null);
  // 引いたあとの「押した」を、帯の行き先へのリンクに渡さない
  const dragged = useRef(false);

  useEffect(() => {
    document.documentElement.dataset.dock = savedDockSide();
  }, []);
  useDockSize();

  /**
   * 帯を横に引いて、窓を左右に寄せる。右手で持つスマホでは右下の窓が親指の通り道にあるため。
   * 動画の中は埋め込みが指の操作を取るので、つかめるのは帯だけ。引いているあいだは窓と帯を指に付いて動かし、
   * 離したら引いた向きの側へ寄せる。寄せる側は設定の画面（dock-setting.tsx）でも選べる。html の data-dock で持ち、窓・帯・板（floating-panel.tsx）がそれを見て並ぶ
   */
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as Element).closest('button')) return;
    const el = strip.current;
    const frame = document.querySelector<HTMLElement>('[data-player-frame]');
    if (!el || !frame) return;
    const pointerId = e.pointerId;
    const startX = e.clientX;
    let dx = 0;
    let moving = false;
    dragged.current = false;

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      dx = ev.clientX - startX;
      if (!moving) {
        if (Math.abs(dx) < DRAG_SLOP) return;
        moving = true;
        dragged.current = true;
        el.setPointerCapture(pointerId);
        // 指が動画の上に入っても、埋め込みに取られないようにする
        frame.style.pointerEvents = 'none';
      }
      el.style.transform = `translateX(${dx}px)`;
      frame.style.transform = `translateX(${dx}px)`;
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (!moving) return;
      frame.style.pointerEvents = '';
      const current: DockSide = document.documentElement.dataset.dock === 'left' ? 'left' : 'right';
      const side: DockSide = dx <= -DRAG_SWITCH ? 'left' : dx >= DRAG_SWITCH ? 'right' : current;
      // 指を離した位置から、寄せた先まで滑らせる（FLIP）
      const before = el.getBoundingClientRect().left;
      el.style.transform = '';
      frame.style.transform = '';
      saveDockSide(side);
      const offset = before - el.getBoundingClientRect().left;
      if (offset !== 0 && !prefersReducedMotion()) {
        for (const node of [el, frame]) {
          node.animate([{ transform: `translateX(${offset}px)` }, { transform: 'none' }], {
            duration: MOTION.move,
            easing: EASE_OUT,
          });
        }
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  return (
    <>
      {/*
        右下の窓の上に付ける帯。押すと流しているボカロPの画面（お気に入りの並びならお気に入りの曲の画面）に移り、そこで大きく出る。
        窓の中は YouTube かニコニコのプレイヤーで、押すとそちらの操作になるので、入口は窓の外に置く
      */}
      <div
        ref={strip}
        // スワイプで戻る（swipe-back.tsx）が、帯を引く操作を取らないための目印
        data-dock-strip
        aria-hidden={mode !== 'dock'}
        inert={mode !== 'dock'}
        onPointerDown={onPointerDown}
        onClickCapture={(e) => {
          if (!dragged.current) return;
          dragged.current = false;
          e.preventDefault();
          e.stopPropagation();
        }}
        className={`${GLASS} chrome-bottom ${DOCK_STRIP} ${FADE} z-chrome flex touch-pan-y items-center select-none rounded-t-2xl border-b-0 ${mode === 'dock' ? '' : HIDDEN}`}
      >
        {/* 窓の大きさを変える引き手（パソコンだけ。dock-size.ts）。窓は画面の端の側の角が動かないので、反対の外側の角に置く。
            右に寄せているときは左上、左に寄せているときは右上。角の丸みに沿った弧（globals.css の data-dock-arc） */}
        <span
          aria-hidden
          title={t.resize}
          data-dock-arc="left"
          onPointerDown={startDockResize}
          onDoubleClick={resetDockSize}
          className="z-raised hidden cursor-nwse-resize text-muted md:block md:[html[data-dock=left]_&]:hidden"
        />
        <span
          aria-hidden
          title={t.resize}
          data-dock-arc="right"
          onPointerDown={startDockResize}
          onDoubleClick={resetDockSize}
          className="z-raised hidden cursor-nesw-resize text-muted md:[html[data-dock=left]_&]:block"
        />
        {shown && (
          <Link
            draggable={false}
            href={ownerHref(owner, shown)}
            className="flex h-full min-w-0 flex-1 items-center gap-2 pl-3 text-xs text-muted transition-colors hover:text-foreground"
          >
            <span className="min-w-0 flex-1 truncate">
              <span className="font-bold text-foreground">{shown.title}</span>
              {' ・ '}
              {shown.producerName}
              {/* 下の再生の帯と同じく、スマホ（帯が 200px）ではボカロPだけにする */}
              {shown.vocalists && (
                <span className="max-md:hidden">{` ・ ${voices.text(shown.vocalists)}`}</span>
              )}
            </span>
            <Icon name="expand" className="size-4 shrink-0" />
          </Link>
        )}
        {/* 窓だけ消して音を流し続けることはできない（プレイヤーは見えている必要がある）ので、下の帯の × と同じく再生ごと止める */}
        <button
          type="button"
          aria-label={t.close}
          onClick={onClose}
          className="grid h-full w-9 shrink-0 place-items-center text-muted transition duration-react hover:text-foreground active:scale-95"
        >
          <Icon name="close" className="size-4" />
        </button>
      </div>
    </>
  );
}
