'use client';

import { Icon } from '@/components/icon';
import { StagePlayButton } from '@/components/player-stage';
import { SongShare } from '@/components/share-menu';
import { usePlayer } from '@/components/player/player-provider';
import { useFavorites, useRefreshFavorites } from '@/lib/favorites';
import { NO_RESTORE } from '@/lib/no-restore';
import { SortableSongList } from './sortable-song-list';
import { StageLayout } from '@/components/stage-layout';
import { StageHeading } from '@/components/stage-heading';
import { useTakeOver } from '@/components/player/use-take-over';
import { useText } from '@/i18n/navigation';
import { defineText } from '@/i18n/text';
import { TERMS } from '@/i18n/terms';

const TEXT = defineText({
  ja: {
    play: 'お気に入りの曲を再生',
    emptyBefore: 'お気に入りの曲はまだありません。曲の',
    emptyAfter: 'で追加できます。',
  },
  en: {
    play: 'Play favorite songs',
    emptyBefore: 'No favorite songs yet. Use',
    emptyAfter: 'on a song to add it.',
  },
});

/**
 * お気に入りの曲の画面（Janify と同じ）。お気に入りの曲を1本の並びとして扱い、ボカロPの画面と同じく
 * 左に大きなプレイヤーの置き場所、右に曲の一覧を置く。押した曲は、この画面のまま、お気に入りの並びで流れる。
 * 一覧は取っ手で並べ替えられる
 */
export function FavoriteSongs() {
  const { items: songs } = useFavorites();
  useRefreshFavorites();
  const { current, playing, playQueue, toggle } = usePlayer();
  // お気に入りの並びのときに、動画をここに大きく出す。流している曲がお気に入りにあれば、開いたときに並びをお気に入りにする
  // （use-take-over.ts。どの画面も同じ決まり）
  const here = useTakeOver(songs, FAVORITES);
  const t = useText(TEXT);
  const terms = useText(TERMS);
  const play = (at = 0) => songs.length > 0 && playQueue(songs, at, FAVORITES);

  return (
    <StageLayout
      song={here ? current : null}
      cover={songs[0]?.thumb ?? null}
      label={t.play}
      onPlay={() => play()}
      heading={
        <StageHeading
          eyebrow="Favorites"
          title={terms.favoriteSongs}
          song={here ? current : null}
        />
      }
      play={
        <StagePlayButton
          playing={here && playing}
          disabled={songs.length === 0}
          // 読み込み直しや戻るで、ブラウザが押せる・押せないを前の状態に戻すと、サーバーの HTML と食い違う
          {...NO_RESTORE}
          onClick={() => (here ? toggle() : play())}
        />
      }
      share={<SongShare song={here ? current : null} />}
    >
      {songs.length === 0 ? (
        // お気に入りの画面（favorites-view.tsx）と同じく、入れ方を添える
        <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
          {t.emptyBefore}
          <Icon name="heart" className="size-4" />
          {t.emptyAfter}
        </p>
      ) : (
        <SortableSongList songs={songs} onOpen={(i) => play(i)} />
      )}
    </StageLayout>
  );
}

/** この画面が並びの持ち主になるときの種類（takeOver） */
const FAVORITES = { kind: 'favorites' } as const;
