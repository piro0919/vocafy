'use client';

import { useProducerName } from '@/components/display-names';
import type { ReactNode } from 'react';
import { useRouter } from '@/i18n/navigation';
import { PRIMARY } from '@/components/button-styles';
import { ARTIST_GRID, CoverCard } from '@/components/cover-card';
import { Heading, SECTION } from '@/components/heading';
import { Icon } from '@/components/icon';
import { usePlayer } from '@/components/player/player-provider';
import { SongList } from '@/components/song-list';
import { useFavoriteProducers, useFavorites, useRefreshFavorites } from '@/lib/favorites';
import { formatCount } from '@/lib/format';
import { EAGER_IMAGES } from '@/lib/image-sizes';
import { useText } from '@/i18n/navigation';
import { defineText } from '@/i18n/text';
import { TERMS } from '@/i18n/terms';

const TEXT = defineText({
  ja: {
    emptyBefore: 'お気に入りはまだありません。曲やボカロPの',
    emptyAfter: 'で追加できます。',
    songs: '曲',
    people: (n: string) => `${n}人`,
  },
  en: {
    emptyBefore: 'No favorites yet. Use',
    emptyAfter: 'on a song or producer to add it.',
    songs: 'Songs',
    people: (n: string) => (n === '1' ? '1 producer' : `${n} producers`),
  },
});

/** お気に入りの画面に出す曲の数。全部はお気に入りの曲の画面（/favorites/songs）で見る（「再生」か曲を押して移る） */
const SONG_PREVIEW = 12;

/**
 * お気に入りの曲とボカロP（Janify のライブラリと同じ組み立て）。どちらも足した順の新しいものが先。
 * 曲を押すと、お気に入りの並びをその曲から流し、お気に入りの曲の画面へ移る（そこで動画が大きく出る。
 * この画面には動画の置き場所が無く、移らないと右下の窓になる）。ハートを外した曲はその場で消える。
 * 最近聴いた曲は別の画面（/history）。お気に入りから入る人が多く、先頭に自分で選んでいない曲が来ないようにした
 */
export function FavoritesView() {
  const { items: songs } = useFavorites();
  const { items: producers } = useFavoriteProducers();
  const { owner, current, playQueue } = usePlayer();
  const router = useRouter();
  useRefreshFavorites();
  const t = useText(TEXT);
  const terms = useText(TERMS);
  const producerName = useProducerName();

  if (songs.length + producers.length === 0) {
    return (
      <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
        {t.emptyBefore}
        <Icon name="heart" className="size-4" />
        {t.emptyAfter}
      </p>
    );
  }

  return (
    // 包んで、先頭の区画の上の余白（first:mt-0）が効くようにする。包まないと先頭はページの見出しになる
    <div>
      {songs.length > 0 && (
        <Section
          title={t.songs}
          eyebrow="Songs"
          count={terms.songs(formatCount(songs.length))}
          action={
            // 頭から流して、お気に入りの曲の画面へ移る。もう流しているときは、止めずに移るだけ
            <button
              type="button"
              onClick={() => {
                if (!(owner.kind === 'favorites' && current)) playQueue(songs, 0, FAVORITES, true);
                router.push('/favorites/songs');
              }}
              className={PRIMARY}
            >
              <Icon name="play" className="size-5" />
              {terms.play}
            </button>
          }
        >
          <SongList
            songs={songs.slice(0, SONG_PREVIEW)}
            onOpen={(i) => {
              playQueue(songs, i, FAVORITES, true);
              router.push('/favorites/songs');
            }}
            className="grid gap-1 md:grid-cols-2 xl:grid-cols-3"
          />
        </Section>
      )}
      {producers.length > 0 && (
        <Section
          title={terms.producers}
          eyebrow="Producers"
          count={t.people(formatCount(producers.length))}
        >
          <div className={ARTIST_GRID}>
            {producers.map((p, i) => (
              <CoverCard
                key={p.id}
                href={`/producers/${p.id}`}
                playing={{ producerId: p.id }}
                cover={p.picture}
                round
                title={producerName(p.id, p.name)}
                eager={i < EAGER_IMAGES}
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
  action,
  children,
}: {
  title: string;
  eyebrow: string;
  count: string;
  /** 見出しの右端に置くボタン */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`${SECTION} first:mt-0 sm:first:mt-0`}>
      <div className="mb-3 flex items-end gap-3">
        <Heading eyebrow={eyebrow}>{title}</Heading>
        <span className="pb-1 text-sm text-muted">{count}</span>
        {action && <span className="ml-auto pb-0.5">{action}</span>}
      </div>
      {children}
    </section>
  );
}

const FAVORITES = { kind: 'favorites' } as const;
