'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { QueueItem } from '@/lib/catalog';
import { NO_RESTORE } from '@/lib/no-restore';
import { smallThumbOf } from '@/lib/thumb';
import { FadeImage } from '../fade-image';
import { FavoriteButton } from '../favorite-button';
import { Icon } from '../icon';
import { PlaybackMode, RadioButton } from './playback-mode';
import { type PlaybackTime, usePlayer } from './player-provider';
import { Marquee } from '../marquee';

/**
 * 画面の下に出したままにする操作の帯。曲を選ぶと下からせり上がり、閉じると下へ消える。
 * スマホでは下のタブの上に載せ、タブと合わせて一枚の浮いた板に見せる。タブが隠れたときは、帯だけで角の丸い板になる（globals.css）。
 * パソコンでは、左のメニューや上の段と同じく、画面の端から 12px 離した角丸の板として浮かせる。
 * 消えきるまでは最後の曲を出しておくので、item は今の曲ではなく「最後に出した曲」。
 * 最初の1曲でもせり上がって見えるよう、曲を選ぶ前から閉じた状態で置いておく
 */
export function PlayerBar({ item, open }: { item: QueueItem | null; open: boolean }) {
  const {
    playing,
    loading,
    hasPrev,
    hasNext,
    toggle,
    step,
    close,
    seek,
    time,
    volume,
    muted,
    setVolume,
    toggleMute,
  } = usePlayer();

  return (
    <div
      aria-hidden={!open}
      inert={!open}
      className={`chrome-bottom chrome-bar fixed inset-x-3 bottom-[4.25rem] z-30 h-16 rounded-t-2xl border border-b-0 border-line/60 bg-sidebar/60 backdrop-blur-lg backdrop-saturate-150 transition-[translate,opacity] duration-300 ease-(--ease-out) md:bottom-3 md:rounded-2xl md:border-b md:shadow-lg md:shadow-black/5 ${
        open ? '' : 'pointer-events-none translate-y-full opacity-0'
      }`}
    >
      <Progress time={time} playing={playing} onSeek={seek} />

      <div className="flex h-full items-center gap-3 px-3 sm:gap-4 sm:px-4">
        <div className="flex items-center sm:gap-1">
          <BarButton label="前の曲" disabled={!hasPrev} onClick={() => step(-1)}>
            <Icon name="prev" />
          </BarButton>
          <BarButton
            label={playing ? '一時停止' : '再生'}
            large
            onClick={toggle}
            disabled={loading}
          >
            {loading ? (
              <span className="size-5 animate-spin rounded-full border-2 border-on-miku/30 border-t-on-miku" />
            ) : (
              <Icon name={playing ? 'pause' : 'play'} />
            )}
          </BarButton>
          <BarButton label="次の曲" disabled={!hasNext} onClick={() => step(1)}>
            <Icon name="next" />
          </BarButton>
        </div>
        <Clock time={time} playing={playing} />

        {item ? (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <FadeImage
              key={item.videoId}
              src={smallThumbOf(item)}
              alt=""
              width={71}
              height={40}
              className="hidden aspect-video rounded object-cover sm:block"
            />
            <div className="min-w-0">
              <Marquee className="text-sm font-bold">{item.title}</Marquee>
              <Marquee
                className="text-xs text-muted"
                text={loading ? '' : `${item.producerName}・${item.vocalists}`}
              >
                {loading ? (
                  '読み込んでいます…'
                ) : (
                  <>
                    <Link href={`/producers/${item.producerId}`} className="hover:text-foreground">
                      {item.producerName}
                    </Link>
                    {item.vocalists && ` ・ ${item.vocalists}`}
                  </>
                )}
              </Marquee>
            </div>
            {!loading && (
              <>
                <FavoriteButton song={item} />
                {/* スマホは帯が狭いので、ラジオは画面の中のランダム・ループの隣に置く（playback-mode.tsx） */}
                <RadioButton song={item} className="hidden md:grid" />
              </>
            )}
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/*
          音量。iPhone と iPad は埋め込みの音量を Web から変えられず、本体のボタンで調節する決まりなので、
          スマホの幅では出さない
        */}
        <PlaybackMode className="hidden md:flex" />
        <div className="hidden items-center gap-1 md:flex">
          <BarButton label={muted ? '消音を解除' : '消音'} onClick={toggleMute}>
            <Icon
              name={muted || volume === 0 ? 'volumeOff' : volume < 50 ? 'volumeLow' : 'volume'}
            />
          </BarButton>
          <input
            type="range"
            min={0}
            max={100}
            value={muted ? 0 : volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="音量"
            className="w-24 cursor-pointer accent-accent"
          />
        </div>

        <BarButton label="プレイヤーを閉じる" onClick={close}>
          <Icon name="close" />
        </BarButton>
      </div>
    </div>
  );
}

/** 拾った時刻から、今の時刻を補う。再生中だけ進める */
export function now(time: PlaybackTime, playing: boolean): number {
  const elapsed = playing ? (performance.now() - time.at) / 1000 : 0;
  return Math.min(time.current + elapsed, time.duration || Infinity);
}

/**
 * 再生位置の線。時刻は 0.5 秒おきにしか拾えないので、間は毎フレーム補って描く。
 * 描き直しは React を通さず、要素の幅とつまみの位置を直接変える。
 * 押した位置へ飛び、つまみをドラッグすると離したところへ飛ぶ。キーボードの左右で 5 秒ずつ動かせる
 */
function Progress({
  time,
  playing,
  onSeek,
}: {
  time: PlaybackTime;
  playing: boolean;
  onSeek: (seconds: number) => void;
}) {
  const fill = useRef<HTMLSpanElement>(null);
  const knob = useRef<HTMLSpanElement>(null);
  // 指（マウス）を動かしているあいだだけ出す、飛び先の時間。スマホは時間の表示が無いので、これが頼り
  const bubble = useRef<HTMLSpanElement>(null);
  // ドラッグ中は、再生の進みではなく指の位置を描く
  const dragging = useRef<number | null>(null);

  const paint = (ratio: number) => {
    const r = Math.min(1, Math.max(0, ratio));
    // Tailwind の scale-x-0 は transform ではなく scale を使うので、こちらも scale で上書きする
    if (fill.current) fill.current.style.scale = `${r} 1`;
    if (knob.current) knob.current.style.left = `${r * 100}%`;
  };

  /** 飛び先の時間を出す。null で隠す。画面の端で切れないよう、位置は端から少し内側に収める */
  const showBubble = (ratio: number | null) => {
    const el = bubble.current;
    if (!el) return;
    if (ratio === null) {
      el.dataset.shown = 'false';
      return;
    }
    el.textContent = clock(ratio * time.duration);
    el.style.left = `clamp(1.75rem, ${ratio * 100}%, calc(100% - 1.75rem))`;
    el.dataset.shown = 'true';
  };

  useEffect(() => {
    let id = 0;
    const draw = () => {
      if (dragging.current === null) {
        paint(time.duration > 0 ? now(time, playing) / time.duration : 0);
      }
      if (playing) id = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(id);
  }, [time, playing]);

  const ratioAt = (el: HTMLElement, clientX: number) => {
    const r = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  };
  const current = now(time, playing);

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="再生位置"
      aria-valuemin={0}
      aria-valuemax={Math.round(time.duration)}
      aria-valuenow={Math.round(current)}
      aria-valuetext={`${clock(current)} / ${clock(time.duration)}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        dragging.current = ratioAt(e.currentTarget, e.clientX);
        paint(dragging.current);
        showBubble(dragging.current);
      }}
      onPointerMove={(e) => {
        if (dragging.current === null) return;
        dragging.current = ratioAt(e.currentTarget, e.clientX);
        paint(dragging.current);
        showBubble(dragging.current);
      }}
      onPointerUp={(e) => {
        if (dragging.current === null) return;
        onSeek(ratioAt(e.currentTarget, e.clientX) * time.duration);
        dragging.current = null;
        showBubble(null);
      }}
      onPointerCancel={() => {
        dragging.current = null;
        showBubble(null);
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') onSeek(Math.min(time.duration, current + 5));
        if (e.key === 'ArrowLeft') onSeek(Math.max(0, current - 5));
      }}
      // 当たり判定は見た目の線より広くとる。線は帯の上の縁に重ねる。
      // スマホは指で狙うので、上へ広げる（下へ広げると曲名や再生ボタンに重なる）。
      // 帯の角が丸いので、線が角からはみ出さないよう左右を内に寄せる（パソコンも浮いた板なので同じ）
      className="group absolute inset-x-4 -top-2 h-4 cursor-pointer touch-none outline-none max-md:-top-6 max-md:h-8"
    >
      <span
        ref={bubble}
        aria-hidden
        data-shown="false"
        className="pointer-events-none absolute bottom-5 -translate-x-1/2 rounded-md bg-foreground px-2 py-0.5 text-xs font-bold tabular-nums text-background opacity-0 shadow transition-opacity duration-150 data-[shown=true]:opacity-100"
      />
      {/* 見た目の線とつまみは、当たり判定の下の端に置く（スマホで当たり判定を上へ広げても、線の位置は変わらない） */}
      <span className="absolute inset-x-0 bottom-0 h-4">
        <span className="absolute inset-x-0 top-1.5 h-1 bg-line transition-[height,top] duration-150 group-hover:top-[5px] group-hover:h-1.5" />
        <span
          ref={fill}
          className="absolute inset-x-0 top-1.5 h-1 origin-left scale-x-0 bg-accent transition-[height,top] duration-150 group-hover:top-[5px] group-hover:h-1.5"
        />
        <span
          ref={knob}
          // マウスの無い端末では、どこを狙えばよいか分かるよう、つまみを常に出す
          className="absolute top-2 size-3 -translate-1/2 scale-0 rounded-full bg-accent shadow transition-[scale] duration-150 group-hover:scale-100 group-focus-visible:scale-100 group-active:scale-100 [@media(hover:none)]:scale-100"
        />
      </span>
    </div>
  );
}

function Clock({ time, playing }: { time: PlaybackTime; playing: boolean }) {
  return (
    <span className="hidden w-24 shrink-0 text-xs tabular-nums text-muted md:block">
      {clock(now(time, playing))} / {clock(time.duration)}
    </span>
  );
}

function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function BarButton({
  label,
  large,
  disabled,
  onClick,
  children,
}: {
  label: string;
  large?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      {...NO_RESTORE}
      onClick={onClick}
      className={`grid shrink-0 place-items-center rounded-full transition-[scale,color,filter] duration-150 ease-out active:scale-90 disabled:opacity-30 ${
        large
          ? 'size-11 bg-miku text-on-miku shadow-md shadow-miku/30 hover:brightness-110 disabled:opacity-100 [&_svg]:size-6'
          : 'size-10 text-muted hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}
