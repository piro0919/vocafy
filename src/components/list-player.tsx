'use client';

import { type ReactNode, useEffect, useSyncExternalStore } from 'react';
import type { QueueItem } from '@/lib/catalog';
import { PlayerStage, StageControls, StagePlayButton, SwipeToLeave } from './player-stage';
import { PlaybackMode } from './player/playback-mode';
import { usePlayer } from './player/player-provider';
import { VirtualSongList } from './virtual-song-list';
import { useStageNotes } from './song-notes';
import { SingerSilhouette } from './singer-silhouette';

/** 1ページの曲の数（src/lib/catalog.ts の PAGE_SIZE と同じ） */
const PAGE_SIZE = 300;

/** 住所は画面の中では変わらないので、見張らない */
const noSubscribe = () => () => {};

/** 住所の ?song= の曲の id。無ければ null */
function linkedSong(): number | null {
  const id = Number(new URLSearchParams(window.location.search).get('song'));
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * 一覧（年・日付・歌声の年）の再生用の画面。ボカロPの画面と同じく、左（スマホは上）に大きなプレイヤーの
 * 置き場所、右に一覧。一覧の画面の「すべて再生」を押すとここへ移る（play-all.tsx）。
 * この一覧を流しているあいだ（listSource が同じ）は、共通のプレイヤーが置き場所に重なって大きく出る。
 * 一覧の曲を押すと、ボカロPの画面へは移らず、この一覧のその曲から流す。流している曲は住所に入れる（?song=）。
 * 一覧は全部を描かず、見えている行だけを描く（VirtualSongList）。流すのも、終わりが近づいたら次のページを読み足す
 */
export function ListPlayer({
  source,
  heading,
  songs,
  total,
}: {
  /** 一覧の住所（years/2026 など） */
  source: string;
  /** 動画の下に出す題名。ページの側で作る */
  heading: ReactNode;
  /** 1ページ目の曲 */
  songs: QueueItem[];
  total: number;
}) {
  const { current, playing, listSource, playAll, toggle } = usePlayer();
  // この一覧を流しているときに、動画をここに大きく出す
  const here = current !== null && listSource === source;
  // 流している曲の動画の説明文（song-notes.tsx）
  const notes = useStageNotes(here ? current : null);
  const last = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // 共有されたり読み込み直したりした住所の曲。1ページ目にあれば、そこから流す
  const linked = useSyncExternalStore(noSubscribe, linkedSong, () => null);
  const linkedAt = linked ? songs.findIndex((s) => s.songId === linked) : -1;
  const linkedItem = !here && linkedAt >= 0 ? songs[linkedAt] : undefined;

  const play = (page: { number: number; songs: QueueItem[] }, at: number) =>
    page.songs.length > 0 && playAll(page.songs, { source, start: page.number, last }, { at });
  const start = () => {
    if (!linked || linkedAt >= 0) {
      play({ number: 1, songs }, Math.max(0, linkedAt));
      return;
    }
    // 住所の曲が1ページ目に無い（301曲目より後の曲を流していて読み込み直した）。2ページ目から順に探し、見つかったページの
    // その曲から流す。ページは CDN に作り置かれている（/api/list）ので、DB はほぼ起きない。見つからなければ先頭から
    void (async () => {
      for (let number = 2; number <= last; number++) {
        const res = await fetch(`/api/list/${source}/${number}`).catch(() => null);
        if (!res?.ok) break;
        const page = (await res.json()) as QueueItem[];
        const at = page.findIndex((s) => s.songId === linked);
        if (at >= 0) {
          play({ number, songs: page }, at);
          return;
        }
      }
      play({ number: 1, songs }, 0);
    })();
  };

  // この一覧を流しているあいだは、住所に流している曲を入れる。曲が変わるたびに履歴を増やさずに書き換える
  useEffect(() => {
    // ラジオのときは入れない（この一覧の住所に、一覧に無い曲を指させない）
    if (listSource !== source || !current) return;
    const url = new URL(window.location.href);
    // ほかの画面へ移る途中（住所がもうこの画面のものでない）は書き換えない
    if (url.pathname !== `/${source}/play`) return;
    if (url.searchParams.get('song') === String(current.songId)) return;
    url.searchParams.set('song', String(current.songId));
    // 最初の引数は null にする（Next.js の資料のとおり）。今の履歴の中身（どの画面か）を写すと、画面を移る途中に
    // 前の画面の中身が新しい住所の履歴に紛れ込み、戻る操作が効かないことがあった
    window.history.replaceState(null, '', url);
  }, [listSource, current, source]);

  return (
    // ボカロPの画面（producer-player.tsx）と同じ組み立て
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
      <div className="contents lg:sticky lg:top-25 lg:block">
        <PlayerStage
          active={here}
          cover={linkedItem?.thumb ?? songs[0]?.thumb ?? null}
          label={linkedItem ? `「${linkedItem.title}」から再生` : 'この一覧を再生'}
          onPlay={start}
        />
        <SwipeToLeave className="lg:mt-4">{heading}</SwipeToLeave>
        <StageControls extra={notes.button}>
          <StagePlayButton playing={here && playing} onClick={() => (here ? toggle() : start())} />
          {/* スマホは下の帯にランダム・ループ・ラジオが入りきらないので、ここに置く */}
          {notes.button}
          <PlaybackMode className="md:hidden" radio scroll />
        </StageControls>
        {notes.view}
        <SingerSilhouette song={here ? current : null} />
      </div>

      <div className="-mx-1.5">
        <VirtualSongList
          source={source}
          page={1}
          songs={songs}
          total={total}
          columns={1}
          onOpen={play}
        />
      </div>
    </div>
  );
}
