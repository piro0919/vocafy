'use client';

import { type RefObject, useEffect, useRef } from 'react';
import { SongItem } from '../song-list';
import { usePlayer } from './player-provider';

/**
 * 次に流れる曲（順番待ち）。流す順（ランダムなら混ぜたあとの順）で並べ、押すとその曲へ飛ぶ。
 * パソコンは下の帯の右上、スマホは帯の上に、画面の幅いっぱいの板で出す（高さはトーストと同じ --toast-bottom の上）。
 *
 * 置いたままにして、open で出し入れする（閉じるときも下へ少しずらしながら消す）。開いたら板にフォーカスを移し、
 * 閉じたら開いたボタンに戻す。板の外を押すか Esc で閉じる。板の中のスクロールは後ろのページに伝えない
 */
export function QueuePanel({
  open,
  onClose,
  trigger,
}: {
  open: boolean;
  onClose: () => void;
  /** 開いたボタン。閉じたらここにフォーカスを戻す */
  trigger: RefObject<HTMLButtonElement | null>;
}) {
  const { current, upcoming, jumpTo } = usePlayer();
  // 閉じているあいだは並びを作らない（曲が変わるたびに組み直さない）
  const items = open ? upcoming() : [];
  const panel = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    // 開いたら、並びの先頭から見せて、板にフォーカスを移す（描き終えてから）
    list.current?.scrollTo({ top: 0 });
    const frame = requestAnimationFrame(() => panel.current?.focus({ preventScroll: true }));
    const button = trigger.current;
    return () => {
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(frame);
      button?.focus({ preventScroll: true });
    };
  }, [open, onClose, trigger]);

  return (
    <>
      {/* 板の外を押したら閉じる。スマホでここから指を動かしても、後ろのページはスクロールさせない */}
      <div
        aria-hidden
        className={`fixed inset-0 z-40 touch-none ${open ? '' : 'pointer-events-none'}`}
        onClick={onClose}
      />
      <div
        ref={panel}
        role="dialog"
        aria-label="次に流れる曲"
        aria-hidden={!open}
        inert={!open}
        tabIndex={-1}
        // 動画の上に重ねない（YouTube の規約）。パソコンで右下の窓で流しているとき（html の data-player が dock）は
        // 窓（幅 356px）の左に出す。スマホの動画の画面（data-watch）では、上に固定した動画（高さは幅の 56.25%）の下までに
        // 高さを収める。60% まで伸ばしていたら、板の上が動画の下に潜り込んだ
        className={`fixed inset-x-3 bottom-(--toast-bottom) z-50 flex max-h-[60dvh] origin-bottom flex-col overflow-hidden rounded-2xl border border-line/60 bg-sidebar/95 shadow-2xl shadow-black/20 outline-none backdrop-blur-lg backdrop-saturate-150 duration-200 ease-(--ease-out) md:right-3 md:left-auto md:w-96 md:[html[data-player=dock]_&]:right-[380px] max-md:[html[data-watch]_&]:max-h-[calc(100dvh-56.25vw-var(--toast-bottom)-12px)] motion-reduce:transition-none ${
          // 見える・見えないの切り替え（visibility）は閉じるときだけ動きに乗せ、消えきってから見えなくする。
          // 開くときにも乗せると、出し始めはまだ見えない扱いで、フォーカスを受け付けなかった
          open
            ? 'transition-[opacity,translate,scale]'
            : 'invisible translate-y-2 scale-[0.98] opacity-0 transition-[opacity,translate,scale,visibility]'
        }`}
      >
        <h2 className="px-4 pt-3 pb-2 font-display text-base">次に流れる曲</h2>
        {current && (
          <div className="px-2">
            <SongItem song={current} onOpen={onClose} favorite={false} />
          </div>
        )}
        <div
          ref={list}
          className="mt-2 min-h-0 flex-1 overscroll-contain overflow-y-auto px-2 pb-2"
        >
          {items.length > 0
            ? items.map(({ item, index }) => (
                <SongItem
                  key={`${index}-${item.songId}`}
                  song={item}
                  favorite={false}
                  onOpen={() => jumpTo(index)}
                />
              ))
            : null}
        </div>
      </div>
    </>
  );
}
