import { stripLang } from '@/i18n/config';
import { TIMING } from './timing';

/**
 * 画面を移り始めて、まだ住所が変わっていないあいだか（i18n/navigation.tsx の useRouter の push・replace と Link を押したときに
 * 印を付け、住所が変わったら NavigationDepth が外す）。そのあいだに history.replaceState で住所を書き換えると、Next.js が
 * 書き換えた住所に合わせ直して、始めていた移動を取り消す。動画を縮めてトップへ移るのと同時に曲が替わると、
 * 曲の住所（?song=）の書き換えで移動が消え、前の画面に残った（2026-10-12 に CI の E2E で分かった。use-song-in-url.ts）。
 * 印を付けるのは、住所（言語を外した path）の変わる移動だけ。変わらない移動（検索の ?q= の書き換え）で付けると、
 * NavigationDepth が外す機会が無く、保険の時間が切れるまで曲の住所を書き換えられなかった（2026-10-12 に直した）。
 * 移動が取りやめになっても印が残り続けないよう、決まった時間で外す
 */
let pending = false;
let timer: ReturnType<typeof setTimeout> | undefined;

/** href（頭に言語の付かない住所でも付いた住所でもよい）へ移り始める。いまと同じ path か、サイトの外なら印を付けない */
export function startNavigationTo(href: string) {
  if (!href.startsWith('/') || href.startsWith('//')) return;
  const path = stripLang(href.split(/[?#]/)[0] || '/');
  if (path === stripLang(window.location.pathname)) return;
  startNavigation();
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

export function navigationPending(): boolean {
  return pending;
}
