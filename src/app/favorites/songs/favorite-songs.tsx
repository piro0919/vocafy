'use client';

import { Heading } from '@/components/heading';
import { Icon } from '@/components/icon';
import { PlayerStage, SwipeToLeave } from '@/components/player-stage';
import { PlaybackMode } from '@/components/player/playback-mode';
import { usePlayer } from '@/components/player/player-provider';
import { SongList } from '@/components/song-list';
import { useFavorites } from '@/lib/favorites';

/**
 * お気に入りの曲の画面（Janify と同じ）。お気に入りの曲を1本の並びとして扱い、ボカロPの画面と同じく
 * 左に大きなプレイヤーの置き場所、右に曲の一覧を置く。押した曲は、この画面のまま、お気に入りの並びで流れる
 */
export function FavoriteSongs() {
  const { items: songs } = useFavorites();
  const { current, playing, context, playQueue, toggle } = usePlayer();
  const here = context === 'favorites' && !!current;
  const play = (at = 0) => songs.length > 0 && playQueue(songs, at, 'favorites');

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
      <div className="contents lg:sticky lg:top-25 lg:block">
        <PlayerStage
          active={here}
          cover={songs[0]?.thumb ?? null}
          label="お気に入りの曲を再生"
          onPlay={() => play()}
        />
        <SwipeToLeave className="lg:mt-4">
          <Heading as="h1" size="page" eyebrow="Favorites">
            お気に入りの曲
          </Heading>
          <p className="mt-0.5 text-sm text-muted">{songs.length} 曲</p>
        </SwipeToLeave>
        <div className="flex items-center gap-2 lg:mt-4">
          <button
            type="button"
            disabled={songs.length === 0}
            onClick={() => (here ? toggle() : play())}
            className="flex shrink-0 items-center gap-2 rounded-full bg-miku py-2 pr-5 pl-4 text-sm font-bold whitespace-nowrap text-on-miku shadow-lg shadow-miku/30 transition-[filter,scale] duration-150 ease-out hover:brightness-110 active:scale-95 disabled:opacity-40"
          >
            <Icon name={here && playing ? 'pause' : 'play'} className="size-5" />
            {here && playing ? '一時停止' : '再生'}
          </button>
          {/* スマホは下の帯にランダム・ループ・ラジオが入りきらないので、ここに置く */}
          <PlaybackMode className="md:hidden" radio />
        </div>
      </div>

      {songs.length === 0 ? (
        <p className="text-sm text-muted">お気に入りの曲はまだありません。</p>
      ) : (
        <SongList songs={songs} onOpen={(i) => play(i)} />
      )}
    </div>
  );
}
