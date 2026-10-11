import type { QueueItem } from '@/lib/catalog';
import { buildOrder } from './play-order';
import type { ListSource } from './player-types';

/**
 * 並び（queue）と、いまの曲（index）と、流す順（order。並びの何番目をどの順で流すか）と、いま流す順の何番目にいるか（position）。
 * プレイヤーの知らせは作ったときの関数を持ち続けるので、player-provider.tsx はこれを ref に持って読む。
 * ここの関数は値を書き換えず、次の値を返すだけにする（テストできるように）
 */
export type Cursor = { queue: QueueItem[]; index: number; order: number[]; position: number };

export const EMPTY_CURSOR: Cursor = { queue: [], index: 0, order: [], position: 0 };

/** 流す順をそのまま使う。開き直したときに残しておいた順を戻すときなど */
export function withOrder(queue: QueueItem[], index: number, order: number[]): Cursor {
  return { queue, index, order, position: Math.max(0, order.indexOf(index)) };
}

/** 並びを index 番目から流し直す。流す順はいつも作り直す（ランダムなら index を先頭にして混ぜる） */
export function restart(queue: QueueItem[], index: number, shuffle: boolean): Cursor {
  return withOrder(queue, index, buildOrder(queue.length, index, shuffle));
}

/** 並びの index 番目へ移る。新しい並びなら流す順を作り直し、同じ並び（同じ配列）の中で移るだけなら流す順はそのまま */
export function moveTo(
  cursor: Cursor,
  queue: QueueItem[],
  index: number,
  shuffle: boolean,
): Cursor {
  return queue === cursor.queue
    ? withOrder(queue, index, cursor.order)
    : restart(queue, index, shuffle);
}

/** 並びの後ろに曲を足す。いまの曲と流す順はそのままで、足した曲を流す順の後ろに付ける（ランダムなら混ぜて） */
export function appendItems(cursor: Cursor, added: QueueItem[], shuffle: boolean): Cursor {
  const offset = cursor.queue.length;
  return {
    ...cursor,
    queue: [...cursor.queue, ...added],
    order: [...cursor.order, ...buildOrder(added.length, 0, shuffle).map((i) => offset + i)],
  };
}

/** items のうち、まだ並びに無い曲（一覧の続きのページや関連曲を足すとき、同じ曲を二度並べない） */
export function freshItems(queue: QueueItem[], items: QueueItem[]): QueueItem[] {
  const have = new Set(queue.map((s) => s.songId));
  return items.filter((s) => !have.has(s.songId));
}

/** 流す順の終わりが近いか（残り1曲まで）。一覧の続きやラジオの関連曲を取りに行く合図 */
export function isNearEnd(position: number, order: number[]): boolean {
  return position >= order.length - 2;
}

/** 一覧の続きで、next の次に足すページ。最後のページの次は1ページ目に戻り、押したページ（start）まで一周したら null */
export function followingPage(source: ListSource): ListSource | null {
  const next = (source.next % source.last) + 1;
  return next === source.start ? null : { ...source, next };
}

/** 一覧の start ページを流し始めたときの、最初に足す続き。1ページしかなければ null */
export function firstMore(source: Omit<ListSource, 'next'>): ListSource | null {
  return followingPage({ ...source, next: source.start });
}

/**
 * 前後の曲へ進むとき、どうするか。stay は進まない（並びが空か、先頭より前）、more は一覧の続きが届くのを待つ、
 * play は order の流す順で index 番目を流す。ループは全体なので、最後の曲の次は先頭へ戻り、
 * ランダムならひと回りしたところで混ぜ直す（同じ順の繰り返しにしない）
 */
export type Step =
  { kind: 'stay' } | { kind: 'more' } | { kind: 'play'; order: number[]; index: number };

export function stepFrom(
  cursor: Cursor,
  dir: 1 | -1,
  { hasMore, shuffle }: { hasMore: boolean; shuffle: boolean },
  random: () => number = Math.random,
): Step {
  const { queue, order } = cursor;
  if (queue.length === 0) return { kind: 'stay' };
  const pos = cursor.position + dir;
  if (pos < 0) return { kind: 'stay' };
  if (pos < order.length) return { kind: 'play', order, index: order[pos] };
  if (hasMore) return { kind: 'more' };
  const fresh = buildOrder(
    queue.length,
    shuffle ? Math.floor(random() * queue.length) : 0,
    shuffle,
  );
  return { kind: 'play', order: fresh, index: fresh[0] };
}

/**
 * 次に流れる曲。流す順で、いまの曲の次から limit 曲まで。loop（全体のループで、ラジオでない）なら、
 * 並びの最後のあとは先頭に戻って続くので、先頭からいまの曲の手前までも続けて並べる
 */
export function upcomingOf(
  cursor: Cursor,
  loop: boolean,
  limit: number,
): { item: QueueItem; index: number }[] {
  const { queue, order, position } = cursor;
  return [...order.slice(position + 1), ...(loop ? order.slice(0, position) : [])]
    .slice(0, limit)
    .flatMap((i) => (queue[i] ? [{ item: queue[i], index: i }] : []));
}

/**
 * ラジオで関連曲を聞く曲の順。いまの曲から始め、残りは並びの後ろの曲からさかのぼる（いまの曲の関連曲がどれも並びに
 * 入っているとき、足せる曲が見つかるまで試す）。limit 曲まで
 */
export function radioSeeds(queue: QueueItem[], index: number, limit: number): QueueItem[] {
  return [queue[index], ...queue.filter((_, i) => i !== index).toReversed()].slice(0, limit);
}
