'use client';

import { type ReactNode, useEffect } from 'react';
import type { QueueItem } from '@/lib/catalog';
import { Icon } from './icon';
import { PlayerStage, SwipeToLeave } from './player-stage';
import { PlaybackMode } from './player/playback-mode';
import { usePlayer } from './player/player-provider';
import { SongItem } from './song-list';

/**
 * ラジオの画面。一覧の再生用の画面（list-player.tsx）と同じく、左（スマホは上）に大きなプレイヤーの置き場所、右に一覧。
 * 一覧は、先頭が元の曲、続いてその関連曲。このラジオを流しているあいだは、流している並びをそのまま出す。
 * 並びは最後の曲に入ると後ろに伸びる（player-provider.tsx）ので、一覧も下に伸びていく
 */
export function RadioPlayer({ songs, heading }: { songs: QueueItem[]; heading: ReactNode }) {
  const { current, playing, queue, radioHome, playRadio, fillRadio, jumpTo, toggle } = usePlayer();
  const here = current !== null && radioHome === `/radio/${songs[0].songId}`;
  const list = here ? queue : songs;

  // 再生の帯のボタンからラジオを始めて移ってきたときは、並びがまだ元の曲だけなので、この画面の関連曲で埋める
  useEffect(() => {
    if (here && queue.length === 1) fillRadio(songs);
  }, [here, queue.length, fillRadio, songs]);

  return (
    // 一覧の再生用の画面（list-player.tsx）と同じ組み立て
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
      <div className="contents lg:sticky lg:top-25 lg:block">
        <PlayerStage
          active={here}
          cover={songs[0].thumb}
          label="このラジオを再生"
          onPlay={() => playRadio(songs, 0)}
        />
        <SwipeToLeave className="lg:mt-4">{heading}</SwipeToLeave>
        <div className="flex items-center gap-2 max-lg:-mt-3 lg:mt-4">
          <button
            type="button"
            onClick={() => (here ? toggle() : playRadio(songs, 0))}
            className="flex shrink-0 items-center gap-2 rounded-full bg-miku py-2 pr-5 pl-4 text-sm font-bold whitespace-nowrap text-on-miku shadow-lg shadow-miku/30 transition-[filter,scale] duration-150 ease-out hover:brightness-110 active:scale-95"
          >
            <Icon name={here && playing ? 'pause' : 'play'} className="size-5" />
            {here && playing ? '一時停止' : '再生'}
          </button>
          {/* スマホは下の帯にランダム・ループ・ラジオが入りきらないので、ここに置く */}
          <PlaybackMode className="md:hidden" radio />
        </div>
      </div>

      <div className="-mx-1.5 flex flex-col gap-1">
        {list.map((song, i) => (
          <SongItem
            key={`${i}-${song.songId}`}
            song={song}
            eager={i < 12}
            onOpen={() => (here ? jumpTo(i) : playRadio(songs, i))}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * ラジオの画面を作っているあいだの形（loading.tsx）。初めて開く曲のラジオは、サーバーで VocaDB に関連曲を聞いてから描くので
 * 数秒かかることがある。そのあいだも動画の置き場所を先に出し、ラジオを流しているなら動画をここに大きく出す。
 * 置き場所が無いと、待ち（WAIT_FOR_SLOT）を越えて右下の窓に出てから、画面ができたところで大きな置き場所へ移った
 */
export function RadioLoading() {
  const { current, context } = usePlayer();
  return (
    <div className="pt-4">
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <div className="contents lg:sticky lg:top-25 lg:block">
          <PlayerStage
            active={current !== null && context === 'radio'}
            cover={current?.thumb ?? null}
            label="このラジオを再生"
            onPlay={() => {}}
          />
          <div aria-hidden className="flex flex-col gap-2 lg:mt-4">
            <span className="h-3 w-12 animate-pulse rounded bg-surface" />
            <span className="h-9 w-2/3 animate-pulse rounded bg-surface" />
          </div>
        </div>
        <div aria-hidden className="-mx-1.5 flex flex-col gap-1">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 p-1.5">
              <span className="aspect-video w-[85px] shrink-0 animate-pulse rounded bg-surface" />
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="h-3.5 w-2/3 animate-pulse rounded bg-surface" />
                <span className="h-3 w-1/2 animate-pulse rounded bg-surface/70" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
