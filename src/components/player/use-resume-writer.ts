import { useCallback, useEffect, useRef } from 'react';
import type { QueueItem } from '@/lib/catalog';
import { type Resume, saveResume } from './player-resume';
import type { Owner, PlaybackTime } from './player-types';

/** 流しているあいだ、どこまで聴いたかを残す間隔（ミリ秒） */
const SAVE_EVERY_MS = 5000;

/**
 * 流しているあいだ、並びとどこまで聴いたかを残す（player-resume.ts。開き直したときに前の曲を戻す）。
 * 曲や並びが替わったときと、数秒ごと（時刻を拾うたび。SAVE_EVERY_MS で間引く）、ページを離れるとき。
 * 戻したまま流していないあいだ（resumable）は、残したものをそのまま使う。
 * snapshot はいまの控えを作る関数（並びが空なら null）。プレイヤーの ref から読むので、変わらない関数を渡す
 */
export function useResumeWriter(
  snapshot: () => Omit<Resume, 'at'> | null,
  {
    resumable,
    playing,
    time,
    queue,
    index,
    owner,
  }: {
    resumable: boolean;
    playing: boolean;
    time: PlaybackTime;
    queue: QueueItem[];
    index: number;
    owner: Owner;
  },
) {
  const lastSaved = useRef(0);
  const write = useCallback(() => {
    const resume = snapshot();
    if (!resume) return;
    saveResume(resume);
    lastSaved.current = performance.now();
  }, [snapshot]);

  useEffect(() => {
    if (resumable || queue.length === 0) return;
    write();
  }, [resumable, queue, index, owner, write]);

  useEffect(() => {
    if (resumable || !playing) return;
    if (performance.now() - lastSaved.current > SAVE_EVERY_MS) write();
  }, [time, resumable, playing, write]);

  useEffect(() => {
    if (resumable) return;
    window.addEventListener('pagehide', write);
    return () => window.removeEventListener('pagehide', write);
  }, [resumable, write]);
}
