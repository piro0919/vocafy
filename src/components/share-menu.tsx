'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ICON } from './button-styles';
import { Icon, type IconName } from './icon';

/**
 * 共有のボタン（2026-10-11 に本人と決めた）。スマホなど指で操作する端末で共有の窓（Web Share API）が出せるときは、端末の窓を出す
 * （入っているアプリ全部に送れる）。パソコンでは、ボタンの下に送り先の板を開く。前はパソコンでは押すとリンクを写すだけだった。
 * 送り先は、ボカロの話題が集まる X と、移る人の増えている Bluesky、LINE、リンクをコピー。どれも投稿の下書きを開く住所で、鍵は要らない
 */
export function ShareMenu({ url, text, label }: { url: string; text: string; label: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // 板の外を押すか Esc で閉じる
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

  const onClick = async () => {
    if ('share' in navigator && matchMedia('(pointer: coarse)').matches) {
      // 窓を閉じただけでも失敗が返るので、何もしない
      await navigator.share({ url }).catch(() => {});
      return;
    }
    setOpen((o) => !o);
  };

  const enc = encodeURIComponent;
  const targets: { name: string; icon: IconName; href: string }[] = [
    { name: 'X', icon: 'x', href: `https://x.com/intent/post?text=${enc(text)}&url=${enc(url)}` },
    {
      name: 'Bluesky',
      icon: 'bluesky',
      href: `https://bsky.app/intent/compose?text=${enc(`${text} ${url}`)}`,
    },
    {
      name: 'LINE',
      icon: 'line',
      href: `https://social-plugins.line.me/lineit/share?url=${enc(url)}`,
    },
  ];
  const row =
    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-bold text-muted transition-colors hover:bg-foreground/8 hover:text-foreground';

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-expanded={open}
        title={label}
        className={`grid ${ICON} text-muted hover:text-foreground`}
      >
        <Icon name="share" className="size-5" />
      </button>
      {open && (
        // 形は右上のアカウントのメニューと同じ（すりガラスの角丸の板）
        <div
          role="menu"
          className="absolute top-full left-0 z-overlay mt-2 w-52 rounded-2xl border border-line/60 bg-glass p-2 shadow-lg shadow-black/5 backdrop-blur-lg backdrop-saturate-150"
        >
          {targets.map((t) => (
            <a
              key={t.name}
              role="menuitem"
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className={row}
            >
              <Icon name={t.icon} className="size-5" />
              {t.name}
            </a>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await navigator.clipboard.writeText(url);
              toast('リンクをコピーしました');
            }}
            className={row}
          >
            <Icon name="share" className="size-5" />
            リンクをコピー
          </button>
        </div>
      )}
    </div>
  );
}
