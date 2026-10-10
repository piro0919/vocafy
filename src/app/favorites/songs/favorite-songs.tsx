'use client';

import { Icon } from '@/components/icon';
import {
  PlayerStage,
  StageControls,
  StagePlayButton,
  SwipeToLeave,
} from '@/components/player-stage';
import { PlaybackMode } from '@/components/player/playback-mode';
import { usePlayer } from '@/components/player/player-provider';
import { useFavorites, useRefreshFavorites } from '@/lib/favorites';
import { NO_RESTORE } from '@/lib/no-restore';
import { SortableSongList } from './sortable-song-list';
import { useStageNotes } from '@/components/song-notes';
import { SingerSilhouette } from '@/components/singer-silhouette';
import { StageHeading } from '@/components/stage-heading';
import { useTakeOver } from '@/components/player/use-take-over';

/**
 * お気に入りの曲の画面（Janify と同じ）。お気に入りの曲を1本の並びとして扱い、ボカロPの画面と同じく
 * 左に大きなプレイヤーの置き場所、右に曲の一覧を置く。押した曲は、この画面のまま、お気に入りの並びで流れる。
 * 一覧は取っ手で並べ替えられる
 */
export function FavoriteSongs() {
  const { items: songs } = useFavorites();
  useRefreshFavorites();
  const { current, playing, context, playQueue, toggle } = usePlayer();
  // お気に入りの並びのときに、動画をここに大きく出す
  const here = !!current && context === 'favorites';
  // 流している曲がお気に入りにあれば、開いたときに並びをお気に入りにする（use-take-over.ts。どの画面も同じ決まり）
  useTakeOver(here, songs, FAVORITES);
  // 流している曲の動画の説明文（song-notes.tsx）
  const notes = useStageNotes(here ? current : null);
  const play = (at = 0) => songs.length > 0 && playQueue(songs, at, 'favorites');

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-6 lg:items-start">
      <div className="contents lg:sticky lg:top-25 lg:block">
        <PlayerStage
          active={here}
          cover={songs[0]?.thumb ?? null}
          label="お気に入りの曲を再生"
          onPlay={() => play()}
        />
        <SwipeToLeave className="lg:mt-4">
          <StageHeading eyebrow="Favorites" title="お気に入りの曲" song={here ? current : null} />
        </SwipeToLeave>
        {/* 名前とボタンは一続きのものなので、ほかの部品のあいだ（24px）より詰める */}
        <StageControls extra={notes.button}>
          <StagePlayButton
            playing={here && playing}
            disabled={songs.length === 0}
            // 読み込み直しや戻るで、ブラウザが押せる・押せないを前の状態に戻すと、サーバーの HTML と食い違う
            {...NO_RESTORE}
            onClick={() => (here ? toggle() : play())}
          />
          {/* スマホは下の帯にランダム・ループ・ラジオが入りきらないので、ここに置く */}
          {notes.button}
          <PlaybackMode className="md:hidden" radio scroll />
        </StageControls>
        {notes.view}
        <SingerSilhouette song={here ? current : null} />
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

/** この画面が並びの持ち主になるときの種類（takeOver） */
const FAVORITES = { kind: 'favorites' } as const;
