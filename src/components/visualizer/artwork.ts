import type { QueueItem } from '@/lib/catalog';

/** 大・中の版があるニコニコの表紙（末尾が「番号.番号」）。catalog.ts の sourceOf が、中の版（.M）にしてから渡す */
const SIZED_NICONICO = /\/\d+\.\d+(\.M)?$/;

/**
 * Vocafy Visualizer に送る表紙の候補を、大きいものから。アプリは読めた最初の1枚を使う。
 * ニコニコの表紙は、新しい動画だけ末尾に .L（大）・.M（中）を付けた版がある。曲の表紙（thumb）はもう .M が付いているので、
 * 外してから付け直す。前は付いたまま .L・.M を足していて、どちらも 404 になり、大の版が一度も使われなかった（2026-10-12 に確かめた）。
 * 古い動画（末尾が番号だけ）は付けない版だけ
 */
export function artworkOf(item: Pick<QueueItem, 'service' | 'videoId' | 'thumb'>): string[] {
  if (item.service === 'youtube') {
    // maxresdefault は古い動画に無いことがある
    return ['maxresdefault', 'hqdefault', 'mqdefault'].map(
      (name) => `https://i.ytimg.com/vi/${item.videoId}/${name}.jpg`,
    );
  }
  if (!SIZED_NICONICO.test(item.thumb)) return [item.thumb];
  const base = item.thumb.replace(/\.M$/, '');
  return [`${base}.L`, `${base}.M`];
}
