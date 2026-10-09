'use client';

import type { QueueItem } from '@/lib/catalog';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { smallThumbOf } from '@/lib/thumb';
import { FadeImage } from './fade-image';
import { FavoriteButton } from './favorite-button';
import { Bars } from './now-playing';
import { usePlayer } from './player/player-provider';
import { Marquee } from './marquee';

/**
 * 小さなサムネイルと曲名を詰めて並べる一覧。押すとその曲のボカロPの画面へ移り、その曲から流す
 * （YouTube Music・Amazon Music でアルバムに移るのと同じ）。iPhone は押した瞬間の操作の中で再生を始めないと
 * 音が出ないので、ここでその1曲を流し始め、順番待ちはボカロPの画面に着いてからその人の曲に差し替える
 */
export function SongList({
  songs,
  columns,
  onOpen,
  className = 'grid gap-1',
}: {
  songs: QueueItem[];
  columns?: boolean;
  /** 曲を押したときの動き。渡さなければ、その曲のボカロPの画面へ移る（useOpenSong） */
  onOpen?: (index: number) => void;
  /** 棚に入れないときの並べ方 */
  className?: string;
}) {
  const open = useOpenSong();
  return (
    <div
      className={
        columns
          ? 'grid snap-start auto-cols-[minmax(17rem,22rem)] grid-flow-col gap-x-6 gap-y-1'
          : className
      }
      // 棚では4行ずつ縦に詰めて横へ流す。曲が少ないときは、その数だけの行にして隙間を作らない
      style={
        columns ? { gridTemplateRows: `repeat(${Math.min(4, songs.length)}, auto)` } : undefined
      }
    >
      {songs.map((song, i) => (
        <SongItem
          key={song.songId}
          song={song}
          // 最初の列は画面に入った時点で見えるので、遅延読み込みにしない
          eager={i < 8}
          onOpen={() => (onOpen ? onOpen(i) : open(song))}
        />
      ))}
    </div>
  );
}

/**
 * 一覧の1曲。サムネイル・曲名・ボカロPと歌声・ハート。流している曲は地の色を変え、曲名の横に音の棒を出す。
 * handle はハートの右に置く部品（お気に入りの曲の並べ替えの取っ手）
 */
export function SongItem({
  song,
  eager = false,
  onOpen,
  handle,
  favorite = true,
}: {
  song: QueueItem;
  eager?: boolean;
  onOpen: () => void;
  handle?: ReactNode;
  /** お気に入りのハートを置くか。次に流れる曲の板では置かない（流している曲は再生の帯のハートで入れる） */
  favorite?: boolean;
}) {
  const { current, playing } = usePlayer();
  const active = current?.songId === song.songId;
  return (
    <div
      className={`group flex min-w-0 snap-start items-center rounded-md pr-1 transition-colors duration-150 ${active ? 'bg-glass' : 'hover:bg-foreground/8'}`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 p-1.5 text-left transition-[scale] duration-150 ease-(--ease-out) active:scale-[0.98]"
      >
        <FadeImage
          src={smallThumbOf(song)}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          width={85}
          height={48}
          className="aspect-video shrink-0 rounded object-cover"
        />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-sm font-bold">
            <Marquee active={active}>{song.title}</Marquee>
            {active && <Bars playing={playing} />}
          </span>
          <span className="block truncate text-xs text-muted">
            {song.producerName}
            {song.vocalists && ` ・ ${song.vocalists}`}
          </span>
        </span>
      </button>
      {favorite && <FavoriteButton song={song} quiet />}
      {handle}
    </div>
  );
}

/** 曲を押したときの動き。その1曲を流し始めてから、その曲のボカロPの画面へ移る（SongList の説明のとおり） */
export function useOpenSong() {
  const { playQueue } = usePlayer();
  const router = useRouter();
  return (song: QueueItem) => {
    playQueue([song], 0, 'pending');
    router.push(`/producers/${song.producerId}`);
  };
}
