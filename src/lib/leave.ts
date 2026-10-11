import type { useRouter } from '@/i18n/navigation';
import { navigationDepth } from './navigation-state';
import { TIMING } from './timing';

/**
 * 動画の画面（ボカロPの画面など）から前の画面に戻る。流している曲は右下の窓に縮む。
 * 題名の部分を下へ引いたとき（player-stage.tsx）と、スマホの下の帯の縮めるボタン（player-bar.tsx）から呼ぶ。
 * サイトの中で戻る先が無いとき（いきなりこの画面に来たとき）は、トップへ
 */
export function leave(router: ReturnType<typeof useRouter>) {
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
