import type { useRouter } from '@bprogress/next/app';

/**
 * サイトの中で進んだ画面の数（NavigationDepth が数える）。0 のときに「戻る」を押すと、ブラウザの履歴に残っている
 * サイトの外のページへ戻ってしまう（共有のリンクを同じタブで開いた人なら X など。2026-10-12 に確かめた）
 */
let depth = 0;

export function setNavigationDepth(next: number) {
  depth = next;
}

export function navigationDepth() {
  return depth;
}

/**
 * 動画の画面（ボカロPの画面など）から前の画面に戻る。流している曲は右下の窓に縮む。
 * 題名の部分を下へ引いたとき（player-stage.tsx）と、スマホの下の帯の縮めるボタン（player-bar.tsx）から呼ぶ。
 * サイトの中で戻る先が無いとき（いきなりこの画面に来たとき）は、トップへ
 */
export function leave(router: ReturnType<typeof useRouter>) {
  if (depth > 0) router.back({ showProgress: false });
  else router.push('/');
}
