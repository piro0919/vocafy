/**
 * 「スワイプで戻る」の設定。koidamashii の src/lib/swipe-back.ts を写した（2026-10-07）。このブラウザに残す。
 * iPhone・iPad のホーム画面から開くとブラウザの戻るボタンが無く、詳細画面ではヘッダーと下のタブも出さないので、
 * 画面の端からのスワイプで戻れるようにする（swipe-back.tsx）。iOS の版によってはシステムの戻るスワイプも効き、
 * 二重に戻らないとは言い切れないので、はじめはオフにして、使うかどうかは本人に任せる。
 *
 * 左端は戻る。右端は戻るか進むかを選べる。はじめは戻る
 */
const KEY = 'vocafy-swipe-back';
const RIGHT_KEY = 'vocafy-swipe-back-right';
const CHANGE_EVENT = 'vocafy-swipe-back-change';

export type RightEdge = 'back' | 'forward';

/** iPhone・iPad でホーム画面から開いているか。navigator.standalone は iOS・iPadOS の Safari だけにある */
export function isIosStandalone(): boolean {
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function swipeBackEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

export function setSwipeBack(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, 'on');
    else localStorage.removeItem(KEY);
  } catch {
    // 保存できない（プライベートブラウズなど）ときは、この画面のあいだだけ効く
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function rightEdge(): RightEdge {
  try {
    return localStorage.getItem(RIGHT_KEY) === 'forward' ? 'forward' : 'back';
  } catch {
    return 'back';
  }
}

export function setRightEdge(value: RightEdge): void {
  try {
    if (value === 'forward') localStorage.setItem(RIGHT_KEY, 'forward');
    else localStorage.removeItem(RIGHT_KEY);
  } catch {
    // 保存できないときは、この画面のあいだだけ効く
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** useSyncExternalStore 用。設定が切り替わったら知らせる */
export function subscribeSwipeBack(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}
