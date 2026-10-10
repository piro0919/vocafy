'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { playlistCount } from '@/lib/list-titles';
import type { QueueItem } from '@/lib/catalog';
import { PlayerStage, StageControls, StagePlayButton, SwipeToLeave } from './player-stage';
import { PlaybackMode } from './player/playback-mode';
import { usePlayer } from './player/player-provider';
import { VirtualSongList } from './virtual-song-list';
import { useStageNotes } from './song-notes';
import { SingerSilhouette } from './singer-silhouette';
import { StageHeading } from './stage-heading';
import { useTakeOver } from './player/use-take-over';

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
  eyebrow,
  title,
  songs,
  total,
  pickup = false,
}: {
  /** 一覧の住所（years/2026 など） */
  source: string;
  /** 動画の下に出す題名。ページの側で作る */
  /** 動画の下の題名（stage-heading.tsx） */
  eyebrow: string;
  title: string;
  /** 流す曲（catalog.ts の Playlist。全曲か、全曲から選んだ PICKUP_SIZE 曲） */
  songs: QueueItem[];
  /** 一覧の全曲の数 */
  total: number;
  /** songs が全曲から選んだ曲か。代表曲やきょうの出会いのように、もともと少ない一覧は渡さない */
  pickup?: boolean;
}) {
  const { current, playing, listSource, playAll, toggle } = usePlayer();
  // この一覧を流しているときに、動画をここに大きく出す
  const here = current !== null && listSource === source;
  // 流している曲の動画の説明文（song-notes.tsx）
  const notes = useStageNotes(here ? current : null);
  // 流すのは songs だけ（多くても PICKUP_SIZE 曲で、1ページに収まる）。続きのページは読み足さない
  const last = 1;
  // 流している曲がこの一覧の1ページ目にあれば、開いたときに並びをこの一覧にする（use-take-over.ts。どの画面も同じ決まり）。
  // 続きのページも「再生」を押したときと同じく読み足す
  const owner = useMemo(
    () => ({ kind: 'list' as const, source: { source, start: 1, last } }),
    [source, last],
  );
  useTakeOver(here, songs, owner);

  // 共有されたり読み込み直したりした住所の曲。1ページ目にあれば、そこから流す
  const linked = useSyncExternalStore(noSubscribe, linkedSong, () => null);
  const linkedAt = linked ? songs.findIndex((s) => s.songId === linked) : -1;
  const linkedItem = !here && linkedAt >= 0 ? songs[linkedAt] : undefined;

  const play = (page: { number: number; songs: QueueItem[] }, at: number) =>
    page.songs.length > 0 && playAll(page.songs, { source, start: page.number, last }, { at });
  // 住所の曲（共有されたり読み込み直したりしたとき）が一覧にあれば、そこから流す。無ければ先頭から
  const start = () => play({ number: 1, songs }, Math.max(0, linkedAt));

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
        <SwipeToLeave className="lg:mt-4">
          <StageHeading eyebrow={eyebrow} title={title} song={here ? current : null} />
        </SwipeToLeave>
        <StageControls extra={notes.button}>
          <StagePlayButton playing={here && playing} onClick={() => (here ? toggle() : start())} />
          {/* 流す曲の数（一覧の画面のボタンの横と同じ表記）。スマホは段にアイコンが並んで入らないので出さない */}
          <p className="text-sm text-muted max-md:hidden [word-break:keep-all]">
            {playlistCount({ songs, total, pickup })}
          </p>
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
          total={songs.length}
          columns={1}
          onOpen={play}
        />
      </div>
    </div>
  );
}
