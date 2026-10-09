'use client';

import { Toaster as Sonner } from 'sonner';

/**
 * 一瞬だけ出す知らせ（「リンクをコピーしました」など）。Sonner を使い、見た目はサイトの浮いた板（左のメニューや再生の帯）に合わせる。
 * 出す高さは、画面の下の再生の帯（スマホは下のタブも）のすぐ上。帯の高さは幅で変わるので globals.css の --toast-bottom で決める
 */
export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      offset={{ bottom: 'var(--toast-bottom)' }}
      mobileOffset={{ bottom: 'var(--toast-bottom)' }}
      duration={2000}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex items-center justify-center gap-2 rounded-full border border-line/60 bg-glass px-4 py-2.5 text-sm font-bold text-foreground shadow-lg shadow-black/5 backdrop-blur-lg backdrop-saturate-150',
          // 「元に戻す」のような押せる知らせのボタン。字は差し色にし、知らせの文と分ける
          actionButton:
            '-my-1 -mr-2 ml-1 shrink-0 rounded-full px-2 py-1 text-accent transition-[scale] duration-150 ease-(--ease-out) hover:bg-foreground/8 active:scale-95',
        },
      }}
    />
  );
}
