'use client';

import { useSyncExternalStore } from 'react';

/**
 * 最近の検索の言葉。検索の結果を押したときの言葉を、このブラウザの localStorage に新しい順で残す。
 * 打っただけの言葉（途中の「は」「はる」など）は残さない。アカウントには送らない
 */
const KEY = 'vocafy-recent-searches';
const LIMIT = 8;
const CHANGED = `${KEY}-changed`;

const empty: string[] = [];
let cached: { raw: string | null; items: string[] } = { raw: null, items: empty };

function read(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // 開けない窓では空として扱う
  }
  if (raw !== cached.raw) {
    let items = empty;
    try {
      items = raw ? (JSON.parse(raw) as string[]) : empty;
    } catch {
      // 壊れていたら空として扱う
    }
    cached = { raw, items };
  }
  return cached.items;
}

function write(items: string[]) {
  try {
    if (items.length === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
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

/** 言葉を先頭に足す。同じ言葉があれば先頭へ移す */
export function addRecentSearch(q: string) {
  const now = read();
  if (now[0] === q) return;
  write([q, ...now.filter((s) => s !== q)].slice(0, LIMIT));
}

export function clearRecentSearches() {
  write([]);
}

export function useRecentSearches(): string[] {
  return useSyncExternalStore(subscribe, read, () => empty);
}
