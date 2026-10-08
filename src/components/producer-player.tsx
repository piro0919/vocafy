'use client';

import { type ReactNode, useEffect } from 'react';
import type { QueueItem, Song } from '@/lib/catalog';
import { NO_RESTORE } from '@/lib/no-restore';
import { Icon } from './icon';
import { Bars } from './now-playing';
import { PlayerStage, SwipeToLeave } from './player-stage';
import { usePlayer } from './player/player-provider';
import { PlaybackMode } from './player/playback-mode';
import { Marquee } from './marquee';

/**
 * ボカロPの画面。左に大きなプレイヤーの置き場所、右に曲の一覧（新しい順）。
 * このボカロPの曲を流している間は、共通のプレイヤーが置き場所に重なって大きく出る。
 * ほかの曲を流しているあいだや、まだ何も流していないときは、サムネイルと再生ボタンを出す
 */
export function ProducerPlayer({
  producerId,
  heading,
  songs,
  queue,
  cover,
}: {
  producerId: number;
  /** 動画の下に出す名前。ページの側で作る */
  heading: ReactNode;
  songs: Song[];
  queue: QueueItem[];
  cover: string | null;
}) {
  const { current, playing, context, playQueue, adoptQueue, toggle } = usePlayer();
  const here = current?.producerId === producerId;
  // 流せる曲。ニコニコにしか本家が無い曲もニコニコで流せるが、表紙の取れていない曲は流さない
  const playableIds = new Set(queue.map((q) => q.songId));

  // 曲の一覧から押して来たときは、その1曲だけを流している。曲は止めずに、順番待ちをこの人の曲にする
  useEffect(() => {
    if (!here || !current || context !== 'pending') return;
    const at = queue.findIndex((q) => q.songId === current.songId);
    if (at >= 0) adoptQueue(queue, at);
  }, [here, current, context, queue, adoptQueue]);

  const start = (songId?: number) =>
    playQueue(
      queue,
      songId
        ? Math.max(
            0,
            queue.findIndex((q) => q.songId === songId),
          )
        : 0,
    );

  return (
    // パソコンでは、一覧が長くても動画が隠れないよう、動画と再生ボタンの列ごと上に貼り付ける（sticky）。
    // スマホは画面が狭く、貼り付けると一覧が見づらくなるので、貼り付けずに縦に並べる
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
      <div className="contents lg:sticky lg:top-6 lg:block">
        <PlayerStage
          active={here}
          cover={cover}
          label="このボカロPの曲を再生"
          onPlay={() => start()}
        />
        <SwipeToLeave className="lg:mt-4">
          {heading}
          <p className="mt-0.5 text-sm text-muted">
            {queue.length} 曲{queue.length < songs.length && `（全 ${songs.length} 曲）`}
          </p>
        </SwipeToLeave>
        <div className="flex items-center gap-2 lg:mt-4">
          <button
            type="button"
            onClick={() => (here ? toggle() : start())}
            className="flex shrink-0 items-center gap-2 rounded-full py-2 pr-5 pl-4 text-sm font-bold whitespace-nowrap bg-miku text-on-miku shadow-lg shadow-miku/30 transition-[filter,scale] duration-150 ease-out hover:brightness-110 active:scale-95"
          >
            <Icon name={here && playing ? 'pause' : 'play'} className="size-5" />
            {here && playing ? '一時停止' : '再生'}
          </button>
          {/* スマホは下の帯にランダムとループが入りきらないので、ここに置く */}
          <PlaybackMode className="md:hidden" />
        </div>
      </div>

      {/*
        行の地の色は字の手前まで広げたいので、行の内側に余白（px-3）を取る。そのぶん並び全体を外へ出し（-mx-3）、
        番号の頭が題名の頭とそろうようにする
      */}
      <ol className="-mx-3">
        {songs.map((song, i) => {
          const active = here && current?.songId === song.id;
          const playable = playableIds.has(song.id);
          return (
            <li
              key={song.id}
              className={`group rounded-md transition-colors duration-150 ${
                active ? 'bg-sidebar/60' : playable ? 'hover:bg-foreground/8' : ''
              }`}
            >
              <button
                type="button"
                disabled={!playable}
                {...NO_RESTORE}
                title={playable ? undefined : 'この曲は本家の動画の情報が足りず、再生できません'}
                onClick={() => playable && start(song.id)}
                className="flex w-full min-w-0 items-center gap-4 px-3 py-2 text-left disabled:cursor-default disabled:text-muted/50"
              >
                <span className="flex w-6 shrink-0 justify-end text-sm tabular-nums text-muted">
                  {active ? <Bars playing={playing} /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <Marquee active={active} className={active ? 'font-bold' : ''}>
                    {song.title}
                  </Marquee>
                  <span className="block truncate text-xs text-muted">
                    {song.vocalists.join('・')}
                    {song.year && ` ・ ${song.year}年`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
