import type { QueueItem } from '@/lib/catalog';
import { isAppleDevice } from '@/lib/apple-device';
import { createLocalFlag } from '@/lib/local-flag';

/**
 * YouTube の動画が配信の音源から自動で作られた静止画の動画（Topic）で、ニコニコに本家（PV）がある曲を、どちらで流すか
 * （2026-10-12 に本人と決めた）。設定の画面の pv-setting.tsx で選ぶ。はじめは YouTube（音質を取る）で、ニコニコを選んだときだけ残す。
 * ニコニコの古い動画は音質が落ちるので、音と絵のどちらを取るかは人に任せる。
 * iPad・iPhone はいつも YouTube。ニコニコの曲は自動で次へ進むたびに止められる（CLAUDE.md の「分かっている問題」）ので、設定も出さない
 */
const flag = createLocalFlag({ key: 'vocafy-niconico-pv', value: '1', stored: true });

export const savedPvChoice = flag.read;
export const savePvChoice = flag.write;
export const subscribePvChoice = flag.subscribe;

/** 設定を出す端末か */
export const choosesPv = () => !isAppleDevice();

/** 並びに入れた配列ごとの、ニコニコに差し替えた配列。同じ配列を渡されたら同じ配列を返し、同じ並びの中で移るときに流す順を作り直させない（queue-state.ts の moveTo） */
const swapped = new WeakMap<QueueItem[], QueueItem[]>();
const made = new WeakSet<QueueItem[]>();

/**
 * 並びに入れる曲を、設定に合わせてニコニコの PV に差し替える。差し替えない設定の端末、差し替える曲が無い並びは、そのまま返す。
 * 設定を変えても、いま流している並びは次に流し直すまで変わらない
 */
export function withPv(items: QueueItem[]): QueueItem[] {
  if (made.has(items) || !items.some((s) => s.pv) || !choosesPv() || !savedPvChoice()) return items;
  const known = swapped.get(items);
  if (known) return known;
  const next = items.map((s) => {
    if (!s.pv) return s;
    const { pv, ...rest } = s;
    return { ...rest, service: 'niconico' as const, ...pv };
  });
  swapped.set(items, next);
  made.add(next);
  return next;
}
