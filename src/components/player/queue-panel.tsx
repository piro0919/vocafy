'use client';

import { type RefObject, useEffect, useRef } from 'react';
import { Icon } from '../icon';
import { SongItem } from '../song-list';
import { usePlayer } from './player-provider';

/**
 * 次に流れる曲（順番待ち）。流す順（ランダムなら混ぜたあとの順）で並べ、押すとその曲へ飛ぶ。
 * パソコンは下の帯の右上、スマホは帯の上に、画面の幅いっぱいの板で出す（高さはトーストと同じ --toast-bottom の上）。
 *
 * 置いたままにして、open で出し入れする（閉じるときも下へ少しずらしながら消す）。出入りの動きは右下の窓（player-provider.tsx の FADE・HIDDEN）と
 * 同じにする。窓の上に積んで一続きに見せるので、前の 200ms で縮みながら消える動きは、窓と別の部品に見えた。開いたら板にフォーカスを移し、
 * 閉じたら開いたボタンに戻す。見出しの × か、板の外を押すか、Esc で閉じる。板の中のスクロールは後ろのページに伝えない
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
    // 板の外を押したら閉じる。押した先の操作（曲を押す・画面を移るなど）はそのまま効かせる。
    // 開いたボタンを押したときは、ボタンの側で閉じる（ここでも閉じると、閉じてすぐ開き直す）。
    // 動画（YouTube かニコニコの埋め込み）の中を押したときは、知らせが届かないので閉じない。
    // 前は画面全体に透明な面を敷いて受けていたが、パソコンでは板が下の帯（すりガラス）の中にあり、
    // 面も帯の大きさに縮んで、帯の外を押しても閉じなかった
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panel.current?.contains(target) || trigger.current?.contains(target)) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    // 開いたら、並びの先頭から見せて、板にフォーカスを移す（描き終えてから）
    list.current?.scrollTo({ top: 0 });
    const frame = requestAnimationFrame(() => panel.current?.focus({ preventScroll: true }));
    const button = trigger.current;
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
      cancelAnimationFrame(frame);
      button?.focus({ preventScroll: true });
    };
  }, [open, onClose, trigger]);

  return (
    <div
      ref={panel}
      role="dialog"
      aria-label="次に流れる曲"
      aria-hidden={!open}
      inert={!open}
      tabIndex={-1}
      // 動画の上に重ねない（YouTube の規約）。スマホの動画の画面（data-watch）では、上に固定した動画（高さは幅の 56.25%）の
      // 下までに高さを収める。60% まで伸ばしていたら、板の上が動画の下に潜り込んだ。
      // 右下の窓で流しているとき（html の data-player が dock）は、窓の帯の上に積む（--dock-top）。パソコンは窓と同じ幅で
      // 上の段の下まで、スマホは画面の幅で上の端まで（上の動画の置き場所は表紙だけなので重ねてよい）。
      // 板は portal で body の直下に出す（playback-mode.tsx）ので、位置はどれも画面からの値で書く。
      // 前は、パソコンでは窓の左の画面の真ん中に浮き、スマホでは窓の下に潜っていた
      className={`fixed inset-x-3 bottom-(--toast-bottom) z-50 flex max-h-[60dvh] flex-col overflow-hidden rounded-2xl border border-line/60 bg-glass shadow-lg shadow-black/5 outline-none backdrop-blur-lg backdrop-saturate-150 duration-300 ease-(--ease-out) md:right-3 md:left-auto md:w-96 max-md:[html[data-watch]_&]:max-h-[calc(100dvh-56.25vw-var(--toast-bottom)-12px)] [html[data-player=dock]_&]:bottom-[calc(var(--dock-top)+12px)] max-md:[html[data-player=dock]_&]:max-h-[calc(100dvh-var(--dock-top)-24px)] max-md:[html[data-watch][data-player=dock]_&]:max-h-[calc(100dvh-var(--dock-top)-24px)] md:[html[data-player=dock]_&]:w-[356px] md:[html[data-player=dock]_&]:max-h-[calc(100dvh-var(--dock-top)-12px-80px)] motion-reduce:transition-none ${
        // 見える・見えないの切り替え（visibility）は閉じるときだけ動きに乗せ、消えきってから見えなくする。
        // 開くときにも乗せると、出し始めはまだ見えない扱いで、フォーカスを受け付けなかった
        open
          ? 'transition-[opacity,translate]'
          : 'invisible translate-y-4 opacity-0 transition-[opacity,translate,visibility]'
      }`}
    >
      {/* 閉じる × は、右下の窓の帯の × と同じ形にそろえる（player-provider.tsx） */}
      <div className="flex items-center pt-1.5 pb-0.5 pl-4">
        <h2 className="min-w-0 flex-1 font-display text-base">次に流れる曲</h2>
        <button
          type="button"
          aria-label="次に流れる曲を閉じる"
          onClick={onClose}
          className="grid h-9 w-9 shrink-0 place-items-center text-muted transition-[color,scale] duration-150 ease-(--ease-out) hover:text-foreground active:scale-95"
        >
          <Icon name="close" className="size-4" />
        </button>
      </div>
      {current && (
        <div className="px-2">
          <SongItem song={current} onOpen={onClose} favorite={false} />
        </div>
      )}
      <div ref={list} className="mt-2 min-h-0 flex-1 overscroll-contain overflow-y-auto px-2 pb-2">
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
  );
}
