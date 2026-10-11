'use client';

import dynamic from 'next/dynamic';
import { type ReactNode, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePwa } from 'use-pwa';
import { isAppleDevice } from '@/lib/apple-device';
import { Icon } from './icon';
import { sidebarRow } from './surface-styles';
import { ICON, PILL } from './button-styles';
import { Heading, SECTION } from './heading';
import { useClientValue } from '@/lib/client-value';
import { defineText } from '@/i18n/text';
import { useText } from '@/i18n/navigation';

const TEXT = defineText({
  ja: {
    app: 'アプリ',
    addToHome: 'ホーム画面に追加',
    install: 'アプリをインストール',
    installLabel: 'アプリをホーム画面に追加',
    guideDescription: 'ホーム画面から Vocafy をすばやく開けます。',
    guideShare: '共有ボタンをタップ',
    guideAdd: '「ホーム画面に追加」をタップ',
  },
  en: {
    app: 'App',
    addToHome: 'Add to Home Screen',
    install: 'Install app',
    installLabel: 'Add the app to your Home Screen',
    guideDescription: 'Open Vocafy quickly from your Home Screen.',
    guideShare: 'Tap the Share button',
    guideAdd: 'Tap "Add to Home Screen"',
  },
});

/** 案内の板を出すまで待つ時間（ミリ秒）。押してすぐ出すと、押した操作の続きで閉じることがある */
const PROMPT_DELAY_MS = 100;

const PWAPrompt = dynamic(() => import('react-ios-pwa-prompt'), { ssr: false });

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
  const isApple = useClientValue(isAppleDevice, false);
  const t = useText(TEXT);

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
              copyTitle={t.addToHome}
              copyDescription={t.guideDescription}
              copyShareStep={t.guideShare}
              copyAddToHomeScreenStep={t.guideAdd}
              delay={PROMPT_DELAY_MS}
            />,
            document.body,
          )
        : null,
  };
}

/** 設定の画面の「アプリ」の欄。追加できる端末で、まだ入れていないときだけ出す */
export function InstallApp() {
  const { available, start, guide } = useInstall();
  const t = useText(TEXT);
  if (!available) return null;
  return (
    <section className={SECTION}>
      <div className="mb-3">
        <Heading eyebrow="App">{t.app}</Heading>
      </div>
      <button type="button" onClick={start} className={PILL}>
        {t.addToHome}
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
  const t = useText(TEXT);
  if (!available) return null;
  if (menu) {
    return (
      <>
        <button
          type="button"
          onClick={start}
          className={`${sidebarRow(false)} w-full ${className}`}
        >
          <Icon name="install" />
          {t.install}
        </button>
        {guide}
      </>
    );
  }
  return (
    <>
      <button
        type="button"
        aria-label={t.installLabel}
        onClick={start}
        className={`grid ${ICON} text-muted hover:text-foreground md:flex md:size-auto md:gap-1.5 md:border md:border-line/60 md:bg-glass md:px-3.5 md:py-2 md:text-sm md:font-bold md:text-foreground md:hover:bg-hover ${className}`}
      >
        <Icon name="install" className="size-5" />
        <span className="hidden whitespace-nowrap md:inline">{t.app}</span>
      </button>
      {guide}
    </>
  );
}
