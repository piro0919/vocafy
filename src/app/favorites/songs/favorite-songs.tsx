'use client';

import { Heading } from '@/components/heading';
import { Icon } from '@/components/icon';
import { PlayerStage, StageControls, SwipeToLeave } from '@/components/player-stage';
import { PlaybackMode } from '@/components/player/playback-mode';
import { usePlayer } from '@/components/player/player-provider';
import { useFavorites, useRefreshFavorites } from '@/lib/favorites';
import { NO_RESTORE } from '@/lib/no-restore';
import { SortableSongList } from './sortable-song-list';
import { PRIMARY } from '@/components/button-styles';

/**
 * お気に入りの曲の画面（Janify と同じ）。お気に入りの曲を1本の並びとして扱い、ボカロPの画面と同じく
 * 左に大きなプレイヤーの置き場所、右に曲の一覧を置く。押した曲は、この画面のまま、お気に入りの並びで流れる。
 * 一覧は取っ手で並べ替えられる
 */
export function FavoriteSongs() {
  const { items: songs } = useFavorites();
  useRefreshFavorites();
  const { current, playing, context, radioHome, playQueue, toggle } = usePlayer();
  // お気に入りの並びのときと、ラジオをやめてお気に入りの並びに戻した直後（流していたラジオの曲が終わるまで）に、動画をここに大きく出す
  const here = !!current && (context === 'favorites' || radioHome === '/favorites/songs');
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
        </SwipeToLeave>
        {/* 名前とボタンは一続きのものなので、ほかの部品のあいだ（24px）より詰める */}
        <StageControls>
          <button
            type="button"
            disabled={songs.length === 0}
            // 読み込み直しや戻るで、ブラウザが押せる・押せないを前の状態に戻すと、サーバーの HTML と食い違う
            {...NO_RESTORE}
            onClick={() => (here ? toggle() : play())}
            className={PRIMARY}
          >
            <Icon name={here && playing ? 'pause' : 'play'} className="size-5" />
            {here && playing ? '一時停止' : '再生'}
          </button>
          {/* スマホは下の帯にランダム・ループ・ラジオが入りきらないので、ここに置く */}
          <PlaybackMode className="md:hidden" radio scroll />
        </StageControls>
      </div>

      {songs.length === 0 ? (
        // お気に入りの画面（favorites-view.tsx）と同じく、入れ方を添える
        <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
          お気に入りの曲はまだありません。曲の
          <Icon name="heart" className="size-4" />
          で追加できます。
        </p>
      ) : (
        <SortableSongList songs={songs} onOpen={(i) => play(i)} />
      )}
    </div>
  );
}
