import type { useRouter } from '@/i18n/navigation';
import { navigationDepth } from './navigation-state';
import { TIMING } from './timing';

/** Navigation API（Chromium・Safari 26 から）の分だけの形。TypeScript の型に、まだ入っていない */
type NavigationApi = {
  canGoBack: boolean;
  currentEntry?: { index: number } | null;
  entries?: () => { sameDocument: boolean }[];
};

/**
 * 「戻る」で、ページを読み込み直さずに前の画面へ移れるか。canGoBack は同じサイトの別のページ読み込みの履歴も数えるので、
 * 一つ前の項目が同じページ読み込みの中にあるかを見る。別のページ読み込み（Vocafy を開いていたタブで、共有のリンクなどの
 * Vocafy の住所を開き直した）へ戻ると、ページごと読み込み直されて流している曲が止まった（2026-10-14、Android の Chrome で）
 */
function backStaysInPage(api: NavigationApi): boolean {
  if (!api.canGoBack) return false;
  const index = api.currentEntry?.index;
  const entries = api.entries?.();
  if (index === undefined || !entries) return true;
  return entries[index - 1]?.sameDocument ?? false;
}

/**
 * 動画の画面（ボカロPの画面など）から前の画面に戻る。流している曲は右下の窓に縮む。
 * 題名の部分を下へ引いたとき（player-stage.tsx）と、スマホの下の帯の縮めるボタン（player-bar.tsx）から呼ぶ。
 * サイトの中で戻る先が無いとき（いきなりこの画面に来たとき）は、トップへ。
 *
 * 戻る先があるかは、ブラウザが Navigation API を持っていれば canGoBack で決める。canGoBack は同じサイトの履歴だけを数えるので、
 * 共有のリンクから来た人では false になり、サイトの外へは戻らない（2026-10-12 に替えた。前は「戻る」を押して 0.5 秒のうちに
 * 履歴が動かなければトップへ移る、時間で決め打ちした保険だけだった）。戻る先が別のページ読み込みのときもトップへ（backStaysInPage）。持たないブラウザ（2026-10 の Firefox など）は、
 * サイトの中で進んだ数（navigation-state.ts）と、その保険で決める
 */
export function leave(router: ReturnType<typeof useRouter>) {
  const api = (window as { navigation?: NavigationApi }).navigation;
  if (api && typeof api.canGoBack === 'boolean') {
    if (backStaysInPage(api)) router.back({ showProgress: false });
    else router.push('/');
    return;
  }
  if (navigationDepth() === 0) {
    router.push('/');
    return;
  }
  // 数え違いの保険。戻る先が無く履歴が動かなかったら（popstate が来なければ）、トップへ移る
  let moved = false;
  const onPop = () => {
    moved = true;
  };
  window.addEventListener('popstate', onPop, { once: true });
  router.back({ showProgress: false });
  setTimeout(() => {
    window.removeEventListener('popstate', onPop);
    if (!moved) router.push('/');
  }, TIMING.backFallback);
}
