import type { useRouter } from '@bprogress/next/app';

/**
 * 動画の画面（ボカロPの画面など）から前の画面に戻る。流している曲は右下の窓に縮む。
 * 題名の部分を下へ引いたとき（player-stage.tsx）と、スマホの下の帯の縮めるボタン（player-bar.tsx）から呼ぶ。
 * いきなりこの画面に来たときは戻る先が無いので、トップへ
 */
export function leave(router: ReturnType<typeof useRouter>) {
  if (window.history.length > 1) router.back({ showProgress: false });
  else router.push('/');
}
