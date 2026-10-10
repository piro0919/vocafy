'use client';

import { useRouter } from '@bprogress/next/app';
import {
  type ComponentProps,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { FadeImage } from './fade-image';
import { Icon } from './icon';
import { PlaybackMode } from './player/playback-mode';
import { usePlayer } from './player/player-provider';
import { leave } from '@/lib/leave';
import { COVER_PLAY, PRIMARY } from './button-styles';
import { atLeast, below } from '@/lib/breakpoints';

/**
 * 詳細画面（ボカロP）の大きなプレイヤーの置き場所。
 * この画面の並びで流している間（active）は、共通のプレイヤーがここに重なって大きく出る（player-provider.tsx が位置を合わせる）。
 * そうでないときは、サムネイルと再生ボタンを出す。サムネイルの上に重ねてよいのは再生ボタンだけ（YouTube の規約）。
 * パソコンでは列ごと上に貼り付く（producer-player.tsx）。
 *
 * スマホでは、YouTube のアプリの動画の画面と同じ形にする。流しているかどうかに関わらず、動画（流していなければ
 * サムネイルと再生ボタン）を画面の上に固定し、ヘッダーと下のタブを出さない。動画の下の題名の部分を下へ引くと、
 * 前の画面に戻る（SwipeToLeave）。流している間は、動画が右下の窓に縮む。
 * 題名の部分はスクロールで流れていくので、下の再生の帯の × を、この画面のあいだだけ縮めるボタンにしている（player-bar.tsx）。
 * 一覧を下まで見たあとでも、上まで戻らずに縮められる。動画の下に取っ手の帯を固定する形は、見た目がうるさく外した
 */
export function PlayerStage({
  active,
  cover,
  label,
  onPlay,
}: {
  active: boolean;
  cover: string | null;
  /** 再生ボタンの読み上げ。「このボカロPの曲を再生」など */
  label: string;
  onPlay: () => void;
}) {
  const { setSlot, holdingSlot, resumable, resume, current } = usePlayer();
  const slot = useRef<HTMLDivElement>(null);
  // 画面を移るあいだ（holdSlot）は、動画を出していた置き場所は、この画面の持ち主でなくなっても出し続ける
  const [wasOn, setWasOn] = useState(active);
  const on = active || (holdingSlot && wasOn);
  if (on !== wasOn) setWasOn(on);

  // 画面を描く前に置き場所を知らせる。描いたあとだと、最初の1曲を流し始めた瞬間に、
  // プレイヤーが一度だけ右下の窓として描かれてしまう
  useLayoutEffect(() => {
    if (!on) return;
    setSlot(slot.current);
    return () => setSlot(null);
  }, [on, setSlot]);

  // スマホでヘッダーと下のタブを隠す印（globals.css）。流しているかどうかに関わらず、この画面にいる間ずっと付ける
  useLayoutEffect(() => {
    document.documentElement.dataset.watch = '';
    return () => {
      delete document.documentElement.dataset.watch;
    };
  }, []);

  return (
    <>
      {/* スマホで固定したぶん、本文が動画の下に潜らないよう、同じ高さの空きを置く */}
      <div aria-hidden className="md:hidden">
        <div className="aspect-video" />
      </div>
      <div className="max-md:fixed max-md:inset-x-0 max-md:top-0 max-md:z-tabs max-md:bg-background">
        {on ? (
          <div
            ref={slot}
            className="relative aspect-video w-full overflow-hidden bg-black md:rounded-2xl"
          >
            {/* 開き直したときに戻した前の曲をまだ流していないあいだは、動画の枠を隠し、その曲の表紙と再生ボタンを出す
                （player-resume.ts）。押すと聴いていた位置から流れる */}
            {resumable && current && (
              <button
                type="button"
                onClick={resume}
                aria-label={`「${current.title}」の続きを再生`}
                className="group absolute inset-0 block"
              >
                <FadeImage
                  src={current.thumb}
                  alt=""
                  fill
                  loading="eager"
                  sizes={`${atLeast('lg')} 60vw, 100vw`}
                  className="object-cover"
                />
                <span className={`absolute top-1/2 left-1/2 size-16 -translate-1/2 ${COVER_PLAY}`}>
                  <Icon name="play" className="size-9" />
                </span>
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onPlay}
            aria-label={label}
            className="group relative block aspect-video w-full overflow-hidden bg-surface md:rounded-2xl"
          >
            {cover && (
              <FadeImage
                src={cover}
                alt=""
                fill
                loading="eager"
                sizes={`${atLeast('lg')} 60vw, 100vw`}
                className="object-cover"
              />
            )}
            <span className={`absolute top-1/2 left-1/2 size-16 -translate-1/2 ${COVER_PLAY}`}>
              <Icon name="play" className="size-9" />
            </span>
          </button>
        )}
      </div>
    </>
  );
}

/**
 * 詳細画面の題名の部分。スマホでここを下へ引くと前の画面に戻り、流している曲は右下の窓に縮む
 * （YouTube のアプリで動画を下へ引くのと同じ役目）。
 * 動画そのものは引けない。動画の上の指の動きは YouTube の埋め込みの中に届いてこちらには来ず、
 * 上に透明な層を重ねて拾うのは規約に触れる。そのため、動画のすぐ下のこの部分で受け取る。
 * ここはページと一緒にスクロールするので、指が下へ動き始めたときだけスクロールを止めて引く操作にし、
 * 上へ動き始めたときはそのままスクロールさせる
 */
export function SwipeToLeave({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const area = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    let start: { x: number; y: number } | null = null;
    // 'pull' は引く操作、'scroll' はふつうのスクロール。動き始めの向きで一度だけ決める
    let kind: 'pull' | 'scroll' | null = null;
    const onStart = (e: TouchEvent) => {
      if (!window.matchMedia(MOBILE).matches || e.touches.length > 1) return;
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      kind = null;
    };
    const onMove = (e: TouchEvent) => {
      if (!start) return;
      const dx = e.touches[0].clientX - start.x;
      const dy = e.touches[0].clientY - start.y;
      if (!kind && Math.abs(dy) > 6)
        kind = dy > 0 && Math.abs(dy) > Math.abs(dx) ? 'pull' : 'scroll';
      // スクロールを止められるのは、動き始めの知らせを止めたときだけ
      if (kind === 'pull') e.preventDefault();
    };
    const onEnd = (e: TouchEvent) => {
      if (start && kind === 'pull' && e.changedTouches[0].clientY - start.y > PULL) leave(router);
      start = null;
      kind = null;
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    // preventDefault を呼ぶので、passive にしない
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [router]);

  return (
    <div ref={area} className={className}>
      {children}
    </div>
  );
}

/**
 * 詳細画面の「再生」ボタンの段。スマホでスクロールしてこの段が動画の裏に隠れたら、動画の下の縁から細い帯を滑り出させ、
 * ランダム・ループ・ラジオ・次に流れる曲のボタンを出し続ける。再生ボタンは下の再生の帯にあるので帯には入れない。
 * 帯を下へ引くと、題名の部分（SwipeToLeave）と同じく前の画面に戻る。帯は下の再生の帯と同じく、画面の端から 12px 離した角丸の板にする。動画より奥に置き、隠れているあいだは動画の裏へ引っ込める。ボカロPの画面の共有のように、画面ごとのボタンは extra で帯にも並べる
 */
export function StageControls({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  const row = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    let observer: IntersectionObserver | null = null;
    const watch = () => {
      observer?.disconnect();
      // 動画（幅いっぱいの 16:9）の下の縁より上へ出たら、隠れたとみなす
      const top = Math.round((window.innerWidth * 9) / 16);
      observer = new IntersectionObserver(
        ([entry]) => setPinned(!entry.isIntersecting && entry.boundingClientRect.top < top),
        { rootMargin: `-${top}px 0px 0px 0px` },
      );
      observer.observe(el);
    };
    watch();
    window.addEventListener('resize', watch);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', watch);
    };
  }, []);

  return (
    <>
      {/* 段の高さはアイコンのボタン（40px）にそろえる。共有のボタンがある画面と無い画面で段の高さが変わり、
          ボカロPの画面へ移ったときに再生ボタンが 2px ずれた */}
      <div ref={row} className="flex min-h-10 items-center gap-2 max-lg:-mt-3 lg:mt-2">
        {children}
      </div>
      <div
        inert={!pinned}
        className={`fixed inset-x-gutter top-(--stage-controls-top) z-chrome h-stage-controls rounded-2xl border border-line/60 bg-glass shadow-float backdrop-blur-lg backdrop-saturate-150 transition-show duration-move md:hidden ${pinned ? '' : 'invisible translate-y-(--hide-up) opacity-0'}`}
      >
        {/* 題名の部分と同じく、下へ引くと前の画面に戻り、流している曲は右下の窓に縮む */}
        <SwipeToLeave className="flex size-full items-center justify-center">
          {extra}
          <PlaybackMode radio />
        </SwipeToLeave>
      </div>
    </>
  );
}

/** ヘッダーと下のタブを隠す幅。globals.css の印の範囲と同じ */
const MOBILE = below('md');

/** 下へこれだけ引いて離したら戻る（px） */
const PULL = 60;

/**
 * 詳細画面の「再生」の段の先頭の、再生・一時停止のボタン。パソコンはアイコンと文言、スマホは文言を外した丸いアイコンだけにする。
 * スマホは段にランダム・ループなどのアイコンも並ぶので、文言を付けると段が画面の幅からはみ出し、横に送らないと見えなかった
 */
export function StagePlayButton({
  playing,
  onClick,
  ...rest
}: {
  playing: boolean;
  onClick: () => void;
} & Omit<ComponentProps<'button'>, 'onClick' | 'className' | 'type'>) {
  const label = playing ? '一時停止' : '再生';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`${PRIMARY} max-md:size-10 max-md:justify-center max-md:p-0`}
      {...rest}
    >
      <Icon name={playing ? 'pause' : 'play'} className="size-5" />
      <span className="max-md:sr-only">{label}</span>
    </button>
  );
}
