import { TIMING } from './timing';

/**
 * コードから画面を移り始めて、まだ住所が変わっていないあいだか（i18n/navigation.tsx の useRouter が印を付け、
 * 住所が変わったら NavigationDepth が外す）。そのあいだに history.replaceState で住所を書き換えると、Next.js が
 * 書き換えた住所に合わせ直して、始めていた移動を取り消す。動画を縮めてトップへ移るのと同時に曲が替わると、
 * 曲の住所（?song=）の書き換えで移動が消え、前の画面に残った（2026-10-12 に CI の E2E で分かった。use-song-in-url.ts）。
 * 移動が取りやめになっても印が残り続けないよう、決まった時間で外す
 */
let pending = false;
let timer: ReturnType<typeof setTimeout> | undefined;

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
