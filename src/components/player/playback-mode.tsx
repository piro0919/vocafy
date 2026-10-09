'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { QueueItem } from '@/lib/catalog';
import { Icon } from '../icon';
import { ScrollRow } from '../scroll-row';
import { FloatingPanel } from './floating-panel';
import { type Sleep, usePlayer } from './player-provider';
import { QueuePanel } from './queue-panel';
import { ICON } from '../button-styles';

/**
 * ランダム再生とループの切り替え。入っているあいだは差し色にする。
 * パソコンでは下の帯に置き、スマホでは帯に入りきらないので、詳細画面の「再生」ボタンの横に置く。
 * radio を付けると、流している曲からのラジオのボタンも並べる。曲を流しているあいだは、次に流れる曲を開くボタンとスリープタイマーも置く。
 * 次に流れる曲の板は、portal で body の直下に出す。すりガラスの帯（パソコンの下の再生の帯・スマホの動画の下の帯）の中に置くと、
 * fixed の基準が画面でなく帯になって動画の裏に回り、板のすりガラスも帯の中しかぼかせず、後ろのページの字がくっきり透けた
 */
export function PlaybackMode({
  className = '',
  radio = false,
  scroll = false,
}: {
  className?: string;
  radio?: boolean;
  /**
   * 入りきらない幅では、年の札の帯と同じく横に流せる並びにする（端をぼかす）。スマホの詳細画面の「再生」の段で使う。
   * 段に「再生」・共有・アイコン6つが並び、360px 以下では前から、スリープタイマーを足してからは 390px でもページが横にはみ出した
   */
  scroll?: boolean;
}) {
  const { current, shuffle, repeat, toggleShuffle, toggleRepeat } = usePlayer();
  const [queueOpen, setQueueOpen] = useState(false);
  const queueButton = useRef<HTMLButtonElement>(null);
  const closeQueue = useCallback(() => setQueueOpen(false), []);
  const button = `relative grid ${ICON}`;
  const buttons = (
    <>
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
        aria-label={repeat === 'one' ? 'ループを全体にする' : 'ループを1曲にする'}
        title={repeat === 'one' ? 'ループを全体にする' : 'ループを1曲にする'}
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
        createPortal(
          <QueuePanel open={queueOpen} onClose={closeQueue} trigger={queueButton} />,
          document.body,
        )}
      {current && <SleepButton className={button} />}
    </>
  );
  return scroll ? (
    <ScrollRow label="再生の切り替え" className={`min-w-0 items-center ${className}`}>
      {buttons}
    </ScrollRow>
  ) : (
    <div className={`flex items-center ${className}`}>{buttons}</div>
  );
}

/** スリープタイマーで選べる長さ（分） */
const SLEEP_MINUTES = [15, 30, 45, 60];

/** 残りの分（切り上げ）。15 秒ごとに数え直す。タイマーが無ければ null */
function useMinutesLeft(sleep: Sleep | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (sleep?.kind !== 'at') return;
    // 入れた直後の残りも、入れた時刻から数える（前に数えた時刻のままだと、残りが長く出る）
    const first = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [sleep]);
  return sleep?.kind === 'at' ? Math.max(1, Math.ceil((sleep.at - now) / 60_000)) : null;
}

/**
 * スリープタイマー。押すと長さを選ぶ板（次に流れる曲と同じ外枠）が開く。入っているあいだは差し色にして下に点を付け、
 * 指を乗せると残りが出る。止め方は player-provider.tsx（時間が来たら音を絞って一時停止、曲の終わりなら次へ進まない）
 */
function SleepButton({ className }: { className: string }) {
  const { sleep, setSleep } = usePlayer();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const left = useMinutesLeft(sleep);
  const status =
    sleep?.kind === 'end'
      ? 'この曲が終わったら止まります'
      : left !== null
        ? `あと${left}分で止まります`
        : null;
  const label = status ? `スリープタイマー（${status}）` : 'スリープタイマー';
  const choose = (value: number | 'end' | null) => {
    setSleep(value);
    setOpen(false);
  };
  const row =
    'flex w-full items-center rounded-md px-3 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-foreground/8';
  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-expanded={open}
        title={label}
        onClick={() => setOpen((o) => !o)}
        className={`${className} ${sleep || open ? 'text-accent' : 'text-muted hover:text-foreground'}`}
      >
        <Icon name="moon" className="size-5" />
        {sleep && <OnDot />}
      </button>
      {createPortal(
        <FloatingPanel open={open} onClose={close} trigger={trigger} title="スリープタイマー">
          {status && <p className="px-4 pb-1 text-xs text-accent">{status}</p>}
          <div className="grid gap-0.5 px-2 pb-2">
            {SLEEP_MINUTES.map((m) => (
              <button key={m} type="button" onClick={() => choose(m)} className={row}>
                {m < 60 ? `${m}分` : `${m / 60}時間`}
              </button>
            ))}
            <button type="button" onClick={() => choose('end')} className={row}>
              この曲が終わったら
            </button>
            {sleep && (
              <button type="button" onClick={() => choose(null)} className={`${row} text-muted`}>
                タイマーを切る
              </button>
            )}
          </div>
        </FloatingPanel>,
        document.body,
      )}
    </>
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
      title={on ? 'ラジオをやめる' : `${song.title}からラジオを流す`}
      onClick={toggle}
      className={`${className} relative ${ICON} ${on ? 'text-accent' : 'text-muted hover:text-foreground'}`}
    >
      <Icon name="radio" className="size-5" />
      {on && <OnDot />}
    </button>
  );
}

/**
 * 入っているボタン（ランダム・ラジオ）のアイコンの下の点。差し色と灰色だけでは小さなアイコンの入・切が見分けにくいので、
 * 形でも分かるようにする（Spotify と同じ見せ方）。ループは切が無いので付けない。
 * アイコンの真ん中から測って置く（ボタンの大きさが変わっても、アイコンとの間が変わらない）
 */
function OnDot() {
  return (
    <span
      aria-hidden
      className="absolute top-[calc(50%+12px)] left-1/2 size-1 -translate-x-1/2 rounded-full bg-current"
    />
  );
}
