'use client';

import { useRouter, useText } from '@/i18n/navigation';
import { defineText } from '@/i18n/text';
import { useFavorites } from '@/lib/favorites';
import { HEADER_ICON } from './button-styles';
import { Icon } from './icon';
import { playStart } from './player/play-order';
import { usePlayer } from './player/player-provider';

const TEXT = defineText({ ja: { play: 'お気に入りを再生' }, en: { play: 'Play favorites' } });

const FAVORITES = { kind: 'favorites' } as const;

/**
 * お気に入りの曲を並びのどこかから流して（play-order.ts の playStart）、お気に入りの曲の画面へ移る。もうお気に入りを流しているときは、止めずに移るだけ。
 * お気に入りの曲が無ければ null
 */
export function usePlayFavorites() {
  const { items: songs } = useFavorites();
  const { owner, current, playQueue } = usePlayer();
  const router = useRouter();
  if (songs.length === 0) return null;
  return () => {
    if (!(owner.kind === 'favorites' && current))
      playQueue(songs, playStart(songs.length, true), FAVORITES, true);
    router.push('/favorites/songs');
  };
}

/**
 * 上の帯（スマホ）と上の段（パソコン）の、サイコロとログインのあいだのボタン（2026-10-12 に本人と決めた）。どの画面からでも、お気に入りを流す。
 * 左のメニューの「お気に入り」の行に指を乗せたときだけ ▶ を出す形も並べて試し、こちらにした
 */
export function FavoritesPlayButton() {
  const play = usePlayFavorites();
  const t = useText(TEXT);
  if (play === null) return null;
  return (
    <button
      type="button"
      onClick={play}
      aria-label={t.play}
      title={t.play}
      className={`grid ${HEADER_ICON}`}
    >
      <Icon name="favoritesPlay" className="size-5" />
    </button>
  );
}
