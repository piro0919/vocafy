'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { QueueItem } from '@/lib/catalog';
import { Icon } from '../icon';
import { usePlayer } from './player-provider';
import { QueuePanel } from './queue-panel';

/**
 * ランダム再生とループの切り替え。入っているあいだは差し色にする。
 * パソコンでは下の帯に置き、スマホでは帯に入りきらないので、詳細画面の「再生」ボタンの横に置く。
 * radio を付けると、流している曲からのラジオのボタンも並べる。曲を流しているあいだは、次に流れる曲を開くボタンも置く。
 * すりガラスの板の中では、fixed の基準が画面でなくその板になる。パソコンの下の帯はそれを使って次に流れる曲の板を置いているが、
 * スマホの動画の下の帯（player-stage.tsx の StageControls）では板が動画の裏に回って見えなかった。そこでは portal で body の直下に出す
 */
export function PlaybackMode({
  className = '',
  radio = false,
  portal = false,
}: {
  className?: string;
  radio?: boolean;
  /** 次に流れる曲の板を body の直下に出す */
  portal?: boolean;
}) {
  const { current, shuffle, repeat, toggleShuffle, toggleRepeat } = usePlayer();
  const [queueOpen, setQueueOpen] = useState(false);
  const queueButton = useRef<HTMLButtonElement>(null);
  const closeQueue = useCallback(() => setQueueOpen(false), []);
  const button =
    'relative grid size-10 shrink-0 place-items-center rounded-full transition-[color,scale] duration-150 ease-out active:scale-90';
  return (
    <div className={`flex items-center ${className}`}>
      <button
        type="button"
        aria-pressed={shuffle}
        aria-label={shuffle ? 'ランダム再生をオフにする' : 'ランダム再生をオンにする'}
        title={shuffle ? 'ランダム再生をオフにする' : 'ランダム再生をオンにする'}
        onClick={toggleShuffle}
        className={`${button} ${shuffle ? 'text-accent' : 'text-muted hover:text-foreground'}`}
      >
        <Icon name="shuffle" className="size-5" />
        {shuffle && <OnDot />}
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
      {current && (
        <button
          ref={queueButton}
          type="button"
          aria-label="次に流れる曲"
          aria-expanded={queueOpen}
          title="次に流れる曲"
          onClick={() => setQueueOpen((open) => !open)}
          className={`${button} ${queueOpen ? 'text-accent' : 'text-muted hover:text-foreground'}`}
        >
          <Icon name="queue" className="size-5" />
        </button>
      )}
      {current &&
        (portal ? (
          createPortal(
            <QueuePanel open={queueOpen} onClose={closeQueue} trigger={queueButton} />,
            document.body,
          )
        ) : (
          <QueuePanel open={queueOpen} onClose={closeQueue} trigger={queueButton} />
        ))}
    </div>
  );
}

/**
 * ラジオ。押すと、いまの曲から関連曲を流し続け、ラジオの画面（/radio/123）へ移る。ラジオで流しているあいだは差し色にする。
 * もう一度押すとやめて、ラジオを始める前の並びに戻す。ラジオの画面にいたら、戻した並びの持ち主の画面へ移る
 */
function RadioButton({ song, className = 'grid' }: { song: QueueItem; className?: string }) {
  const { context, radioHome, startRadio, stopRadio, holdSlot } = usePlayer();
  const router = useRouter();
  const pathname = usePathname();
  const on = context === 'radio';
  const toggle = () => {
    // 並びの持ち主が先に替わるので、ラジオの画面（切るときは戻る画面）に着くまで、いまの置き場所に動画を出し続ける
    if (!on) {
      holdSlot();
      startRadio(song);
      router.push(`/radio/${song.songId}`);
      return;
    }
    const onRadioPage = decodeURIComponent(pathname) === radioHome;
    if (onRadioPage) holdSlot();
    const home = stopRadio();
    if (onRadioPage) router.push(home);
  };
  return (
    <button
      type="button"
      aria-label={on ? 'ラジオをやめる' : `${song.title}からラジオを流す`}
      aria-pressed={on}
      title={on ? 'ラジオをやめる' : 'この曲からラジオを流す（関連曲を流し続ける）'}
      onClick={toggle}
      className={`${className} relative size-9 shrink-0 place-items-center rounded-full transition-[color,scale] duration-150 ease-out hover:bg-foreground/8 active:scale-90 ${on ? 'text-accent' : 'text-muted hover:text-foreground'}`}
    >
      <Icon name="radio" className="size-5" />
      {on && <OnDot />}
    </button>
  );
}

/**
 * 入っているボタン（ランダム・ラジオ）のアイコンの下の点。差し色と灰色だけでは小さなアイコンの入・切が見分けにくいので、
 * 形でも分かるようにする（Spotify と同じ見せ方）。ループは切が無いので付けない。
 * ボタンの大きさがランダム（40px）とラジオ（36px）で違うので、下の端からではなく真ん中から測って高さをそろえる
 */
function OnDot() {
  return (
    <span
      aria-hidden
      className="absolute top-[calc(50%+12px)] left-1/2 size-1 -translate-x-1/2 rounded-full bg-current"
    />
  );
}
