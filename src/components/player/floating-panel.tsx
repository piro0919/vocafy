'use client';

import { type ReactNode, type RefObject, useEffect, useRef } from 'react';
import { ICON_SM } from '../button-styles';
import { Icon } from '../icon';

/**
 * 再生の帯のボタンから開く板（次に流れる曲・スリープタイマー）の外枠。
 * パソコンは下の帯の右上、スマホは帯の上に、画面の幅いっぱいの板で出す（高さはトーストと同じ --toast-bottom の上）。
 *
 * 置いたままにして、open で出し入れする（閉じるときも下へ少しずらしながら消す）。出入りの動きは右下の窓（dock-strip.tsx の FADE・HIDDEN）と
 * 同じにする。開いたら板にフォーカスを移し、閉じたら開いたボタンに戻す。見出しの × か、板の外を押すか、Esc で閉じる。
 * 板は portal で body の直下に出す（playback-mode.tsx）
 */
export function FloatingPanel({
  open,
  onClose,
  trigger,
  title,
  onOpened,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** 開いたボタン。閉じたらここにフォーカスを戻す */
  trigger: RefObject<HTMLButtonElement | null>;
  /** 板の見出し。読み上げの名前と、閉じるボタンの名前（「◯◯を閉じる」）にも使う */
  title: string;
  /** 開いたときに中身を整える（次に流れる曲は、並びの先頭までスクロールを戻す） */
  onOpened?: () => void;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // 板の外を押したら閉じる。押した先の操作（曲を押す・画面を移るなど）はそのまま効かせる。
    // 開いたボタンを押したときは、ボタンの側で閉じる（ここでも閉じると、閉じてすぐ開き直す）。
    // 動画（YouTube かニコニコの埋め込み）の中を押したときは、知らせが届かないので閉じない
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panel.current?.contains(target) || trigger.current?.contains(target)) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    onOpened?.();
    // 開いたら板にフォーカスを移す（描き終えてから）
    const frame = requestAnimationFrame(() => panel.current?.focus({ preventScroll: true }));
    const button = trigger.current;
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
      cancelAnimationFrame(frame);
      button?.focus({ preventScroll: true });
    };
  }, [open, onClose, trigger, onOpened]);

  return (
    <div
      ref={panel}
      role="dialog"
      aria-label={title}
      aria-hidden={!open}
      inert={!open}
      tabIndex={-1}
      // 置き場所と高さの上限は globals.css の --panel-bottom・--panel-max（動画の上に重ねない。YouTube の規約）。
      // パソコンで右下の窓で流しているときは、窓と同じ幅・同じ側に出す
      className={`fixed inset-x-gutter bottom-(--panel-bottom) z-overlay flex max-h-(--panel-max) flex-col overflow-hidden rounded-2xl border border-line/60 bg-glass shadow-lg shadow-black/5 outline-none backdrop-blur-lg backdrop-saturate-150 duration-move md:left-auto md:w-96 md:[html[data-player=dock]_&]:w-dock-wide md:[html[data-player=dock][data-dock=left]_&]:right-auto md:[html[data-player=dock][data-dock=left]_&]:left-(--beside-sidebar) motion-reduce:transition-none ${
        // 見える・見えないの切り替え（visibility）は閉じるときだけ動きに乗せ、消えきってから見えなくする。
        // 開くときにも乗せると、出し始めはまだ見えない扱いで、フォーカスを受け付けなかった
        open ? 'transition' : 'invisible translate-y-4 opacity-0 transition-show'
      }`}
    >
      {/* 閉じる × は、右下の窓の帯の × と同じ形にそろえる */}
      <div className="flex items-center pt-1.5 pb-0.5 pl-4">
        <h2 className="min-w-0 flex-1 font-display text-base">{title}</h2>
        <button
          type="button"
          aria-label={`${title}を閉じる`}
          onClick={onClose}
          className={`grid ${ICON_SM} text-muted hover:text-foreground`}
        >
          <Icon name="close" className="size-4" />
        </button>
      </div>
      {children}
    </div>
  );
}
