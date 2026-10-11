'use client';

import { useCallback, useEffect } from 'react';
import { hasSignInHint } from './auth-client';
import type { QueueItem } from './catalog';
import { mergeFresh, moveItem } from './list-ops';
import { createLocalList } from './local-list';
import { isStoredProducer, isStoredSong } from './stored-shapes';

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

/**
 * このタブで押した回数（足す・外す・並べ替え）。AccountSync が、アカウントの中身を取りに行っているあいだに押されたかを見る。
 * 押されていたら、届いた中身（押す前のもの）で手元を置き換えない
 */
let edits = 0;
export const favoriteEdits = () => edits;

/** お気に入りに残すボカロP。札に出すものだけ */
export type FavoriteProducer = {
  id: number;
  name: string;
  picture: string | null;
};

/** 種類ごとの入れ物（local-list.ts） */
function createStore<T>(
  key: string,
  kind: 'song' | 'producer',
  idOf: (item: T) => number,
  isItem: (value: unknown) => value is T,
) {
  const { read, write, useItems } = createLocalList(key, isItem);

  function useStore() {
    // サーバーでは空。ブラウザで読み直したときにハートが付く
    const items = useItems();
    const has = useCallback((id: number) => items.some((s) => idOf(s) === id), [items]);
    const toggle = useCallback((item: T) => {
      const now = read();
      const id = idOf(item);
      const on = !now.some((s) => idOf(s) === id);
      write(on ? [item, ...now] : now.filter((s) => idOf(s) !== id));
      edits += 1;
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

const songs = createStore<QueueItem>('vocafy-favorites', 'song', (s) => s.songId, isStoredSong);
const producers = createStore<FavoriteProducer>(
  'vocafy-favorite-producers',
  'producer',
  (p) => p.id,
  isStoredProducer,
);

export const useFavorites = songs.useStore;
export const useFavoriteProducers = producers.useStore;

/**
 * お気に入りの曲を1曲動かす。from の曲を、to の曲がいた位置へ。ログインしていれば、並びをアカウントにも送る
 */
export function moveFavoriteSong(from: number, to: number) {
  const next = moveItem(songs.read(), from, to, songs.idOf);
  if (!next) return;
  songs.write(next);
  edits += 1;
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

/**
 * ログアウトしたときに、手元の写し（そのアカウントのお気に入り）を消す。残すと、同じ端末で別のアカウントでログインしたときに、
 * 「この端末で初めてのログイン」として前の人のお気に入りが新しいアカウントに足された（2026-10-12 に本人と決めた）
 */
export function clearLocalFavorites() {
  songs.write([]);
  producers.write([]);
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
  ) => store.write(mergeFresh(store.read(), sent, got, store.idOf));
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
