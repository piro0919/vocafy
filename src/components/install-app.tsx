'use client';

import dynamic from 'next/dynamic';
import { type ReactNode, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { usePwa } from 'use-pwa';
import { Icon } from './icon';

const PWAPrompt = dynamic(() => import('react-ios-pwa-prompt'), { ssr: false });

/** iOS / iPadOS か。iPad の Safari は Mac を名乗るので、触れる Mac は iPad とみなす */
function isAppleDevice(): boolean {
  const agent = window.navigator.userAgent.toLowerCase();
  return (
    /iphone|ipad|ipod/.test(agent) ||
    (agent.includes('macintosh') && window.navigator.maxTouchPoints > 1)
  );
}

/**
 * ホーム画面に追加する仕組み（koidamashii・spatto と同じ形）。
 * Chrome 系はブラウザの確認を出す。iOS は API が無いので、共有ボタンから追加する手順を案内する。
 * guide は iOS の案内の窓で、ボタンを置く側が描く。
 * 裏に回すと再生が止まるのは、ホーム画面から開いても変わらない（YouTube の埋め込みの決まり）
 */
function useInstall(): {
  available: boolean;
  start: () => void;
  guide: ReactNode;
} {
  const { canInstall, install, isInstalled } = usePwa();
  const [open, setOpen] = useState(false);
  // 端末の判定は window を見る。サーバー側では決まらないので、載ってから読む
  const isApple = useSyncExternalStore(
    () => () => {},
    isAppleDevice,
    () => false,
  );

  return {
    available: !isInstalled && (canInstall || isApple),
    start: () => (canInstall ? void install() : setOpen(true)),
    guide:
      isApple && !canInstall
        ? createPortal(
            <PWAPrompt
              isShown={open}
              onClose={() => setOpen(false)}
              appIconPath="/apple-icon.png"
              copyTitle="ホーム画面に追加"
              copyDescription="ホーム画面から Vocafy をすばやく開けます。"
              copyShareStep="共有ボタンをタップ"
              copyAddToHomeScreenStep="「ホーム画面に追加」をタップ"
              delay={100}
            />,
            document.body,
          )
        : null,
  };
}

/** 設定の画面の「アプリ」の欄。追加できる端末で、まだ入れていないときだけ出す */
export function InstallApp() {
  const { available, start, guide } = useInstall();
  if (!available) return null;
  return (
    <section className="mt-7 sm:mt-10">
      <h2 className="mb-3 font-bold">アプリ</h2>
      <button
        type="button"
        onClick={start}
        className="rounded-full border border-line/60 px-4 py-2 text-sm font-bold transition-[background-color,scale] duration-150 ease-out hover:bg-foreground/8 active:scale-95"
      >
        ホーム画面に追加
      </button>
      {guide}
    </section>
  );
}

/**
 * 「アプリ」のボタン。設定の画面だけでは気づかれにくいので、スマホは上の帯に、パソコンは左のメニューにも置く。
 * 追加できる端末で、まだ入れていないときだけ出す。menu は左のメニューの1行（ほかの項目と同じ形）
 */
export function InstallButton({ className = '', menu }: { className?: string; menu?: boolean }) {
  const { available, start, guide } = useInstall();
  if (!available) return null;
  if (menu) {
    return (
      <>
        <button
          type="button"
          onClick={start}
          className={`flex w-full items-center gap-4 rounded-lg px-3 py-2.5 text-sm font-bold text-muted transition-colors duration-150 hover:text-foreground ${className}`}
        >
          <Icon name="install" />
          アプリをインストール
        </button>
        {guide}
      </>
    );
  }
  return (
    <>
      <button
        type="button"
        aria-label="アプリをホーム画面に追加"
        onClick={start}
        className={`grid size-10 shrink-0 place-items-center rounded-full text-muted transition-[color,background-color,scale] duration-150 ease-out hover:text-foreground active:scale-95 md:flex md:size-auto md:gap-1.5 md:border md:border-line/60 md:bg-glass md:px-3.5 md:py-2 md:text-sm md:font-bold md:text-foreground md:hover:bg-foreground/8 ${className}`}
      >
        <Icon name="install" className="size-5" />
        <span className="hidden whitespace-nowrap md:inline">アプリ</span>
      </button>
      {guide}
    </>
  );
}
