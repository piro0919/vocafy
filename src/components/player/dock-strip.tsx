'use client';

import Link from 'next/link';
import type { QueueItem } from '@/lib/catalog';
import { Icon } from '../icon';
import type { FrameMode } from './use-frame-layout';
import type { PlayContext } from './player-types';

export /**
 * 右下の窓の位置と大きさ。スマホでは下のタブと帯の上、パソコンでは帯の上。
 * スマホは画面が狭いので、規約の下限（200×200）ちょうどの正方形にする。16:9 の動画は窓の中で上下に黒い帯が入る。
 * パソコンは 16:9 の 356×200
 */
const DOCK =
  'fixed right-3 bottom-[calc(8.25rem+12px)] h-[200px] w-[200px] md:right-3 md:bottom-[calc(4rem+12px+12px)] md:w-[356px]';

/**
 * 窓のすぐ上に付ける帯。窓と帯で一枚の板に見せ、角の丸みと縁の線をほかの浮いた板（左のメニュー・下の再生の帯）にそろえる。
 * 動画の側の線は外へ描く（ring）。枠の内側に線（border）を引くと、動画が 200×200（YouTube の規約の下限）を割る
 */
const DOCK_STRIP =
  'fixed right-3 bottom-[calc(8.25rem+12px+200px)] h-9 w-[200px] md:right-3 md:bottom-[calc(4rem+12px+12px+200px)] md:w-[356px]';
/** 出入りの動き。閉じたあとは少し下へずらして消す */
export const FADE = 'transition-[opacity,translate,visibility] duration-300 ease-(--ease-out)';
export const HIDDEN = 'pointer-events-none invisible translate-y-4 opacity-0';

/**
 * 右下の窓の上に付ける帯。押すと流している並びの持ち主の画面へ移り、そこで大きく出る。× で再生ごと止める
 */
export function DockStrip({
  mode,
  shown,
  context,
  listSource,
  radioHome,
  onClose,
}: {
  mode: FrameMode;
  /** 帯に出す曲。閉じたあとも、帯が消えきるまでは最後の曲 */
  shown: QueueItem | null;
  context: PlayContext;
  listSource: string | null;
  radioHome: string | null;
  onClose: () => void;
}) {
  return (
    <>
      {/*
        右下の窓の上に付ける帯。押すと流しているボカロPの画面（お気に入りの並びならお気に入りの曲の画面）に移り、そこで大きく出る。
        窓の中は YouTube かニコニコのプレイヤーで、押すとそちらの操作になるので、入口は窓の外に置く
      */}
      <div
        aria-hidden={mode !== 'dock'}
        inert={mode !== 'dock'}
        className={`chrome-bottom ${DOCK_STRIP} ${FADE} z-30 flex items-center rounded-t-2xl border border-b-0 border-line/60 bg-glass backdrop-blur-lg backdrop-saturate-150 ${mode === 'dock' ? '' : HIDDEN}`}
      >
        {shown && (
          <Link
            href={
              context === 'favorites'
                ? '/favorites/songs'
                : listSource
                  ? `/${listSource}/play`
                  : context === 'radio' && radioHome
                    ? radioHome
                    : `/producers/${shown.producerId}`
            }
            className="flex h-full min-w-0 flex-1 items-center gap-2 pl-3 text-xs text-muted transition-colors hover:text-foreground"
          >
            <span className="min-w-0 flex-1 truncate">
              <span className="font-bold text-foreground">{shown.title}</span>
              {' ・ '}
              {shown.producerName}
              {/* 下の再生の帯と同じく、スマホ（帯が 200px）ではボカロPだけにする */}
              {shown.vocalists && <span className="max-md:hidden">{` ・ ${shown.vocalists}`}</span>}
            </span>
            <Icon name="expand" className="size-4 shrink-0" />
          </Link>
        )}
        {/* 窓だけ消して音を流し続けることはできない（プレイヤーは見えている必要がある）ので、下の帯の × と同じく再生ごと止める */}
        <button
          type="button"
          aria-label="プレイヤーを閉じる"
          onClick={onClose}
          className="grid h-full w-9 shrink-0 place-items-center text-muted transition-[color,scale] duration-150 ease-(--ease-out) hover:text-foreground active:scale-95"
        >
          <Icon name="close" className="size-4" />
        </button>
      </div>
    </>
  );
}
