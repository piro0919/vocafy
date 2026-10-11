import { useEffect } from 'react';
import type { QueueItem } from '@/lib/catalog';
import { useClientValue } from '@/lib/client-value';

/** 住所の ?song= の曲の id。無いか形が違えば null */
export function songParam(search: string): number | null {
  const id = Number(new URLSearchParams(search).get('song'));
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

const readSong = () => songParam(window.location.search);

/**
 * 共有されたり読み込み直したりした住所の曲（?song=曲の id）。ページは作り置きなので、住所の ?song= はサーバーでは読まず
 * ブラウザで読む（サーバーで読むと開くたびに作り直しになり、DB を起こす）
 */
export function useLinkedSong(): number | null {
  return useClientValue(readSong, null);
}

/**
 * 動画を大きく出す画面で、その画面の並びを流しているあいだ、住所に流している曲を入れる（?song=曲の id）。読み込み直したときや、
 * 住所をそのまま写して送ったときに、その曲から流せる。曲が変わるたびに履歴を増やさずに書き換える。
 * song はその画面の並びを流しているときの曲（流していなければ null。ラジオなどで別の並びの曲を、この画面の住所に指させない）。
 * path はその画面の住所で、ほかの画面へ移る途中（住所がもうこの画面のものでない）は書き換えない
 */
export function useSongInUrl(song: QueueItem | null, path: string) {
  const songId = song?.songId ?? null;
  useEffect(() => {
    if (songId === null) return;
    const url = new URL(window.location.href);
    if (url.pathname !== path) return;
    if (url.searchParams.get('song') === String(songId)) return;
    url.searchParams.set('song', String(songId));
    // 最初の引数は null にする（Next.js の資料のとおり）。今の履歴の中身（どの画面か）を写すと、画面を移る途中に
    // 前の画面の中身が新しい住所の履歴に紛れ込み、戻る操作が効かないことがあった
    window.history.replaceState(null, '', url);
  }, [songId, path]);
}
