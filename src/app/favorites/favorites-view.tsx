'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { MoreLink } from '@/components/browse-cards';
import { ARTIST_GRID, CoverCard } from '@/components/cover-card';
import { Heading } from '@/components/heading';
import { Icon } from '@/components/icon';
import { usePlayer } from '@/components/player/player-provider';
import { SongList } from '@/components/song-list';
import { useFavoriteProducers, useFavorites, useRefreshFavorites } from '@/lib/favorites';
import { clearHistory, useHistory } from '@/lib/history';

/** お気に入りの画面に出す曲の数。全部はお気に入りの曲の画面（/favorites/songs）で見る */
const SONG_PREVIEW = 12;
/** 最近聴いた曲を出す数 */
const HISTORY_PREVIEW = 12;

/**
 * お気に入りの曲とボカロP（Janify のライブラリと同じ組み立て）。どちらも足した順の新しいものが先。
 * 曲を押すと、お気に入りの並びをその曲から流し、お気に入りの曲の画面へ移る（そこで動画が大きく出る。
 * この画面には動画の置き場所が無く、移らないと右下の窓になる）。ハートを外した曲はその場で消える。
 * 先頭に、最近聴いた曲（視聴履歴。src/lib/history.ts）を出す。押すと、ほかの一覧と同じくその曲のボカロPの画面へ移って流す
 */
export function FavoritesView() {
  const { items: songs } = useFavorites();
  const { items: producers } = useFavoriteProducers();
  const history = useHistory();
  const { playQueue } = usePlayer();
  const router = useRouter();
  useRefreshFavorites();

  if (songs.length + producers.length + history.length === 0) {
    return (
      <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
        お気に入りはまだありません。曲やボカロPの
        <Icon name="heart" className="size-4" />
        で追加できます。
      </p>
    );
  }

  return (
    // 包んで、先頭の区画の上の余白（first:mt-0）が効くようにする。包まないと先頭はページの見出しになる
    <div>
      {history.length > 0 && (
        <Section
          title="最近聴いた曲"
          eyebrow="Recently played"
          count={`${history.length} 曲`}
          action={
            <button
              type="button"
              onClick={() => {
                if (window.confirm('最近聴いた曲の記録を消しますか？')) clearHistory();
              }}
              className="rounded-full px-3 py-1 text-xs font-bold text-muted transition-colors hover:text-foreground"
            >
              記録を消す
            </button>
          }
        >
          <SongList
            songs={history.slice(0, HISTORY_PREVIEW)}
            className="grid gap-1 md:grid-cols-2 xl:grid-cols-3"
          />
        </Section>
      )}
      {songs.length > 0 && (
        <Section title="曲" eyebrow="Songs" count={`${songs.length} 曲`} more="/favorites/songs">
          <SongList
            songs={songs.slice(0, SONG_PREVIEW)}
            onOpen={(i) => {
              playQueue(songs, i, 'favorites');
              router.push('/favorites/songs');
            }}
            className="grid gap-1 md:grid-cols-2 xl:grid-cols-3"
          />
        </Section>
      )}
      {producers.length > 0 && (
        <Section title="ボカロP" eyebrow="Producers" count={`${producers.length} 人`}>
          <div className={ARTIST_GRID}>
            {producers.map((p, i) => (
              <CoverCard
                key={p.id}
                href={`/producers/${p.id}`}
                playing={{ producerId: p.id }}
                cover={p.picture}
                round
                title={p.name}
                eager={i < 10}
              />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  eyebrow,
  count,
  more,
  action,
  children,
}: {
  title: string;
  eyebrow: string;
  count: string;
  /** 全部を出していないときの「すべて表示」の行き先 */
  more?: string;
  /** 見出しの右端に置くボタン */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-7 first:mt-0 sm:mt-10 sm:first:mt-0">
      <div className="mb-3 flex items-end gap-3">
        <Heading eyebrow={eyebrow}>{title}</Heading>
        <span className="pb-1 text-sm text-muted">{count}</span>
        {(more || action) && (
          <span className="ml-auto pb-0.5">
            {more && <MoreLink href={more} />}
            {action}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
