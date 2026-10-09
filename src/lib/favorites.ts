'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { QueueItem } from './catalog';

/**
 * お気に入りの曲とボカロP。アカウントは作らず、このブラウザの localStorage に残す（ほかの端末とは分け合わない）。
 * お気に入りの画面を DB を読まずに出せるよう、id だけでなく、出すのに要る情報ごと残す
 * （曲は流すのに要る QueueItem、ボカロPは名前とアイコン）。並びは足した順の新しいものが先
 */

/** お気に入りに残すボカロP。札に出すものだけ */
export type FavoriteProducer = {
  id: number;
  name: string;
  picture: string | null;
};

/** 種類ごとの入れ物。読むのはここの1か所にまとめ、中身が変わったときだけ読み直す */
function createStore<T>(key: string, idOf: (item: T) => number) {
  /** 同じタブの中で足し引きしたことを知らせる合図。ほかのタブの変化は storage の合図で届く */
  const changed = `${key}-changed`;
  const empty: T[] = [];
  let cached: { raw: string | null; items: T[] } = { raw: null, items: empty };

  function read(): T[] {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      // 開けない（プライベートブラウズなど）。お気に入りは空として扱う
    }
    // useSyncExternalStore は同じ中身なら同じ配列を返す必要があるので、読んだ文字列が変わったときだけ作り直す
    if (raw !== cached.raw) {
      let items = empty;
      try {
        items = raw ? (JSON.parse(raw) as T[]) : empty;
      } catch {
        // 壊れていたら空として扱う
      }
      cached = { raw, items };
    }
    return cached.items;
  }

  function write(items: T[]) {
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch {
      // 残せない環境。この画面を開いている間だけ覚えておく手もあるが、黙って諦める
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

  return function useStore() {
    // サーバーでは localStorage を読めないので空にする。ブラウザで読み直したときにハートが付く
    const items = useSyncExternalStore(subscribe, read, () => empty);
    const has = useCallback((id: number) => items.some((s) => idOf(s) === id), [items]);
    const toggle = useCallback((item: T) => {
      const now = read();
      const id = idOf(item);
      write(now.some((s) => idOf(s) === id) ? now.filter((s) => idOf(s) !== id) : [item, ...now]);
    }, []);
    return { items, has, toggle };
  };
}

export const useFavorites = createStore<QueueItem>('vocafy-favorites', (s) => s.songId);

export const useFavoriteProducers = createStore<FavoriteProducer>(
  'vocafy-favorite-producers',
  (p) => p.id,
);
