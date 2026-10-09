'use client';

import type { QueueItem } from '@/lib/catalog';
import { Icon } from './icon';
import { usePlayer } from './player/player-provider';

/**
 * 曲の一覧（年・歌声・あいうえお順・日付）を、その画面の曲の順に通して流すボタン。曲の数を添える。
 * 一覧の曲を押したときは、その曲のボカロPの画面へ移ってその人の曲が続く（song-list.tsx）。
 * こちらは画面を移らず、この一覧の曲だけを流し続ける。動画はほかの画面と同じく右下の窓に出る。
 * 流すのはページに出ている曲だけ（初音ミクのように1万曲ある一覧を全部送ると重い）
 */
export function PlayAll({ songs, count }: { songs: QueueItem[]; count: string }) {
  const { queue, current, playing, playQueue, toggle } = usePlayer();
  // この一覧を流しているか。並びの先頭と長さがそろっていれば、このボタンから流したものとみなす
  const here =
    current !== null &&
    queue.length === songs.length &&
    queue[0]?.songId === songs[0]?.songId &&
    songs.some((s) => s.songId === current.songId);
  return (
    <div className="mt-3 flex items-center gap-3">
      <button
        type="button"
        onClick={() => (here ? toggle() : playQueue(songs, 0))}
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-miku py-1.5 pr-4 pl-3 text-sm font-bold whitespace-nowrap text-on-miku shadow-md shadow-miku/30 transition-[filter,scale] duration-150 ease-out hover:brightness-110 active:scale-95"
      >
        <Icon name={here && playing ? 'pause' : 'play'} className="size-4" />
        {here && playing ? '一時停止' : '通して再生'}
      </button>
      <p className="text-sm text-muted">{count}</p>
    </div>
  );
}
