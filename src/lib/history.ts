'use client';

import { useSyncExternalStore } from 'react';
import type { QueueItem } from './catalog';

/**
 * 視聴履歴。流し始めた曲を、このブラウザの localStorage に新しい順で残す。
 * お気に入りと同じく、画面を DB を読まずに出せるよう、流すのに要る QueueItem ごと残す。
 * アカウントには送らない（ほかの端末とは分け合わない）。同じ曲をもう一度聴いたら先頭へ移す
 */
const KEY = 'vocafy-history';
/** 残す曲の数。それより古いものは消す */
const LIMIT = 100;
/** 同じタブの中で書き換えたことを知らせる合図。ほかのタブの変化は storage の合図で届く */
const CHANGED = `${KEY}-changed`;

const empty: QueueItem[] = [];
let cached: { raw: string | null; items: QueueItem[] } = { raw: null, items: empty };

function read(): QueueItem[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // 開けない（プライベートブラウズなど）。履歴は空として扱う
  }
  // useSyncExternalStore は同じ中身なら同じ配列を返す必要があるので、読んだ文字列が変わったときだけ作り直す
  if (raw !== cached.raw) {
    let items = empty;
    try {
      items = raw ? (JSON.parse(raw) as QueueItem[]) : empty;
    } catch {
      // 壊れていたら空として扱う
    }
    cached = { raw, items };
  }
  return cached.items;
}

function write(items: QueueItem[]) {
  try {
    if (items.length === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // 残せない環境。黙って諦める
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

/** 流し始めた曲を先頭に足す。すでにあれば先頭へ移す */
export function addToHistory(item: QueueItem) {
  const now = read();
  if (now[0]?.songId === item.songId) return;
  write([item, ...now.filter((s) => s.songId !== item.songId)].slice(0, LIMIT));
}

export function clearHistory() {
  write([]);
}

/** 消した履歴を戻す（削除の知らせの「元に戻す」）。消したあとに聴いた曲は先頭に残す */
export function restoreHistory(items: QueueItem[]) {
  const now = read();
  const added = new Set(now.map((s) => s.songId));
  write([...now, ...items.filter((s) => !added.has(s.songId))].slice(0, LIMIT));
}

export function useHistory(): QueueItem[] {
  // サーバーでは localStorage を読めないので空にする
  return useSyncExternalStore(subscribe, read, () => empty);
}
