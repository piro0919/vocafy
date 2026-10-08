'use client';

import { Icon } from '../icon';
import { usePlayer } from './player-provider';

/**
 * ランダム再生とループの切り替え。入っているあいだは差し色にする。
 * パソコンでは下の帯に置き、スマホでは帯に入りきらないので、詳細画面の「再生」ボタンの横に置く
 */
export function PlaybackMode({ className = '' }: { className?: string }) {
  const { shuffle, repeat, toggleShuffle, toggleRepeat } = usePlayer();
  const button =
    'grid size-10 shrink-0 place-items-center rounded-full transition-[color,scale] duration-150 ease-out active:scale-90';
  return (
    <div className={`flex items-center ${className}`}>
      <button
        type="button"
        aria-pressed={shuffle}
        aria-label={shuffle ? 'ランダム再生を止める' : 'ランダム再生'}
        title={shuffle ? 'ランダム再生: 入' : 'ランダム再生: 切'}
        onClick={toggleShuffle}
        className={`${button} ${shuffle ? 'text-accent' : 'text-muted hover:text-foreground'}`}
      >
        <Icon name="shuffle" className="size-5" />
      </button>
      <button
        type="button"
        aria-label={repeat === 'one' ? 'ループ: 1曲（押すと全体）' : 'ループ: 全体（押すと1曲）'}
        title={repeat === 'one' ? 'ループ: 1曲' : 'ループ: 全体'}
        onClick={toggleRepeat}
        className={`${button} text-accent`}
      >
        <Icon name={repeat === 'one' ? 'repeatOne' : 'repeat'} className="size-5" />
      </button>
    </div>
  );
}
