'use client';

import { useRef } from 'react';
import type { DatedItem } from '@/lib/catalog';
import { FadeImage } from './fade-image';
import { Heading } from './heading';
import { PlayAllPill } from './play-all';
import { Icon } from './icon';
import { Bars } from './now-playing';
import { usePlayer } from './player/player-provider';
import { usePreload } from './player/use-preload';
import { edgeMask, ShelfArrows, useShelfScroll } from './shelf';
import { SongItem, useOpenSong } from './song-list';
import { COVER_PLAY } from './button-styles';

/**
 * きょうの日付の曲。1曲を大きく見せ、残りを横に小さく並べる。
 * 大きく見せる1曲は、右の一覧と同じく投稿された年を添える（前後の日から補った曲は月日も）。
 * 残りは6曲（パソコンは7曲）ずつの列にして横に送る（年代の棚と同じ矢印と端のぼかし）。画面を移らずにその日の全曲をたどれる。
 * 見出しの右の「再生」で、その日の曲を通して流せる（一覧の再生用の画面へ移る）。「すべて表示」は、送ればこの欄で全部見られるので外した。
 * 列の幅は欄の9割ほどにして、次の列の端を見せる（2026-10-09 に本人と決めた。前は先頭の6〜7曲だけで、古い年の曲が出なかった）。
 * 送りの余白は左にだけ取る。右にも取ると、列が送りの計算に使う見える幅を超え、「次へ」で最後の列まで飛んだ
 */
export function OnThisDay({
  title,
  playlist,
  hero,
  rest,
  today,
}: {
  /** 区画の見出し（「10月9日に生まれた曲」） */
  title: string;
  /** 「再生」で流す、その日の一覧（日付の画面の1ページ目と、その住所・ページ数） */
  playlist: { songs: DatedItem[]; source: string; last: number };
  hero: DatedItem;
  rest: DatedItem[];
  /** きょうの日付（YYYY-MM-DD） */
  today: string;
}) {
  const { current, playing } = usePlayer();
  const { track, edge, update, page } = useShelfScroll<HTMLUListElement>();
  const open = useOpenSong();
  // 大きな1曲がニコニコの曲なら、埋め込みを先に読み込んでおく（iPad・iPhone だけ。右の一覧の行は SongItem が読む）
  const heroButton = useRef<HTMLButtonElement>(null);
  usePreload(heroButton, hero.videoId);
  const sameDay = (iso: string) => iso.slice(5) === today.slice(5);
  const heroActive = current?.songId === hero.songId;

  return (
    <section className="mt-2 sm:mt-4">
      <div className="mb-3 flex items-end gap-3">
        <Heading eyebrow="On This Day">{title}</Heading>
        <div className="ml-auto flex items-center gap-2">
          {rest.length > 0 && <ShelfArrows edge={edge} page={page} />}
          <PlayAllPill
            songs={playlist.songs}
            list={{ source: playlist.source, page: 1, last: playlist.last }}
          />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-8">
        <button
          ref={heroButton}
          type="button"
          data-preload={hero.service === 'niconico' ? hero.videoId : undefined}
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
              className="object-cover group-hover:scale-[1.03]"
            />
            <span className={`absolute right-3 bottom-3 size-12 ${COVER_PLAY}`}>
              <Icon name={heroActive && playing ? 'pause' : 'play'} />
            </span>
          </span>
          <span className="min-w-0">
            <span className="block font-tech text-xs font-black tracking-[0.2em] text-accent">
              {/* 右の一覧と同じ形。同じ日の曲は年だけ、前後の日から補った曲は月日も（今のデータでは0曲の日は無い） */}
              {sameDay(hero.publishedOn)
                ? hero.publishedOn.slice(0, 4)
                : hero.publishedOn.slice(0, 10).replaceAll('-', '.')}
            </span>
            <span className="mt-1 flex items-center gap-2 font-display text-2xl leading-tight sm:text-3xl">
              <span className="min-w-0 truncate">{hero.title}</span>
              {heroActive && <Bars playing={playing} />}
            </span>
            <span className="mt-1 block truncate text-sm text-muted">
              {hero.producerName}
              {hero.vocalists && ` ・ ${hero.vocalists}`}
            </span>
          </span>
        </button>

        {rest.length > 0 && (
          <ul
            ref={track}
            onScroll={update}
            style={{ maskImage: edgeMask(edge) }}
            className="-mx-4 grid auto-cols-[88%] grid-flow-col grid-rows-6 content-start gap-x-3 gap-y-1 overflow-x-auto px-4 [scrollbar-width:none] snap-x scroll-pl-6 sm:-mx-8 sm:auto-cols-[min(22rem,80%)] sm:scroll-pl-8 sm:px-8 lg:mx-0 lg:auto-cols-[90%] lg:grid-rows-7 lg:scroll-pl-6 lg:px-0 [&::-webkit-scrollbar]:hidden"
          >
            {rest.map((song) => (
              // 行は曲の一覧と同じ部品。同じ日の曲は年だけ、前後の日から補った曲は月日も添える
              <li key={song.songId} className="min-w-0">
                <SongItem
                  song={song}
                  onOpen={() => open(song)}
                  meta={
                    <span className="shrink-0 font-tech text-xs font-black text-accent">
                      {sameDay(song.publishedOn)
                        ? song.publishedOn.slice(0, 4)
                        : song.publishedOn.slice(0, 10).replaceAll('-', '.')}
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
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
  // ニコニコの曲の表紙が見えているあいだ、埋め込みを先に読み込んでおく（iPad・iPhone だけ）
  const wall = useRef<HTMLDivElement>(null);
  usePreload(wall, songs);
  return (
    <div ref={wall} className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2 lg:grid-cols-6">
      {songs.map((song, i) => {
        const active = current?.songId === song.songId;
        return (
          <button
            key={song.songId}
            type="button"
            aria-label={`${song.title}（${song.producerName}）`}
            title={song.title}
            data-preload={song.service === 'niconico' ? song.videoId : undefined}
            onClick={() => open(song)}
            className={`group relative aspect-video overflow-hidden rounded-xl bg-surface transition-[scale] duration-150 ease-(--ease-out) active:scale-95 ${active ? 'ring-2 ring-miku ring-offset-2 ring-offset-background' : ''} ${i >= 12 ? 'max-lg:hidden' : ''}`}
          >
            <FadeImage
              src={song.thumb}
              alt=""
              fill
              sizes="(min-width: 64rem) 16vw, (min-width: 40rem) 25vw, 33vw"
              className="object-cover group-hover:scale-105"
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
