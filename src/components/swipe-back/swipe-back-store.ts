import { createLocalFlag } from '@/lib/local-flag';

/**
 * 「スワイプで戻る」の設定。koidamashii の src/lib/swipe-back.ts を写した（2026-10-07）。このブラウザに残す。
 * iPhone・iPad のホーム画面から開くとブラウザの戻るボタンが無く、詳細画面ではヘッダーと下のタブも出さないので、
 * 画面の端からのスワイプで戻れるようにする（swipe-back.tsx）。iOS の版によってはシステムの戻るスワイプも効き、
 * 二重に戻らないとは言い切れないので、はじめはオフにして、使うかどうかは本人に任せる。
 *
 * 左端は戻る。右端は戻るか進むかを選べる。はじめは戻る
 */
const CHANGE_EVENT = 'vocafy-swipe-back-change';
const enabled = createLocalFlag({
  key: 'vocafy-swipe-back',
  value: 'on',
  stored: true,
  event: CHANGE_EVENT,
});
/** 右端で進むか（入）、戻るか（切。はじめ） */
const forward = createLocalFlag({
  key: 'vocafy-swipe-back-right',
  value: 'forward',
  stored: true,
  event: CHANGE_EVENT,
});

export type RightEdge = 'back' | 'forward';

/** iPhone・iPad でホーム画面から開いているか。navigator.standalone は iOS・iPadOS の Safari だけにある */
export function isIosStandalone(): boolean {
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export const swipeBackEnabled = enabled.read;
export const setSwipeBack = enabled.write;

export const rightEdge = (): RightEdge => (forward.read() ? 'forward' : 'back');
export const setRightEdge = (value: RightEdge) => forward.write(value === 'forward');

/** useSyncExternalStore 用。設定が切り替わったら知らせる（2つの設定で同じ合図を使う） */
export const subscribeSwipeBack = enabled.subscribe;
