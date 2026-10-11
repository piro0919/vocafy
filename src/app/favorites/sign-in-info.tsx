'use client';

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { ICON_SM } from '@/components/button-styles';
import { Icon } from '@/components/icon';
import { hasSignInHint } from '@/lib/auth-client';

/**
 * お気に入りの見出しの横の ⓘ。ログインで何ができるかを吹き出しで出す。
 * 右上のログインで得られるのはお気に入りを端末どうしで同期することだけで、それが画面のどこにも書かれていなかった。
 * 出しっぱなしの一文は目障りなので、ⓘ にだけ持たせる。ログインは右上のボタンでするので、吹き出しには置かない。
 * ログインしたことのある端末（auth-client.ts の印）には出さない
 *
 * 形は shadcn の Tooltip（濃い地の小さな吹き出しに矢印）で、色は再生の帯のシーク位置の吹き出し（player-bar.tsx）と同じ。
 * マウスは乗せると出て、離すと消える。指の端末には乗せる操作が無いので、押しても出し入れでき、外を押すか Esc で閉じる
 */
export function SignInInfo() {
  const hinted = useSyncExternalStore(
    () => () => {},
    hasSignInHint,
    () => true,
  );
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (hinted) return null;
  return (
    <div
      ref={box}
      className="relative"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        // キーで移ってきたときだけ出す。押したときのフォーカスでも出すと、続く onClick で閉じてしまう
        onFocus={(e) => e.currentTarget.matches(':focus-visible') && setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label="ログインについて"
        aria-describedby={id}
        className={`grid ${ICON_SM} text-muted hover:text-foreground`}
      >
        <Icon name="info" className="size-5" />
      </button>
      <div
        id={id}
        role="tooltip"
        data-shown={open}
        className="pointer-events-none absolute top-full left-1/2 z-overlay mt-1 w-max max-w-64 -translate-x-1/2 sm:max-w-none rounded-md bg-foreground px-3 py-1.5 text-xs font-bold text-background opacity-0 shadow-mark transition-opacity duration-react data-[shown=true]:opacity-100"
      >
        <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-foreground" />
        {/* 狭い幅では「、」で折る（文の途中で折れないよう、2つに分けて塊にする） */}
        <span className="inline-block">ログインすると、</span>
        <span className="inline-block">お気に入りをほかの端末と同期できます。</span>
      </div>
    </div>
  );
}
