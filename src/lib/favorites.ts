'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { QueueItem } from './catalog';

/**
 * お気に入りの曲。アカウントは作らず、このブラウザの localStorage に残す（ほかの端末とは分け合わない）。
 * お気に入りの画面を DB を読まずに出せるよう、曲の id だけでなく、流すのに要る情報（QueueItem）ごと残す。
 * 並びは足した順の新しいものが先
 */
const KEY = 'vocafy-favorites';
/** 同じタブの中で足し引きしたことを知らせる合図。ほかのタブの変化は storage の合図で届く */
const CHANGED = 'vocafy-favorites-changed';

const EMPTY: QueueItem[] = [];
let cached: { raw: string | null; items: QueueItem[] } = { raw: null, items: EMPTY };

function read(): QueueItem[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // 開けない（プライベートブラウズなど）。お気に入りは空として扱う
  }
  // useSyncExternalStore は同じ中身なら同じ配列を返す必要があるので、読んだ文字列が変わったときだけ作り直す
  if (raw !== cached.raw) {
    let items = EMPTY;
    try {
      items = raw ? (JSON.parse(raw) as QueueItem[]) : EMPTY;
    } catch {
      // 壊れていたら空として扱う
    }
    cached = { raw, items };
  }
  return cached.items;
}

function write(items: QueueItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // 残せない環境。この画面を開いている間だけ覚えておく手もあるが、黙って諦める
    return;
  }
  window.dispatchEvent(new Event(CHANGED));
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) onChange();
  };
  window.addEventListener(CHANGED, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

export function useFavorites() {
  // サーバーでは localStorage を読めないので空にする。ブラウザで読み直したときにハートが付く
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);
  const has = useCallback((songId: number) => items.some((s) => s.songId === songId), [items]);
  const toggle = useCallback((song: QueueItem) => {
    const now = read();
    write(
      now.some((s) => s.songId === song.songId)
        ? now.filter((s) => s.songId !== song.songId)
        : [song, ...now],
    );
  }, []);
  return { items, has, toggle };
}
