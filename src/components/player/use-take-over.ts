import { useLayoutEffect } from 'react';
import type { QueueItem } from '@/lib/catalog';
import { usePlayer } from './player-provider';
import { owns } from './player-rules';
import type { QueueOwner } from './player-types';

/**
 * 動画を大きく出す画面（ボカロP・お気に入りの曲・一覧の再生用・ラジオ）の決まり: 開いたときに、流している曲がその画面の一覧に
 * あれば、並びをその画面の一覧にしてその曲から続ける（曲は止めない）。その画面が並びの持ち主になり、動画が大きく出る。
 * 一覧に無ければ何もしない（右下の窓のまま）。2026-10-11 に本人と決めた。画面ごとに例外があると、「戻る」「進む」や
 * ボカロPの名前を押したときに、大きくなったり右下の窓になったりした。
 *
 * その画面がいま並びの持ち主か（動画を大きく出すか）を返す。判定はどの画面も player-rules.ts の owns で行う。
 * 切り替えないのは、ボカロPの画面へ移る途中（pending。着いた画面が差し替える）と、
 * 画面を移っている途中（holdingSlot。ラジオのボタンで移るときなど。切り替えると、移る前の画面が並びを取り戻した）。
 * 一覧の再生用の画面は1ページ目に載っている曲だけを見る。描く前に切り替え、右下の窓を一瞬も出さない
 */
export function useTakeOver(items: QueueItem[], page: QueueOwner): boolean {
  const { current, owner, holdingSlot, takeOver } = usePlayer();
  const here = owns(owner, page, current);
  const pending = owner.kind === 'pending';
  const key = JSON.stringify(page);
  useLayoutEffect(() => {
    if (!current || here || pending || holdingSlot) return;
    const at = items.findIndex((s) => s.songId === current.songId);
    if (at >= 0) takeOver(items, at, JSON.parse(key) as QueueOwner);
  }, [current, here, pending, holdingSlot, items, key, takeOver]);
  return here;
}
