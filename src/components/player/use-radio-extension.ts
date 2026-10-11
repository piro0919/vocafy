import { type RefObject, useEffect, useRef } from 'react';
import type { QueueItem } from '@/lib/catalog';
import { type Cursor, freshItems, isNearEnd, radioSeeds } from './queue-state';

/** ラジオで足せる関連曲を探すときに、関連曲を聞く曲の数の上限 */
const RADIO_TRIES = 6;

/**
 * ラジオの並びの後ろに足す曲を探す。いまの曲から、並びの後ろの曲へさかのぼって関連曲を聞き（radioSeeds）、
 * まだ並びに無い曲が見つかったところで返す。どの曲でも見つからなければ空。
 * 待っているあいだに並びが替わったら（stillCurrent が false）、探すのをやめて空を返す
 */
export async function findRadioAdditions(
  queue: QueueItem[],
  index: number,
  related: (songId: number) => Promise<QueueItem[]>,
  stillCurrent: () => boolean,
): Promise<QueueItem[]> {
  for (const seed of radioSeeds(queue, index, RADIO_TRIES)) {
    const items = await related(seed.songId);
    if (!stillCurrent()) return [];
    const fresh = freshItems(queue, items);
    if (fresh.length > 0) return fresh;
  }
  return [];
}

/** /api/related から関連曲を取る。取れなければ空 */
async function fetchRelated(songId: number): Promise<QueueItem[]> {
  const res = await fetch(`/api/related/${songId}`).catch(() => null);
  return res?.ok ? ((await res.json()) as QueueItem[]) : [];
}

/**
 * ラジオで流す順の終わりが近づいたら（残り1曲まで）、関連曲のうちまだ並びに無いものを後ろに足す（append）。
 * いまの曲の関連曲がどれも並びに入っているとき（ラジオの画面で一覧の最後の曲を押したときなど）は、並びの後ろの曲から
 * 順にさかのぼって、足せる曲が見つかるまで RADIO_TRIES 曲まで試す。足さないと次に流れる曲が空になり、最後の曲のあとは
 * 先頭に戻っていた。関連曲の答えは CDN に置いてあるので、さかのぼっても DB はほぼ起きない
 */
export function useRadioExtension({
  active,
  queue,
  index,
  position,
  cursor,
  append,
}: {
  /** ラジオを流しているか */
  active: boolean;
  queue: QueueItem[];
  index: number;
  position: number;
  cursor: RefObject<Cursor>;
  append: (items: QueueItem[]) => void;
}) {
  const extending = useRef(false);
  useEffect(() => {
    if (!active || queue.length === 0 || !isNearEnd(position, cursor.current.order)) return;
    if (extending.current) return;
    extending.current = true;
    // 待っているあいだに別の並びに替わっていたら、足さない
    const stillCurrent = () => cursor.current.queue === queue;
    void findRadioAdditions(queue, index, fetchRelated, stillCurrent)
      .then((fresh) => {
        if (fresh.length > 0 && stillCurrent()) append(fresh);
      })
      .finally(() => {
        extending.current = false;
      });
  }, [active, index, position, queue, append, cursor]);
}
