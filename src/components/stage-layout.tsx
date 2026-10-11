'use client';

import type { ReactNode } from 'react';
import type { QueueItem } from '@/lib/catalog';
import { PlayerStage, StageControls, SwipeToLeave } from './player-stage';
import { PlaybackMode } from './player/playback-mode';
import { SingerSilhouette } from './singer-silhouette';
import { useStageNotes } from './song-notes';

/**
 * 動画を大きく出す画面（ボカロP・一覧の再生用・ラジオ・お気に入りの曲）の組み立て。左（スマホは上）に動画の置き場所・題名・
 * 「再生」の段・説明文・影絵、右に一覧（children）。4つの画面で同じ形にするため、ここにだけ書く。
 *
 * パソコンでは、一覧が長くても動画が隠れないよう、動画と再生ボタンの列ごと上に貼り付ける（sticky）。
 * 貼り付く高さは、スクロールする前の位置と同じにする。ずれていると、スクロールの最初の分だけ動いてから止まった。
 * スマホは画面が狭く、貼り付けると一覧が見づらくなるので、貼り付けずに縦に並べる
 */
export function StageLayout({
  song,
  cover,
  label,
  onPlay,
  heading,
  play,
  share,
  children,
}: {
  /** この画面が並びの持ち主のときに流している曲。持ち主でなければ null（動画は右下の窓に出す） */
  song: QueueItem | null;
  /** 流していないときに、動画の置き場所に出す表紙と、その再生ボタンの名前と動き */
  cover: string | null;
  label: string;
  onPlay: () => void;
  /** 動画の下の題名 */
  heading: ReactNode;
  /** 「再生」の段の再生ボタン（StagePlayButton） */
  play: ReactNode;
  /** 共有のボタン */
  share: ReactNode;
  /** 右の一覧 */
  children: ReactNode;
}) {
  // 流している曲の動画の説明文（ボタンと、動画の下の枠・全文の板）
  const notes = useStageNotes(song);
  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-stage lg:gap-6 lg:items-start">
      <div className="contents lg:sticky lg:top-(--content-top) lg:block">
        <PlayerStage active={song !== null} cover={cover} label={label} onPlay={onPlay} />
        <SwipeToLeave className="lg:mt-4">{heading}</SwipeToLeave>
        {/* 名前とボタンは一続きのものなので、ほかの部品のあいだ（24px）より詰める */}
        <StageControls
          extra={
            <>
              {share}
              {notes.button}
            </>
          }
        >
          {play}
          {share}
          {notes.button}
          {/* スマホは下の帯にランダム・ループ・ラジオが入りきらないので、ここに置く */}
          <PlaybackMode className="md:hidden" radio scroll />
        </StageControls>
        {notes.view}
        <SingerSilhouette song={song} />
      </div>
      {children}
    </div>
  );
}
