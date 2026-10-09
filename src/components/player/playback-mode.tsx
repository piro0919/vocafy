'use client';

import type { QueueItem } from '@/lib/catalog';
import { Icon } from '../icon';
import { usePlayer } from './player-provider';

/**
 * ランダム再生とループの切り替え。入っているあいだは差し色にする。
 * パソコンでは下の帯に置き、スマホでは帯に入りきらないので、詳細画面の「再生」ボタンの横に置く。
 * radio を付けると、流している曲からのラジオのボタンも並べる（スマホの詳細画面。パソコンでは帯の曲名の横にある）
 */
export function PlaybackMode({
  className = '',
  radio = false,
}: {
  className?: string;
  radio?: boolean;
}) {
  const { current, shuffle, repeat, toggleShuffle, toggleRepeat } = usePlayer();
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
      {radio && current && <RadioButton song={current} />}
    </div>
  );
}

/** ラジオ。押すと、いまの曲から関連曲を流し続ける。ラジオで流しているあいだは差し色にする */
export function RadioButton({ song, className = 'grid' }: { song: QueueItem; className?: string }) {
  const { context, startRadio } = usePlayer();
  const on = context === 'radio';
  return (
    <button
      type="button"
      aria-label={on ? 'ラジオで流しています' : `${song.title}からラジオを流す`}
      aria-pressed={on}
      title={on ? 'ラジオで流しています' : 'この曲からラジオを流す（関連曲を流し続ける）'}
      onClick={() => startRadio(song)}
      className={`${className} size-9 shrink-0 place-items-center rounded-full transition-[color,scale] duration-150 ease-out hover:bg-foreground/8 active:scale-90 ${on ? 'text-accent' : 'text-muted hover:text-foreground'}`}
    >
      <Icon name="radio" className="size-5" />
    </button>
  );
}
