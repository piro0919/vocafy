/**
 * Vocafy Visualizer（Mac のオマケのアプリ）と連携するか。はじめは連携しない。
 * 連携すると、このブラウザが手元の 127.0.0.1 につなぎに行き、Chrome がローカルネットワークの許可を一度求める。
 * 全員がつなぎに行くとアプリを入れていない人にも許可を求めるので、オンにした人だけにする
 */
const KEY = 'vocafy-visualizer';
const CHANGE_EVENT = 'vocafy-visualizer-change';

export function readVisualizer(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

export function setVisualizer(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, 'on');
    else localStorage.removeItem(KEY);
  } catch {
    // 保存できない窓では、この画面のあいだだけ効く
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeVisualizer(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}
