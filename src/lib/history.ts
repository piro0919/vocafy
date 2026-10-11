'use client';

import type { QueueItem } from './catalog';
import { createLocalList } from './local-list';
import { isStoredSong } from './stored-shapes';

/**
 * 視聴履歴。流し始めた曲を、このブラウザの localStorage に新しい順で残す。
 * お気に入りと同じく、画面を DB を読まずに出せるよう、流すのに要る QueueItem ごと残す。
 * アカウントには送らない（ほかの端末とは分け合わない）。同じ曲をもう一度聴いたら先頭へ移す
 */
const KEY = 'vocafy-history';
/** 残す曲の数。それより古いものは消す */
const LIMIT = 100;
const { read, write, useItems } = createLocalList(KEY, isStoredSong);

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
  return useItems();
}
