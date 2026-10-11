import { stripLang } from '@/i18n/config';
import { TIMING } from './timing';

/**
 * 画面の移動の状態（ブラウザのタブに1つ）。前は leave.ts と pending-navigation.ts に分かれていた（2026-10-12 にまとめた）。
 * ここだけが持ち、書き換えるのは次の2か所だけ。leave.ts と use-song-in-url.ts は読むだけ
 * - i18n/navigation.tsx（useRouter の push・replace と Link）: 移り始めた（startNavigationTo）、置き換えで移る先（markReplace）
 * - NavigationDepth（住所が変わったとき）: arrived
 */

/**
 * サイトの中で進んだ画面の数。0 のときに「戻る」を押すと、ブラウザの履歴に残っているサイトの外のページへ戻ってしまう
 * （共有のリンクを同じタブで開いた人なら X など。2026-10-12 に確かめた。leave.ts）
 */
let depth = 0;

/**
 * 置き換え（router.replace）で移る先の住所（言語を外したもの）。置き換えは履歴を増やさないので、着いても数を進めない。
 * アプリを開いたときに前回の画面へ置き換えで移ると（page-restore.tsx）、進めた数のせいで縮める操作が「戻る」になり、
 * 戻る先の無い履歴へ戻ろうとして画面から出られなかった（2026-10-12）
 */
let replacing: string | null = null;

/**
 * 画面を移り始めて、まだ住所が変わっていないあいだか。そのあいだに history.replaceState で住所を書き換えると、Next.js が
 * 書き換えた住所に合わせ直して、始めていた移動を取り消す。動画を縮めてトップへ移るのと同時に曲が替わると、
 * 曲の住所（?song=）の書き換えで移動が消え、前の画面に残った（2026-10-12 に CI の E2E で分かった。use-song-in-url.ts）。
 * 印を付けるのは、住所（言語を外した path）の変わる移動だけ。変わらない移動（検索の ?q= の書き換え）で付けると、
 * 外す機会が無く、保険の時間が切れるまで曲の住所を書き換えられなかった。
 * 移動が取りやめになっても印が残り続けないよう、決まった時間で外す
 */
let pending = false;
let timer: ReturnType<typeof setTimeout> | undefined;

export function navigationDepth(): number {
  return depth;
}

/** テストと、数え直しが要るときだけ使う */
export function setNavigationDepth(next: number) {
  depth = next;
}

export function navigationPending(): boolean {
  return pending;
}

export function startNavigation() {
  pending = true;
  clearTimeout(timer);
  timer = setTimeout(endNavigation, TIMING.navigationLimit);
}

export function endNavigation() {
  pending = false;
  clearTimeout(timer);
}

/** href（頭に言語の付かない住所でも付いた住所でもよい）へ移り始める。いまと同じ path か、サイトの外なら印を付けない */
export function startNavigationTo(href: string) {
  if (!href.startsWith('/') || href.startsWith('//')) return;
  const path = stripLang(href.split(/[?#]/)[0] || '/');
  if (path === stripLang(window.location.pathname)) return;
  startNavigation();
}

/** 置き換えで移る先を覚える。住所の変わらない置き換え（検索の ?q=）は、着いたと見分けられないので覚えない */
export function markReplace(path: string, from: string) {
  if (path !== from) replacing = path;
}

/**
 * 住所が path に変わった（NavigationDepth が呼ぶ。開いた最初の住所では呼ばない）。移動中の印を外し、
 * 置き換えで移った先なら数えない。ブラウザの「戻る」「進む」で変わったとき（popped）は1つ戻し、それ以外は1つ進める。
 * 「進む」と「戻る」は見分けられないので、「進む」でも戻す（そのときは縮める操作がトップへ移る側に倒れ、サイトの外には出ない）
 */
export function arrived(path: string, popped: boolean) {
  endNavigation();
  if (replacing === path) {
    replacing = null;
    return;
  }
  depth = Math.max(0, depth + (popped ? -1 : 1));
}
