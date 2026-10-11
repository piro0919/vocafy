'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ICON_SM, PRIMARY_TEXT } from '@/components/button-styles';
import { Icon } from '@/components/icon';
import { hasSignInHint, signIn } from '@/lib/auth-client';

/**
 * お気に入りの見出しの横の ⓘ。押すと、ログインで何ができるかを板で出す。
 * 右上のログインで得られるのはお気に入りを端末どうしで同期することだけで、それが画面のどこにも書かれていなかった。
 * 出しっぱなしの一文は目障りなので、押したときだけ出す。ログインしたことのある端末（auth-client.ts の印）には出さない
 */
export function SignInInfo() {
  const hinted = useSyncExternalStore(
    () => () => {},
    hasSignInHint,
    () => true,
  );
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // 板の外を押すか Esc で閉じる（share-menu.tsx と同じ）
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
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="ログインについて"
        aria-expanded={open}
        title="ログインについて"
        className={`grid ${ICON_SM} text-muted hover:text-foreground`}
      >
        <Icon name="info" className="size-5" />
      </button>
      {open && (
        // 形は右上のアカウントのメニューと同じ（すりガラスの角丸の板）
        <div className="absolute top-full left-0 z-overlay mt-2 w-64 rounded-2xl border border-line/60 bg-glass p-4 shadow-float backdrop-blur-lg backdrop-saturate-150">
          <p className="text-sm">ログインすると、お気に入りをほかの端末と同期できます。</p>
          <button type="button" onClick={() => signIn()} className={`mt-3 ${PRIMARY_TEXT}`}>
            ログイン
          </button>
        </div>
      )}
    </div>
  );
}
