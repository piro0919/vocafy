import type { useRouter } from '@/i18n/navigation';

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
 * 置き換え（router.replace）で移る先の住所（言語を外したもの）。置き換えは履歴を増やさないので、着いても数を進めない。
 * アプリを開いたときに前回の画面へ置き換えで移ると（page-restore.tsx）、進めた数のせいで縮める操作が「戻る」になり、
 * 戻る先の無い履歴へ戻ろうとして画面から出られなかった（2026-10-12）
 */
let replacing: string | null = null;

/** 置き換えで移る先を覚える。住所の変わらない置き換え（検索の ?q=）は、着いたと見分けられないので覚えない */
export function markReplace(path: string, from: string) {
  if (path !== from) replacing = path;
}

/** 着いた住所が置き換えで移った先か。当たったら印は外す */
export function arrivedByReplace(path: string): boolean {
  if (replacing !== path) return false;
  replacing = null;
  return true;
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
