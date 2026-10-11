'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
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
import { RESPONSIVE_SIZES } from '@/lib/image-sizes';
import { canFlow, subscribeMixFlow } from '@/lib/mix-flow';
import { LINEAR } from '@/lib/motion';
import { dayLabel } from '@/lib/iso-date';

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
  /** pickup は、全曲から選んだ曲を流すか（catalog.ts の Playlist） */
  playlist: { songs: DatedItem[]; source: string; last: number; pickup: boolean };
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
            pickup={playlist.pickup}
          />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-hero lg:gap-8">
        <button
          ref={heroButton}
          type="button"
          data-preload={hero.service === 'niconico' ? hero.videoId : undefined}
          onClick={() => open(hero)}
          // 押せるのは表紙と文字だけ。タブレットの幅では表紙の横に文字を下ぞろえで置くので、ボタンの四角のうち文字の上と右が空く。
          // そこを押しても流れないよう、ボタン自体は押せなくし、中の表紙と文字で受ける（押した操作はボタンまで伝わる）
          className="group pointer-events-none flex min-w-0 flex-col gap-3 self-start text-left sm:flex-row sm:items-end lg:flex-col lg:items-stretch"
        >
          <span className="pointer-events-auto relative block aspect-video w-full shrink-0 overflow-hidden rounded-2xl bg-surface shadow-lift sm:w-1/2 lg:w-full">
            <FadeImage
              src={hero.thumb}
              alt=""
              fill
              sizes={RESPONSIVE_SIZES.hero}
              loading="eager"
              className="object-cover group-hover:scale-103"
            />
            <span className={`absolute right-3 bottom-3 size-12 ${COVER_PLAY}`}>
              <Icon name={heroActive && playing ? 'pause' : 'play'} />
            </span>
          </span>
          <span className="pointer-events-auto min-w-0">
            <span className="block font-tech text-xs font-black tracking-label text-accent">
              {/* 右の一覧と同じ形。同じ日の曲は年だけ、前後の日から補った曲は月日も（今のデータでは0曲の日は無い） */}
              {dayLabel(hero.publishedOn, today)}
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
            className="bleed-x grid auto-cols-day grid-flow-col grid-rows-3 content-start gap-x-3 gap-y-1 overflow-x-auto no-scrollbar snap-x sm:auto-cols-day-sm lg:mx-0 lg:auto-cols-day-lg lg:grid-rows-7 lg:scroll-px-fade lg:px-0"
          >
            {rest.map((song) => (
              // 行は曲の一覧と同じ部品。同じ日の曲は年だけ、前後の日から補った曲は月日も添える
              <li key={song.songId} className="min-w-0">
                <SongItem
                  song={song}
                  onOpen={() => open(song)}
                  meta={
                    <span className="shrink-0 font-tech text-xs font-black text-accent">
                      {dayLabel(song.publishedOn, today)}
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
 * どの幅でも3段までにする。パソコンは 6 列×3 段で 18 曲。それより狭い幅は、3段のまま列を横に送って 18 曲を出す
 * （2026-10-11。スマホの4段は多く見え、一度は 9 曲に減らしたが、ほかの棚と同じく横に送る形にした）
 */
export function MixWall({ songs }: { songs: DatedItem[] }) {
  const flowing = useSyncExternalStore(subscribeMixFlow, canFlow, () => false);
  return flowing ? <FlowingWall songs={songs} /> : <StaticWall songs={songs} />;
}

/** いままでの壁。パソコンは6列×3段で止まったまま、パソコンより狭い幅は3段のまま列を横に送る（ほかの棚と同じ） */
function StaticWall({ songs }: { songs: DatedItem[] }) {
  // ニコニコの曲の表紙が見えているあいだ、埋め込みを先に読み込んでおく（iPad・iPhone だけ）
  const { track: wall, edge, update } = useShelfScroll<HTMLDivElement>();
  usePreload(wall, songs);
  return (
    // 一度に見えるのは3〜4列と、次の列の端
    <div
      ref={wall}
      onScroll={update}
      style={{ maskImage: edgeMask(edge) }}
      className="bleed-x grid auto-cols-mix grid-flow-col grid-rows-3 gap-1.5 overflow-x-auto no-scrollbar snap-x sm:auto-cols-mix-sm sm:gap-2 lg:mx-0 lg:grid-flow-row lg:grid-cols-6 lg:grid-rows-none lg:overflow-visible lg:px-0"
    >
      {songs.map((song) => (
        <MixTile key={song.songId} song={song} className="snap-start" />
      ))}
    </div>
  );
}

/** 流す壁の1段の曲数。パソコンの止まった壁の1段と同じ */
const FLOW_COLUMNS = 6;
const FLOW_MASK = edgeMask({ start: false, end: false });
/** 流す速さ（1秒あたりの px）。流れる曲名（marquee.tsx）と同じく、時間でなく目で追える速さで決める */
const FLOW_SPEED = 20;

/**
 * 流す壁（2026-10-11 に本人と決めた）。パソコンの止まった壁と同じ6曲ずつの3段を、段ごとに左右交互にゆっくり流し続ける。
 * 各段は同じ6曲を2周分並べ、1周分（6枚と6つのすき間）ずれたら頭に戻してつなぐ。流し始めの絵は止まった壁と同じなので、
 * 開いたあとに切り替わっても位置は跳ばない。押し間違えないよう、マウスが乗っている間・フォーカスがある間は止め、
 * 画面の外にあるときとタブを裏に回したときも止める。2周目は読み上げとキーボードから隠す（同じ曲が2回読まれないように）。
 * inert で隠すと、2周目が画面に出ているあいだマウスでも押せなくなるので、aria-hidden と tabIndex で隠す
 */
function FlowingWall({ songs }: { songs: DatedItem[] }) {
  const wall = useRef<HTMLDivElement>(null);
  const rows = Array.from({ length: Math.ceil(songs.length / FLOW_COLUMNS) }, (_, i) =>
    songs.slice(i * FLOW_COLUMNS, (i + 1) * FLOW_COLUMNS),
  );
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [shown, setShown] = useState(true);
  const animations = useRef<Animation[]>([]);
  const running = !hovered && !focused && visible && shown;

  // 段ごとに流す。幅が変わったら、進んだ割合を保ったまま流し直す
  useEffect(() => {
    const root = wall.current;
    if (!root) return;
    const start = () => {
      const progress = animations.current.map((a) => {
        const { progress: p } = a.effect?.getComputedTiming() ?? {};
        return p ?? 0;
      });
      for (const a of animations.current) a.cancel();
      const tracks = [...root.querySelectorAll<HTMLElement>('[data-flow-track]')];
      animations.current = tracks.map((track, i) => {
        // 1周分の長さ。札の幅は（段の幅＋すき間）÷6 で、札の右にすき間を持つので、6枚で段の幅＋すき間になる
        const gap =
          parseFloat(getComputedStyle(track.firstElementChild ?? track).paddingRight) || 0;
        const distance = track.clientWidth + gap;
        const frames = [
          { transform: 'translateX(0)' },
          { transform: `translateX(-${distance}px)` },
        ];
        const animation = track.animate(i % 2 === 0 ? frames : frames.toReversed(), {
          duration: (distance / FLOW_SPEED) * 1000,
          iterations: Infinity,
          easing: LINEAR,
        });
        if (animation.effect)
          animation.currentTime = (progress[i] ?? 0) * (distance / FLOW_SPEED) * 1000;
        return animation;
      });
    };
    start();
    const resize = new ResizeObserver(start);
    resize.observe(root);
    return () => {
      resize.disconnect();
      for (const a of animations.current) a.cancel();
      animations.current = [];
    };
  }, [songs]);

  useEffect(() => {
    for (const a of animations.current) {
      if (running) a.play();
      else a.pause();
    }
  }, [running]);

  useEffect(() => {
    const root = wall.current;
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry?.isIntersecting ?? false),
    );
    observer.observe(root);
    const onVisibility = () => setShown(document.visibilityState === 'visible');
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <div
      ref={wall}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
      className="flex flex-col gap-2"
    >
      {rows.map((row, i) => (
        // 両端は、続きのある棚と同じくぼかす（流れ続けるので、どちらの端にもいつも続きがある）
        <div key={row[0]?.songId ?? i} style={{ maskImage: FLOW_MASK }} className="overflow-hidden">
          <div data-flow-track className="flex">
            {[0, 1].map((lap) =>
              row.map((song) => (
                <div
                  key={`${lap}-${song.songId}`}
                  aria-hidden={lap === 1 || undefined}
                  className="w-mix-tile shrink-0 pr-2"
                >
                  <MixTile song={song} className="w-full" copy={lap === 1} />
                </div>
              )),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** 壁の1枚。押すとその曲のボカロPの画面へ移って流す */
function MixTile({
  song,
  className,
  copy = false,
}: {
  song: DatedItem;
  className: string;
  /** 流す壁の2周目。キーボードで止まらない */
  copy?: boolean;
}) {
  const { current, playing } = usePlayer();
  const open = useOpenSong();
  const active = current?.songId === song.songId;
  return (
    <button
      type="button"
      aria-label={`${song.title}（${song.producerName}）`}
      title={song.title}
      tabIndex={copy ? -1 : undefined}
      data-preload={song.service === 'niconico' ? song.videoId : undefined}
      onClick={() => open(song)}
      className={`group relative block aspect-video overflow-hidden rounded-xl bg-surface transition duration-react active:scale-95 ${active ? 'ring-2 ring-miku ring-offset-2 ring-offset-background' : ''} ${className}`}
    >
      <FadeImage
        src={song.thumb}
        alt=""
        fill
        sizes={RESPONSIVE_SIZES.mixTile}
        className="object-cover group-hover:scale-105"
      />
      <span
        className={`absolute inset-x-0 bottom-0 flex items-center gap-1 bg-linear-to-t from-black/75 to-transparent px-2 pt-5 pb-1.5 text-left text-xs font-bold text-white transition-opacity duration-react ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
      >
        <span className="min-w-0 truncate">{song.title}</span>
        {active && <Bars playing={playing} />}
      </span>
    </button>
  );
}
