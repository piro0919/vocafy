'use client';

import { useRouter } from 'next/navigation';
import type { QueueItem } from '@/lib/catalog';
import { Icon } from './icon';
import { usePlayer } from './player/player-provider';

/**
 * 曲の一覧（年・歌声・あいうえお順・日付）を、その画面の曲の順に通して流すボタン。曲の数を添える。
 * 一覧の曲を押したときは、その曲のボカロPの画面へ移ってその人の曲が続く（song-list.tsx）。
 * こちらはこの一覧の曲だけを流し続ける。list があるときは、流し始めてから一覧の再生用の画面へ移る。
 *
 * list を渡すと一覧の全ページを流す。押した時点で送るのはこのページの曲だけで、終わりが近づいたら
 * 次のページを取りに行って足す（初音ミクのように1万曲ある一覧を全部送ると重い）。
 * 最後のページの次は1ページ目に戻り、押したページの手前まで流す。
 * list が無いとき（歌声の画面の代表曲）は、このページの曲だけを流す
 */
export function PlayAll({
  songs,
  count,
  list,
}: {
  songs: QueueItem[];
  count: string;
  /** 一覧の住所（years/2010 など）、このページ、最後のページ */
  list?: { source: string; page: number; last: number };
}) {
  const { queue, current, playing, listSource, playQueue, playAll, toggle } = usePlayer();
  const router = useRouter();
  // この一覧を流しているか。一覧の続きを足すものは住所で、そうでないものは並びの先頭と長さで見る
  const here = list
    ? current !== null && listSource === list.source
    : current !== null &&
      queue.length === songs.length &&
      queue[0]?.songId === songs[0]?.songId &&
      songs.some((s) => s.songId === current.songId);
  // 一覧の続きを足すものは、流し始めてから一覧の再生用の画面（/years/2026/play など。list-player.tsx）へ移り、
  // そこで動画を大きく出す。移らないと動画の置き場所が無く、右下の窓で流れていた
  const start = () => {
    if (!list) {
      playQueue(songs, 0);
      return;
    }
    playAll(songs, { source: list.source, start: list.page, last: list.last }, { moving: true });
    router.push(`/${list.source}/play`);
  };
  return (
    <div className="mt-3 flex items-center gap-3">
      <button
        type="button"
        onClick={() => (here ? toggle() : start())}
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-miku py-1.5 pr-4 pl-3 text-sm font-bold whitespace-nowrap text-on-miku shadow-md shadow-miku/30 transition-[filter,scale] duration-150 ease-out hover:brightness-110 active:scale-95"
      >
        <Icon name={here && playing ? 'pause' : 'play'} className="size-4" />
        {here && playing ? '一時停止' : '再生'}
      </button>
      <p className="text-sm text-muted">{count}</p>
    </div>
  );
}
