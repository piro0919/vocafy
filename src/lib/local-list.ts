'use client';

import { useSyncExternalStore } from 'react';

/**
 * 残した文字列を並びに戻す。読めないか並びでなければ空にし、形の違う要素だけを落とす。
 * localStorage の中身は、壊れていたり昔の形のままだったりする（null や {} を読んで、並びとして扱った画面が落ちた）
 */
export function parseList<T>(raw: string | null, isItem: (value: unknown) => value is T): T[] {
  if (!raw) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return [];
  }
  return Array.isArray(value) ? value.filter(isItem) : [];
}

/**
 * このブラウザの localStorage に、1つの鍵で並びを残す入れ物（お気に入り・視聴履歴）。
 * 読むのはここの1か所にまとめ、中身が変わったときだけ読み直す。開けない窓（プライベートブラウズなど）では空として扱い、
 * 書けなければ黙って諦める。同じタブの中の書き換えは独自の合図で、ほかのタブの書き換えは storage の合図で知らせる
 */
export function createLocalList<T>(key: string, isItem: (value: unknown) => value is T) {
  const changed = `${key}-changed`;
  const empty: T[] = [];
  let cached: { raw: string | null; items: T[] } = { raw: null, items: empty };

  function read(): T[] {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      // 開けない。空として扱う
    }
    // useSyncExternalStore は同じ中身なら同じ配列を返す必要があるので、読んだ文字列が変わったときだけ作り直す
    if (raw !== cached.raw) cached = { raw, items: raw ? parseList(raw, isItem) : empty };
    return cached.items;
  }

  function write(items: T[]) {
    try {
      if (items.length === 0) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(items));
    } catch {
      return;
    }
    window.dispatchEvent(new Event(changed));
  }

  function subscribe(onChange: () => void) {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) onChange();
    };
    window.addEventListener(changed, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(changed, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }

  /** サーバーでは localStorage を読めないので空にする */
  function useItems(): T[] {
    return useSyncExternalStore(subscribe, read, () => empty);
  }

  return { read, write, useItems };
}
