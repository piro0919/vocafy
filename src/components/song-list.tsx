'use client';

import type { QueueItem } from '@/lib/catalog';
import { useRouter } from 'next/navigation';
import { thumbOf } from '@/lib/thumb';
import { FadeImage } from './fade-image';
import { Bars } from './now-playing';
import { usePlayer } from './player/player-provider';
import { Marquee } from './marquee';

/**
 * 小さなサムネイルと曲名を詰めて並べる一覧。押すとその曲のボカロPの画面へ移り、その曲から流す
 * （YouTube Music・Amazon Music でアルバムに移るのと同じ）。iPhone は押した瞬間の操作の中で再生を始めないと
 * 音が出ないので、ここでその1曲を流し始め、順番待ちはボカロPの画面に着いてからその人の曲に差し替える
 */
export function SongList({ songs, columns }: { songs: QueueItem[]; columns?: boolean }) {
  const { current, playing, playQueue } = usePlayer();
  const router = useRouter();
  return (
    <div
      className={
        columns
          ? 'grid snap-start auto-cols-[minmax(17rem,22rem)] grid-flow-col gap-x-6 gap-y-1'
          : 'grid gap-1'
      }
      // 棚では4行ずつ縦に詰めて横へ流す。曲が少ないときは、その数だけの行にして隙間を作らない
      style={
        columns ? { gridTemplateRows: `repeat(${Math.min(4, songs.length)}, auto)` } : undefined
      }
    >
      {songs.map((song, i) => {
        const active = current?.songId === song.songId;
        return (
          <div
            key={song.songId}
            className={`group flex min-w-0 snap-start items-center rounded-md pr-1 transition-colors duration-150 ${active ? 'bg-sidebar/60' : 'hover:bg-foreground/8'}`}
          >
            <button
              type="button"
              onClick={() => {
                playQueue([song], 0, 'pending');
                router.push(`/producers/${song.producerId}`);
              }}
              className="flex min-w-0 flex-1 items-center gap-3 p-1.5 text-left transition-[scale] duration-150 ease-out active:scale-[0.98]"
            >
              <FadeImage
                src={thumbOf(song.videoId)}
                alt=""
                // 最初の列は画面に入った時点で見えるので、遅延読み込みにしない
                loading={i < 8 ? 'eager' : 'lazy'}
                width={85}
                height={48}
                className="aspect-video shrink-0 rounded"
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
          </div>
        );
      })}
    </div>
  );
}
