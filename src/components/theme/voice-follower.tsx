'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { usePlayer } from '../player/player-provider';
import { applySinger, readFollowVoice, singerOfVocalists, subscribeVoice } from './voice';

/**
 * 流している曲の歌声の色にする設定（voice.ts の readFollowVoice）が ON のとき、曲が変わるたびに差し色とボタンの地を合わせる。
 * 地の色味は選んだサイトカラーのまま。色のあるキャラのいない曲と、何も流していないときは、選んだサイトカラーに戻す。画面には何も出さない
 */
export function VoiceFollower() {
  const { current } = usePlayer();
  const follow = useSyncExternalStore(subscribeVoice, readFollowVoice, () => true);
  useEffect(() => {
    applySinger((follow && current && singerOfVocalists(current.vocalists)) || null);
  }, [follow, current]);
  return null;
}
