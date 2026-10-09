'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { usePlayer } from '../player/player-provider';
import { applyVoice, readFollowVoice, readVoice, subscribeVoice, voiceOfVocalists } from './voice';

/**
 * 流している曲の歌声の色にする設定（voice.ts の readFollowVoice）が ON のとき、曲が変わるたびに画面の色を合わせる。
 * 9人のキャラのいない曲と、何も流していないときは、選んだサイトカラーに戻す。画面には何も出さない
 */
export function VoiceFollower() {
  const { current } = usePlayer();
  const follow = useSyncExternalStore(subscribeVoice, readFollowVoice, () => true);
  const saved = useSyncExternalStore(subscribeVoice, readVoice, () => 'miku' as const);
  useEffect(() => {
    applyVoice((follow && current && voiceOfVocalists(current.vocalists)) || saved);
  }, [follow, current, saved]);
  return null;
}
