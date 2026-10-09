'use client';

import { useRouter } from 'next/navigation';
import type { QueueItem } from '@/lib/catalog';
import { Icon } from './icon';
import { usePlayer } from './player/player-provider';
import { PILL, PRIMARY } from './button-styles';

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
/** 一覧を通して流す処理（PlayAll と PlayAllPill で共有する） */
function usePlayAll(songs: QueueItem[], list?: { source: string; page: number; last: number }) {
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
  return { here, playing, start, toggle, router };
}

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
  const { here, playing, start, toggle } = usePlayAll(songs, list);
  return (
    <div className="mt-3 flex items-center gap-3">
      <button type="button" onClick={() => (here ? toggle() : start())} className={PRIMARY}>
        <Icon name={here && playing ? 'pause' : 'play'} className="size-5" />
        {here && playing ? '一時停止' : '再生'}
      </button>
      {/* 折り返すのは空きの位置だけ。字の間で折ると「（全11,002曲）」の「曲）」だけが次の行に落ちた */}
      <p className="text-sm text-muted [word-break:keep-all]">{count}</p>
    </div>
  );
}

/**
 * トップの区画の見出しの右に置く、小さな「再生」（形は「すべて表示」と同じ PILL）。押すと一覧を流し始めて、
 * 一覧の再生用の画面へ移る。もうその一覧を流しているときは、止めずに移るだけ（お気に入りの「再生」と同じ）
 */
export function PlayAllPill({
  songs,
  list,
}: {
  songs: QueueItem[];
  list: { source: string; page: number; last: number };
}) {
  const { here, start, router } = usePlayAll(songs, list);
  return (
    <button
      type="button"
      onClick={() => (here ? router.push(`/${list.source}/play`) : start())}
      className={`${PILL} flex items-center gap-1`}
    >
      <Icon name="play" className="size-3.5" />
      再生
    </button>
  );
}
