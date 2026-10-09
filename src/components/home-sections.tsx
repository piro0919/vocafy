'use client';

import type { DatedItem } from '@/lib/catalog';
import { smallThumbOf } from '@/lib/thumb';
import { FadeImage } from './fade-image';
import { FavoriteButton } from './favorite-button';
import { Icon } from './icon';
import { Bars } from './now-playing';
import { usePlayer } from './player/player-provider';
import { useOpenSong } from './song-list';

/** 「2012年10月8日」 */
function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${y}年${m}月${d}日`;
}

/**
 * きょうの日付の曲。1曲を大きく見せ、残りを下に小さく並べる。
 * 大きく見せる1曲は、何年前のきょうに出た曲かを添える。前後の日から補った曲は、その日付を添える
 */
export function OnThisDay({
  hero,
  rest,
  today,
}: {
  hero: DatedItem;
  rest: DatedItem[];
  /** きょうの日付（YYYY-MM-DD） */
  today: string;
}) {
  const { current, playing } = usePlayer();
  const open = useOpenSong();
  const sameDay = (iso: string) => iso.slice(5) === today.slice(5);
  const yearsAgo = Number(today.slice(0, 4)) - Number(hero.publishedOn.slice(0, 4));
  const heroActive = current?.songId === hero.songId;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-8">
      <button
        type="button"
        onClick={() => open(hero)}
        className="group flex min-w-0 flex-col gap-3 text-left sm:flex-row sm:items-end lg:flex-col lg:items-stretch"
      >
        <span className="relative block aspect-video w-full shrink-0 overflow-hidden rounded-2xl bg-surface shadow-lg shadow-black/10 sm:w-1/2 lg:w-full">
          <FadeImage
            src={hero.thumb}
            alt=""
            fill
            sizes="(min-width: 64rem) 40vw, (min-width: 40rem) 50vw, 100vw"
            loading="eager"
            className="object-cover transition-[opacity,scale] duration-300 ease-out group-hover:scale-[1.03]"
          />
          <span className="absolute right-3 bottom-3 grid size-12 place-items-center rounded-full bg-miku text-on-miku shadow-lg shadow-miku/30 transition-[scale] duration-150 ease-out group-hover:scale-105 group-active:scale-95">
            <Icon name={heroActive && playing ? 'pause' : 'play'} />
          </span>
        </span>
        <span className="min-w-0">
          <span className="block font-tech text-xs font-black tracking-[0.2em] text-accent">
            {sameDay(hero.publishedOn) && yearsAgo > 0
              ? `${yearsAgo} YEARS AGO`
              : longDate(hero.publishedOn)}
          </span>
          <span className="mt-1 flex items-center gap-2 font-display text-2xl leading-tight sm:text-3xl">
            <span className="min-w-0 truncate">{hero.title}</span>
            {heroActive && <Bars playing={playing} />}
          </span>
          <span className="mt-1 block truncate text-sm text-muted">
            {hero.producerName}
            {hero.vocalists && ` ・ ${hero.vocalists}`}
          </span>
          <span className="mt-0.5 block text-xs text-muted">{longDate(hero.publishedOn)} 投稿</span>
        </span>
      </button>

      {rest.length > 0 && (
        <ul className="grid content-start gap-1 sm:grid-cols-2 lg:grid-cols-1">
          {rest.map((song, i) => {
            const active = current?.songId === song.songId;
            return (
              // 縦に長くなりすぎるので、スマホの幅では6曲、1列になるパソコンの幅では7曲までにする
              <li
                key={song.songId}
                className={`group flex min-w-0 items-center rounded-xl transition-colors duration-150 ${active ? 'bg-sidebar/60' : 'hover:bg-foreground/8'} ${
                  i >= 7 ? 'max-sm:hidden lg:hidden' : i >= 6 ? 'max-sm:hidden' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => open(song)}
                  className="flex min-w-0 flex-1 items-center gap-3 p-1.5 text-left transition-[scale] duration-150 ease-out active:scale-[0.98]"
                >
                  <FadeImage
                    src={smallThumbOf(song)}
                    alt=""
                    width={85}
                    height={48}
                    className="aspect-video shrink-0 rounded-lg object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-bold">
                      <span className="truncate">{song.title}</span>
                      {active && <Bars playing={playing} />}
                    </span>
                    <span className="block truncate text-xs text-muted">{song.producerName}</span>
                  </span>
                  {/* 同じ日の曲は年だけ、前後の日から補った曲は月日も添える */}
                  <span className="shrink-0 font-tech text-xs font-black text-accent">
                    {sameDay(song.publishedOn)
                      ? song.publishedOn.slice(0, 4)
                      : song.publishedOn.slice(0, 10).replaceAll('-', '.')}
                  </span>
                </button>
                <FavoriteButton song={song} quiet />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * 日替わりの無作為の並び。表紙をすき間なく敷き詰めた壁で、押すとその曲を流す。
 * 曲名は、マウスを載せたときと、流している曲にだけ重ねる。どの幅でも3〜4行に収める。
 * 4行の壁は、絵ばかりが続いて見る気が薄れ、下の区画も押し下げた（2026-10-09）。
 * パソコンは 6 列で 18 曲、それより狭い幅は 12 曲だけ出す
 */
export function MixWall({ songs }: { songs: DatedItem[] }) {
  const { current, playing } = usePlayer();
  const open = useOpenSong();
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2 lg:grid-cols-6">
      {songs.map((song, i) => {
        const active = current?.songId === song.songId;
        return (
          <button
            key={song.songId}
            type="button"
            aria-label={`${song.title}（${song.producerName}）`}
            title={song.title}
            onClick={() => open(song)}
            className={`group relative aspect-video overflow-hidden rounded-xl bg-surface transition-[scale] duration-150 ease-out active:scale-95 ${active ? 'ring-2 ring-miku ring-offset-2 ring-offset-background' : ''} ${i >= 12 ? 'max-lg:hidden' : ''}`}
          >
            <FadeImage
              src={song.thumb}
              alt=""
              fill
              sizes="(min-width: 64rem) 16vw, (min-width: 40rem) 25vw, 33vw"
              className="object-cover transition-[opacity,scale] duration-300 ease-out group-hover:scale-105"
            />
            <span
              className={`absolute inset-x-0 bottom-0 flex items-center gap-1 bg-linear-to-t from-black/75 to-transparent px-2 pt-5 pb-1.5 text-left text-xs font-bold text-white transition-opacity duration-150 ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            >
              <span className="min-w-0 truncate">{song.title}</span>
              {active && <Bars playing={playing} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
