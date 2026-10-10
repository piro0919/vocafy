'use client';

import { useEffect, useMemo, useState } from 'react';
import type { QueueItem } from '@/lib/catalog';
import { PlayerStage, StageControls, StagePlayButton, SwipeToLeave } from './player-stage';
import { PlaybackMode } from './player/playback-mode';
import { usePlayer } from './player/player-provider';
import { SongItem } from './song-list';
import { useStageNotes } from './song-notes';
import { SingerSilhouette } from './singer-silhouette';
import { StageHeading } from './stage-heading';
import { useTakeOver } from './player/use-take-over';
import { EAGER_IMAGES } from '@/lib/image-sizes';

/**
 * ラジオの画面。一覧の再生用の画面（list-player.tsx）と同じく、左（スマホは上）に大きなプレイヤーの置き場所、右に一覧。
 * 一覧は、先頭が元の曲、続いてその関連曲。このラジオを流しているあいだは、流している並びをそのまま出す。
 * 並びは最後の曲に入ると後ろに伸びる（player-provider.tsx）ので、一覧も下に伸びていく。
 * 関連曲はこの画面を開いてから /api/related で取り、届くまでは元の曲の下に仮の行を出す（page.tsx の説明）
 */
export function RadioPlayer({
  seed,
  eyebrow,
  title,
}: {
  seed: QueueItem;
  /** 動画の下の題名（stage-heading.tsx） */
  eyebrow: string;
  title: string;
}) {
  const {
    current,
    playing,
    queue,
    radioHome,
    playRadio,
    fillRadio,
    jumpTo,
    toggle,
    skipsNiconico,
  } = usePlayer();
  const here = current !== null && radioHome === `/radio/${seed.songId}`;
  // 流している曲の動画の説明文（song-notes.tsx）
  const notes = useStageNotes(here ? current : null);
  // 届くまでは null。取れなかったときは空にして、元の曲だけのラジオにする
  const [related, setRelated] = useState<QueueItem[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`/api/related/${seed.songId}`)
      .then((res) => (res.ok ? (res.json() as Promise<QueueItem[]>) : []))
      .catch(() => [])
      .then((items) => {
        if (alive) setRelated(items.filter((s) => s.songId !== seed.songId));
      });
    return () => {
      alive = false;
    };
  }, [seed.songId]);
  const songs = useMemo(() => (related ? [seed, ...related] : [seed]), [seed, related]);
  // 流している曲がこのラジオの一覧にあれば、開いたときに並びをこのラジオにする（use-take-over.ts。どの画面も同じ決まり）。
  // 関連曲は届いてから見るので、元の曲以外は少し遅れて切り替わる
  const owner = useMemo(
    () => ({ kind: 'radio' as const, home: `/radio/${seed.songId}` }),
    [seed.songId],
  );
  useTakeOver(here, songs, owner);
  const list = here ? queue : songs;
  // 流している並びがまだ元の曲だけで、関連曲も届いていないあいだ
  const waiting = related === null && list.length === 1;

  // 再生の帯のボタンからラジオを始めて移ってきたときは、並びがまだ元の曲だけなので、届いた関連曲で埋める
  useEffect(() => {
    if (here && queue.length === 1 && related) fillRadio([seed, ...related]);
  }, [here, queue.length, fillRadio, seed, related]);

  return (
    // 一覧の再生用の画面（list-player.tsx）と同じ組み立て
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-stage lg:gap-6 lg:items-start">
      <div className="contents lg:sticky lg:top-(--content-top) lg:block">
        <PlayerStage
          active={here}
          cover={seed.thumb}
          label="このラジオを再生"
          onPlay={() => playRadio(songs, 0)}
        />
        <SwipeToLeave className="lg:mt-4">
          <StageHeading eyebrow={eyebrow} title={title} song={here ? current : null} />
        </SwipeToLeave>
        <StageControls extra={notes.button}>
          <StagePlayButton
            playing={here && playing}
            onClick={() => (here ? toggle() : playRadio(songs, 0))}
          />
          {/* スマホは下の帯にランダム・ループ・ラジオが入りきらないので、ここに置く */}
          {notes.button}
          <PlaybackMode className="md:hidden" radio scroll />
        </StageControls>
        {notes.view}
        <SingerSilhouette song={here ? current : null} />
      </div>

      <div className="-mx-1.5 flex flex-col gap-1">
        {/*
          自動で進むと飛ばす曲（iPad の Safari のニコニコの曲）は並べない。ラジオは流し続ける画面で、その曲は流れないため。
          元の曲と流している曲は残す。押したときの何番目は、外す前の並びのまま
        */}
        {list.map((song, i) =>
          skipsNiconico &&
          song.service === 'niconico' &&
          song.songId !== seed.songId &&
          song.songId !== current?.songId ? null : (
            <SongItem
              key={`${i}-${song.songId}`}
              song={song}
              eager={i < EAGER_IMAGES}
              onOpen={() => (here ? jumpTo(i) : playRadio(songs, i))}
            />
          ),
        )}
        {waiting && <SkeletonRows count={PLACEHOLDER_ROWS - 1} />}
      </div>
    </div>
  );
}

/**
 * ラジオの画面を作っているあいだの形（loading.tsx）。初めて開く曲のラジオは、サーバーで VocaDB に関連曲を聞いてから描くので
 * 数秒かかることがある。そのあいだも動画の置き場所を先に出し、ラジオを流しているなら動画をここに大きく出す。
 * 置き場所が無いと、待ち（WAIT_FOR_SLOT）を越えて右下の窓に出てから、画面ができたところで大きな置き場所へ移った
 */
export function RadioLoading() {
  const { current, context } = usePlayer();
  return (
    <div className="pt-4">
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-stage lg:gap-6 lg:items-start">
        <div className="contents lg:sticky lg:top-(--content-top) lg:block">
          <PlayerStage
            active={current !== null && context === 'radio'}
            cover={current?.thumb ?? null}
            label="このラジオを再生"
            onPlay={() => {}}
          />
          <div aria-hidden className="flex flex-col gap-2 lg:mt-4">
            <span className="h-3 w-12 animate-pulse rounded bg-surface" />
            <span className="h-9 w-2/3 animate-pulse rounded bg-surface" />
          </div>
        </div>
        <div className="-mx-1.5 flex flex-col gap-1">
          <SkeletonRows count={PLACEHOLDER_ROWS} />
        </div>
      </div>
    </div>
  );
}

/** 曲の一覧の仮の行。画面を作っているあいだと、関連曲が届くまでのあいだに出す */
/** 関連曲が届くまでに出す仮の行の数（元の曲を出しているときは、その1行を引く） */
const PLACEHOLDER_ROWS = 12;

function SkeletonRows({ count }: { count: number }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} aria-hidden className="flex items-center gap-3 p-1.5">
      <span className="aspect-video w-thumb shrink-0 animate-pulse rounded bg-surface" />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="h-3.5 w-2/3 animate-pulse rounded bg-surface" />
        <span className="h-3 w-1/2 animate-pulse rounded bg-surface/70" />
      </span>
    </div>
  ));
}
