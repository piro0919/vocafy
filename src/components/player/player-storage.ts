/** 音量・ループ・ランダムの設定を、このブラウザ（localStorage）に残す */
import type { Repeat } from './player-types';

const VOLUME_KEY = 'vocafy-volume';
const PLAYBACK_KEY = 'vocafy-playback';

/** 残しておいたループとランダムの設定。読めなければ、ループは全体、ランダムは切 */
export function savedPlayback(): { repeat: Repeat; shuffle: boolean } {
  try {
    const saved = JSON.parse(localStorage.getItem(PLAYBACK_KEY) ?? 'null') as {
      repeat?: unknown;
      shuffle?: unknown;
    } | null;
    return { repeat: saved?.repeat === 'one' ? 'one' : 'all', shuffle: saved?.shuffle === true };
  } catch {
    return { repeat: 'all', shuffle: false };
  }
}

export function savePlayback(value: { repeat: Repeat; shuffle: boolean }) {
  try {
    localStorage.setItem(PLAYBACK_KEY, JSON.stringify(value));
  } catch {
    // 保存できない窓では、開き直すと元に戻る
  }
}

/** 残しておいた音量と消音。読めなければ 100 で消音なし */
export function savedVolume(): { volume: number; muted: boolean } {
  try {
    const saved = JSON.parse(localStorage.getItem(VOLUME_KEY) ?? 'null') as {
      volume?: unknown;
      muted?: unknown;
    } | null;
    const volume =
      typeof saved?.volume === 'number' ? Math.min(100, Math.max(0, saved.volume)) : 100;
    return { volume, muted: saved?.muted === true };
  } catch {
    return { volume: 100, muted: false };
  }
}

export function saveVolume(volume: number, muted: boolean) {
  try {
    localStorage.setItem(VOLUME_KEY, JSON.stringify({ volume, muted }));
  } catch {
    // 保存できない窓では、開き直すと 100 に戻る
  }
}

const DOCK_SIDE_KEY = 'vocafy-dock-side';
/** 窓を寄せる側を変えたときの知らせ。設定の画面の選択と、大きな置き場所へ移るときの出発点（use-frame-layout.ts）が受ける */
export const DOCK_SIDE_EVENT = 'vocafy-dock-side-change';

/** 右下の窓を寄せる側。設定の画面（dock-setting.tsx）か、帯を横に引いて変える（dock-strip.tsx）。読めなければ右 */
export type DockSide = 'left' | 'right';

export function savedDockSide(): DockSide {
  try {
    return localStorage.getItem(DOCK_SIDE_KEY) === 'left' ? 'left' : 'right';
  } catch {
    return 'right';
  }
}

/** 寄せる側を残し、html の data-dock を書き換える（窓・帯・板はこれを見て並ぶ） */
export function saveDockSide(side: DockSide) {
  try {
    if (side === 'left') localStorage.setItem(DOCK_SIDE_KEY, 'left');
    else localStorage.removeItem(DOCK_SIDE_KEY);
  } catch {
    // 保存できない窓では、開き直すと右に戻る
  }
  document.documentElement.dataset.dock = side;
  window.dispatchEvent(new Event(DOCK_SIDE_EVENT));
}

/** useSyncExternalStore 用 */
export function subscribeDockSide(onChange: () => void): () => void {
  window.addEventListener(DOCK_SIDE_EVENT, onChange);
  return () => window.removeEventListener(DOCK_SIDE_EVENT, onChange);
}
