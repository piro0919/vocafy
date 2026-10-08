'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useLayoutEffect, useRef } from 'react';
import { FadeImage } from './fade-image';
import { Icon } from './icon';
import { usePlayer } from './player/player-provider';

/**
 * 詳細画面（ボカロP）の大きなプレイヤーの置き場所。
 * この画面の並びで流している間（active）は、共通のプレイヤーがここに重なって大きく出る（player-provider.tsx が位置を合わせる）。
 * そうでないときは、サムネイルと再生ボタンを出す。サムネイルの上に重ねてよいのは再生ボタンだけ（YouTube の規約）。
 * パソコンでは列ごと上に貼り付く（producer-player.tsx）。
 *
 * スマホでは、YouTube のアプリの動画の画面と同じ形にする。流しているかどうかに関わらず、動画（流していなければ
 * サムネイルと再生ボタン）を画面の上に固定し、ヘッダーと下のタブを出さない。動画の下の題名の部分を下へ引くと、
 * 前の画面に戻る（SwipeToLeave）。流している間は、動画が右下の窓に縮む
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
  const { setSlot } = usePlayer();
  const slot = useRef<HTMLDivElement>(null);

  // 画面を描く前に置き場所を知らせる。描いたあとだと、最初の1曲を流し始めた瞬間に、
  // プレイヤーが一度だけ右下の窓として描かれてしまう
  useLayoutEffect(() => {
    if (!active) return;
    setSlot(slot.current);
    return () => setSlot(null);
  }, [active, setSlot]);

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
      <div className="max-md:fixed max-md:inset-x-0 max-md:top-0 max-md:z-40 max-md:bg-background">
        {active ? (
          <div ref={slot} className="aspect-video w-full bg-black md:rounded-lg" />
        ) : (
          <button
            type="button"
            onClick={onPlay}
            aria-label={label}
            className="group relative block aspect-video w-full overflow-hidden bg-surface md:rounded-lg"
          >
            {cover && (
              <FadeImage
                src={cover}
                alt=""
                fill
                loading="eager"
                sizes="(min-width: 1024px) 60vw, 100vw"
                className="object-cover"
              />
            )}
            <span className="absolute top-1/2 left-1/2 grid size-16 -translate-1/2 place-items-center rounded-full bg-accent text-background shadow-lg transition-[scale] duration-200 ease-out group-hover:scale-105 group-active:scale-95">
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

/** ヘッダーと下のタブを隠す幅。globals.css の印の範囲と同じ */
const MOBILE = '(max-width: 47.99rem)';

/** 下へこれだけ引いて離したら戻る（px） */
const PULL = 60;

/** 前の画面に戻る。いきなりこの画面に来たときは、トップへ */
function leave(router: ReturnType<typeof useRouter>) {
  if (window.history.length > 1) router.back();
  else router.push('/');
}
