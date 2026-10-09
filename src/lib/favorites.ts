'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { hasSignInHint } from './auth-client';
import type { QueueItem } from './catalog';

/**
 * お気に入りの曲とボカロP。このブラウザの localStorage に残す。
 * お気に入りの画面を DB を読まずに出せるよう、id だけでなく、出すのに要る情報ごと残す
 * （曲は流すのに要る QueueItem、ボカロPは名前とアイコン）。並びは足した順の新しいものが先で、曲は手で並べ替えられる。
 *
 * ログインしているあいだは、アカウントのお気に入り（/api/favorites）が元で、localStorage はその写しになる。
 * 押すたびに手元を書き換えてからアカウントにも送る。アカウントから読んで写しを置き換えるのは AccountSync
 */

/** ログインしているか。AccountSync が決める。ログインしていれば、押したぶんをアカウントにも送る */
let signedIn = false;

export function setSignedIn(value: boolean) {
  signedIn = value;
}

/** お気に入りに残すボカロP。札に出すものだけ */
export type FavoriteProducer = {
  id: number;
  name: string;
  picture: string | null;
};

/** 種類ごとの入れ物。読むのはここの1か所にまとめ、中身が変わったときだけ読み直す */
function createStore<T>(key: string, kind: 'song' | 'producer', idOf: (item: T) => number) {
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

  function useStore() {
    // サーバーでは localStorage を読めないので空にする。ブラウザで読み直したときにハートが付く
    const items = useSyncExternalStore(subscribe, read, () => empty);
    const has = useCallback((id: number) => items.some((s) => idOf(s) === id), [items]);
    const toggle = useCallback((item: T) => {
      const now = read();
      const id = idOf(item);
      const on = !now.some((s) => idOf(s) === id);
      write(on ? [item, ...now] : now.filter((s) => idOf(s) !== id));
      if (signedIn) {
        // 送れなくても手元は変わったまま。次に開いたときにアカウントの中身で置き換わる
        fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind, id, on }),
        }).catch(() => {});
      }
    }, []);
    return { items, has, toggle };
  }

  return { useStore, read, write, idOf };
}

const songs = createStore<QueueItem>('vocafy-favorites', 'song', (s) => s.songId);
const producers = createStore<FavoriteProducer>(
  'vocafy-favorite-producers',
  'producer',
  (p) => p.id,
);

export const useFavorites = songs.useStore;
export const useFavoriteProducers = producers.useStore;

/**
 * お気に入りの曲を1曲動かす。from の曲を、to の曲がいた位置へ。ログインしていれば、並びをアカウントにも送る
 */
export function moveFavoriteSong(from: number, to: number) {
  const now = songs.read();
  const i = now.findIndex((s) => s.songId === from);
  const j = now.findIndex((s) => s.songId === to);
  if (i < 0 || j < 0 || i === j) return;
  const next = [...now];
  const [moved] = next.splice(i, 1);
  next.splice(j, 0, moved!);
  songs.write(next);
  if (signedIn) {
    // 送れなくても手元は並べ替えたまま。次に開いたときにアカウントの並びに戻る
    fetch('/api/favorites', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songs: next.map(songs.idOf) }),
    }).catch(() => {});
  }
}

/** 手元のお気に入りの id。初めてログインした端末で、アカウントに足すのに使う */
export function localFavoriteIds() {
  return { songs: songs.read().map(songs.idOf), producers: producers.read().map(producers.idOf) };
}

/** 手元の写しを、アカウントのお気に入りで置き換える */
export function replaceFavorites(next: { songs: QueueItem[]; producers: FavoriteProducer[] }) {
  songs.write(next.songs);
  producers.write(next.producers);
}

/** 手元のお気に入りを最後に引き直した時刻。引き直すのは1日1回まで（開くたびに関数と DB を起こさないため） */
const REFRESHED_KEY = 'vocafy-favorites-refreshed';
const REFRESH_EVERY = 24 * 60 * 60 * 1000;

/**
 * 手元のお気に入りを、いまの情報で引き直す（/api/favorites/fresh）。足したときの情報のままだと、
 * 動画の差し替えや表紙・名前の変化が反映されない。流せなくなった曲と台帳から消えた人は外す。
 * 待っているあいだに足したものはそのまま残す。ログインしている人は AccountSync がアカウントの中身で置き換えるので引き直さない
 */
async function refreshFavorites() {
  const sentSongs = songs.read();
  const sentProducers = producers.read();
  if (sentSongs.length + sentProducers.length === 0) return;
  const res = await fetch('/api/favorites/fresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      songs: sentSongs.map(songs.idOf),
      producers: sentProducers.map(producers.idOf),
    }),
  });
  if (!res.ok) return;
  const fresh = (await res.json()) as { songs: QueueItem[]; producers: FavoriteProducer[] };
  if (signedIn) return;
  const merge = <T>(
    store: { read: () => T[]; write: (items: T[]) => void; idOf: (item: T) => number },
    sent: T[],
    got: T[],
  ) => {
    const sentIds = new Set(sent.map(store.idOf));
    const byId = new Map(got.map((item) => [store.idOf(item), item]));
    store.write(
      store.read().flatMap((item) => {
        const id = store.idOf(item);
        if (!sentIds.has(id)) return [item];
        const now = byId.get(id);
        return now ? [now] : [];
      }),
    );
  };
  merge(songs, sentSongs, fresh.songs);
  merge(producers, sentProducers, fresh.producers);
  try {
    localStorage.setItem(REFRESHED_KEY, String(Date.now()));
  } catch {
    // 残せなければ、次に開いたときにまた引き直す
  }
}

/** お気に入りの画面で呼ぶ。前に引き直してから1日たっていれば、いまの情報で引き直す */
export function useRefreshFavorites() {
  useEffect(() => {
    // ログインしたことのある端末は、AccountSync がアカウントの中身で置き換える
    if (signedIn || hasSignInHint()) return;
    let last = 0;
    try {
      last = Number(localStorage.getItem(REFRESHED_KEY)) || 0;
    } catch {
      return;
    }
    if (Date.now() - last < REFRESH_EVERY) return;
    void refreshFavorites().catch(() => {});
  }, []);
}
