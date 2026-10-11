'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DatedItem } from '@/lib/catalog';
import { useFavoriteProducers } from '@/lib/favorites';
import { useHistory } from '@/lib/history';
import { Heading, SECTION } from './heading';
import { SongItem, useOpenSong } from './song-list';
import { ShelfArrows, useShelfScroll } from './shelf';
import { edgeMask } from './scroll-row';
import { EAGER_IMAGES } from '@/lib/image-sizes';
import { atLeast } from '@/lib/breakpoints';
import { defineText } from '@/i18n/text';
import { useText } from '@/i18n/navigation';

const TEXT = defineText({
  ja: { title: 'お気に入りのボカロPの新曲' },
  en: { title: 'New from your producers' },
});

/** 新しい曲を読むボカロPの数（お気に入りに足した新しい順） */
const PRODUCERS = 12;
/**
 * 棚に出す曲の数。2行に並べて横に送る。1人あたりは PER_PRODUCER 曲までなので、お気に入りのボカロPが少ない人は
 * もっと少なくなる（2026-10-11 に本人と決めた。前は1人6曲・全体12曲で、最近たくさん出した1人が棚を埋めた）
 */
const SONGS = 18;
/** 棚の行の数（SHELF の grid-rows-2） */
const ROWS = 2;
/** パソコンで列を棚の幅いっぱいに広げるとき、上限の幅の何倍まで広げてよいか */
const STRETCH_LIMIT = 1.25;
/** 1人のボカロPから読む曲の数（/api/latest/[producer] が返す数。catalog.ts の LATEST_PER_PRODUCER） */
const PER_PRODUCER = 3;
/**
 * 棚の並べ方。どの幅でも2行に並べて横に送る（列の幅はきょうの日付の曲の右側と同じ）。
 * パソコンで格子にしていたころは、列を幅いっぱいに伸ばすと曲名と右端のハートのあいだが大きく空き、列の幅に上限を付けると
 * 棚の右が空いた（2026-10-11 に本人と決めた）
 */
const SHELF =
  'bleed-x grid auto-cols-day grid-flow-col grid-rows-2 content-start gap-x-3 gap-y-1 overflow-x-auto no-scrollbar snap-x sm:auto-cols-day-sm lg:mx-0 lg:auto-cols-day-lg lg:scroll-px-fade lg:px-0';

/**
 * トップの「お気に入りのボカロPの新曲」。お気に入りに入れたボカロPの新しい曲を、投稿の新しい順に混ぜて並べる。
 * お気に入りはブラウザの中にあるので、トップの作り置きには入れられず、ブラウザで /api/latest/[producer] から集める。
 * お気に入りのボカロPがいない人には何も出さない（その人のトップは今までと変わらない）。
 * トップは人気で並べずフラットにすると決めているが、これは来るたびに中身が変わる、その人だけの棚なので置く
 */
