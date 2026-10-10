'use client';

import { useRouter } from '@bprogress/next/app';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { readLastPage, saveLastPage } from './player/player-resume';

/** このタブで一度でも開いたか（sessionStorage）。アプリを開き直すと消えるので、開いた最初の1回だけを見分けられる */
const LAUNCHED_KEY = 'vocafy-launched';

/** ホーム画面に置いたアプリとして開いているか（iPhone・iPad は navigator.standalone、ほかは display-mode） */
function isApp(): boolean {
  return (
    matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * アプリを開いたときに、前回見ていた画面から始める（2026-10-11 に本人と決めた）。アプリはいつもトップから開くので、
 * 開いた最初の1回だけ、最後に見ていた画面が12時間以内（player-resume.ts）なら、そこへ移る。ブラウザでトップの住所を開いた人は
 * トップを見に来ているので移さない。設定の「前回の続きから始める」を切ると移さない。見ている画面は、移るたびに残す。画面には何も出さない
 */
export function PageRestore() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    let first = false;
    try {
      first = sessionStorage.getItem(LAUNCHED_KEY) === null;
      sessionStorage.setItem(LAUNCHED_KEY, '1');
    } catch {
      return;
    }
    if (!first || location.pathname !== '/' || !isApp()) return;
    const last = readLastPage();
    if (last && last !== '/') router.replace(last);
  }, [router]);

  useEffect(() => {
    saveLastPage(search ? `${pathname}?${search}` : pathname);
  }, [pathname, search]);

  return null;
}
