'use client';

import { useEffect } from 'react';
import { addToHistory } from '@/lib/history';
import { usePlayer } from './player-provider';

/**
 * 流し始めた曲を視聴履歴（src/lib/history.ts）に残す。画面には何も出さない。
 * 選んだだけで流れていない曲（開いた直後で止まっている曲など）は残さず、実際に鳴り始めたときに残す
 */
export function HistoryRecorder() {
  const { current, playing } = usePlayer();
  useEffect(() => {
    if (playing && current) addToHistory(current);
  }, [current, playing]);
  return null;
}