export function FavoriteNewSongs() {
  const { items: producers } = useFavoriteProducers();
  const open = useOpenSong();
  const t = useText(TEXT);
  const ids = producers.slice(0, PRODUCERS).map((p) => p.id);
  const key = ids.join(',');
  const [loaded, setLoaded] = useState<{ key: string; songs: DatedItem[] } | null>(null);

  useEffect(() => {
    if (!key) return;
    let current = true;
    Promise.all(
      key.split(',').map((id) =>
        fetch(`/api/latest/${id}`)
          .then((res) => (res.ok ? (res.json() as Promise<DatedItem[]>) : []))
          .catch(() => [] as DatedItem[]),
      ),
    ).then((lists) => {
      if (!current) return;
      const seen = new Set<number>();
      const songs = lists
        .flat()
        .filter((s) => (seen.has(s.songId) ? false : (seen.add(s.songId), true)))
        .toSorted((a, b) => b.publishedOn.localeCompare(a.publishedOn))
        .slice(0, SONGS);
      setLoaded({ key, songs });
    });
    return () => {
      current = false;
    };
  }, [key]);

  // もう聴いた曲（このブラウザの視聴履歴にある曲）は後ろへ回す。並びは、聴いていない曲の新しい順、そのあとに聴いた曲の
  // 新しい順。新しい順のままだと毎週の取り込みまで並びが変わらず、来るたびに同じ曲が先頭にあった（2026-10-11 に本人と決めた）。
  // 棚に出す曲（新しい SONGS 曲）は変えず、並びだけを変える
  const history = useHistory();
  const fetched = loaded?.key === key ? loaded.songs : null;
  const songs = useMemo(() => {
    if (!fetched) return null;
    const heard = new Set(history.map((s) => s.songId));
    return [
      ...fetched.filter((s) => !heard.has(s.songId)),
      ...fetched.filter((s) => heard.has(s.songId)),
    ];
  }, [fetched, history]);
  // 棚は曲を読み終えてから出るので、出たところで端の見張りを始める
  const { track, edge, page } = useShelfScroll<HTMLUListElement>(songs);

  // パソコンでは、列を棚の幅いっぱいに割り付ける。列の幅の上限（auto-cols-day-lg）で何列入るかを決め、その列数で
  // 棚の幅をちょうど割る。端が中途半端に切れる列を出さず、矢印でちょうど1画面ずつ送れる（2026-10-11 に本人と決めた）。
  // 列の数は CSS だけでは割り出せないので、上限の幅の列を一度置いて測る。スマホは次の列の端を見せる今の形のまま。
  // 棚は読み終えてから出るので、列の幅と送れるか（矢印を出すか）は、読み終えたときと幅が変わったときに測り直す
  useEffect(() => {
    if (!songs) return;
    const wide = window.matchMedia(atLeast('lg'));
    const fit = () => {
      const el = track.current;
      if (!el) return;
      el.style.gridAutoColumns = '';
      const column = el.firstElementChild?.getBoundingClientRect().width ?? 0;
      if (wide.matches && column > 0) {
        const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
        // 入る列の数と、曲で埋まる列の数の少ない方で割る。入る数で割ると、曲が少ないときに右の列が空いた
        const columns = Math.min(
          Math.ceil((el.clientWidth + gap) / (column + gap)),
          Math.ceil(el.children.length / ROWS),
        );
        const width = (el.clientWidth - (columns - 1) * gap) / columns;
        // 曲が少なく1列が広がりすぎるときは、上限の幅のまま左に寄せる（行が長いと曲名と右端のあいだが空く）
        if (width <= column * STRETCH_LIMIT) el.style.gridAutoColumns = `${width}px`;
      }
      // 列の幅を変えても帯の大きさは変わらず、端の見張り（useScrollEdges）の大きさの見張りでは拾えないので、測り直させる
      el.dispatchEvent(new Event('scroll'));
    };
    fit();
    // 画面の大きさを変えているあいだは resize が続けて届く。測るたびに画面の配置を計算し直させるので、1コマに1回にする
    let frame = 0;
    const onResize = () => {
      frame ||= requestAnimationFrame(() => {
        frame = 0;
        fit();
      });
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
    // track は描くたびに同じものが返る
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songs]);
  // お気に入りのボカロPがいない人、読み終えて曲が無かった人には出さない
  if (!key || songs?.length === 0) return null;
  return (
    <section className={SECTION} aria-busy={!songs}>
      <div className="mb-3 flex items-end gap-3">
        <Heading eyebrow="From Your Favorites">{t.title}</Heading>
        {/* 曲が棚に収まって送る必要が無いときは、矢印を出さない */}
        {songs && !(edge.start && edge.end) && (
          <div className="ml-auto flex items-center gap-2">
            <ShelfArrows edge={edge} page={page} />
          </div>
        )}
      </div>
      {songs ? (
        // 2行に並べて横に送る（きょうの日付の曲と同じ形）。スマホで12曲を縦に並べると棚だけで画面1枚半になり、
        // 下のきょうの出会いがずっと下に押し出された（2026-10-11）
        <ul ref={track} style={{ maskImage: edgeMask(edge) }} className={SHELF}>
          {songs.map((song, i) => (
            <li key={song.songId} className="min-w-0">
              <SongItem song={song} eager={i < EAGER_IMAGES} onOpen={() => open(song)} />
            </li>
          ))}
        </ul>
      ) : (
        // 読み込むあいだは、曲の行の形だけを並べて場所を取っておく。読み終えたときに下の区画が押し下がらないように
        <div aria-hidden className={SHELF}>
          {/* 読み終えたときと同じ数（多くて SONGS 曲）を並べ、高さを合わせる */}
          {Array.from({ length: Math.min(SONGS, ids.length * PER_PRODUCER) }, (_, i) => (
            <div key={i} className="flex items-center gap-3 p-1.5">
              <span className="aspect-video w-thumb shrink-0 animate-pulse rounded bg-surface" />
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="h-3.5 w-2/3 animate-pulse rounded bg-surface" />
                <span className="h-3 w-1/2 animate-pulse rounded bg-surface/70" />
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
