import { useEffect, useLayoutEffect, useRef } from 'react';
import { EASE_OUT, MOTION, prefersReducedMotion } from '@/lib/motion';
import { DOCK_SIDE_EVENT } from './player-storage';

/** プレイヤーの形。none は何も流していない（か置き場所を待っている）、slot は画面の置き場所、dock は右下の窓 */
export type FrameMode = 'none' | 'slot' | 'dock';

/**
 * プレイヤーの枠を作り、置き場所（slot）か右下の窓に合わせる。返す参照を枠の要素に付ける（流す仕組みもこの要素の中に作る）。置き場所では位置と大きさを合わせ続け、
 * 形が変わるときは元の位置と大きさから滑らかに移す。本文の下の余白を変えるため、html に形の印（data-player）を付ける
 */
export function useFrameLayout(mode: FrameMode, slot: HTMLElement | null) {
  const frame = useRef<HTMLDivElement>(null);
  // 右下の窓と大きな置き場所を行き来するとき、元の位置と大きさから滑らかに移す（FLIP）。
  // 動かすのは見た目の transform だけで、iframe そのものは動かさない
  const lastBox = useRef<DOMRect | null>(null);
  const lastMode = useRef(mode);
  // 前の形になった時刻と、その前の形。一瞬（1フレームほど）しか続かなかった形は、無かったものとして扱う
  const lastModeAt = useRef(0);
  const beforeLast = useRef<FrameMode>(mode);

  // ボカロPの画面では、プレイヤーを画面に固定し、置き場所の位置と大きさに合わせ続ける。
  // 置き場所は曲目をスクロールしても上に貼り付く（sticky）ので、ページの中ではなく画面の座標で合わせる。
  // 貼り付いているあいだは位置が変わらないので、スクロールに付いていく遅れは見えない。
  // スクロールのたびに React を通すと全体が描き直しになるので、要素の style を直接書き換える
  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const from = lastBox.current;

    let cleanup = () => {};
    if (mode === 'slot' && slot) {
      let pending = 0;
      const place = () => {
        pending = 0;
        // 画面を移るとき、置き場所がページから外れたあとに一度だけ呼ばれることがある。外れた要素は
        // 大きさ0として測られ、プレイヤーまで大きさ0になるので合わせない
        if (!slot.isConnected) return;
        const r = slot.getBoundingClientRect();
        if (r.width === 0) return;
        // プレイヤーはページの外側の層にあり、ページの中のヘッダーより上に描かれる。
        // スクロールでヘッダーの下に潜った分は、上側を切り取って見せない（スマホは置き場所を貼り付けないので潜る）
        const headerBottom = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
        const hidden = Math.max(0, Math.min(r.height, headerBottom - r.top));
        el.style.clipPath = hidden > 0 ? `inset(${hidden}px 0 0 0)` : '';
        el.style.top = `${r.top}px`;
        el.style.left = `${r.left}px`;
        el.style.width = `${r.width}px`;
        el.style.height = `${r.height}px`;
        // 次に移るときの出発点。置き場所はスクロールで動くので、合わせるたびに覚えておく
        lastBox.current = r;
      };
      const schedule = () => {
        pending ||= requestAnimationFrame(place);
      };
      place();
      const observer = new ResizeObserver(schedule);
      observer.observe(slot);
      observer.observe(document.body);
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      cleanup = () => {
        cancelAnimationFrame(pending);
        observer.disconnect();
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
      };
    } else {
      el.style.removeProperty('top');
      el.style.removeProperty('left');
      el.style.removeProperty('width');
      el.style.removeProperty('height');
      el.style.removeProperty('clip-path');
      // 右下の窓は画面に固定なので、位置と大きさが変わるのは画面の幅が変わったときと、左右に寄せ直したときだけ
      const remember = () => {
        lastBox.current = el.getBoundingClientRect();
      };
      window.addEventListener('resize', remember);
      window.addEventListener(DOCK_SIDE_EVENT, remember);
      cleanup = () => {
        window.removeEventListener('resize', remember);
        window.removeEventListener(DOCK_SIDE_EVENT, remember);
      };
    }

    const to = el.getBoundingClientRect();
    // 一瞬だけ右下の窓の形になって、すぐ別の形に替わることがある。最初の1曲を流し始めたとき（置き場所が知らされるまで）と、
    // ボカロPの画面からお気に入りの曲の画面へ戻ったとき（戻った画面が並びを取り戻すまで）。その一瞬は無かったものとして、
    // その前の形から移ったとみなす。一瞬のあいだに始めた移る動きも取り消す。取り消さないと、右下の窓へ向けたずれを大きな
    // 置き場所の位置に当てたまま動き、画面の左上の外から入ってくるように見えた（2026-10-11）
    const flash = lastMode.current === 'dock' && performance.now() - lastModeAt.current < 100;
    if (flash && mode !== 'dock') for (const animation of el.getAnimations()) animation.cancel();
    const previous = flash ? beforeLast.current : lastMode.current;
    const moved = previous !== mode && previous !== 'none' && mode !== 'none';
    if (previous === 'none' && mode === 'slot' && !prefersReducedMotion()) {
      // 何も流していなかったところから大きな置き場所に出るときは、その場でふわっと出す
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: MOTION.move, easing: EASE_OUT });
    }
    if (moved && from && to.width > 0 && !prefersReducedMotion()) {
      el.animate(
        [
          {
            transformOrigin: 'top left',
            transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`,
          },
          { transformOrigin: 'top left', transform: 'none' },
        ],
        { duration: MOTION.move, easing: EASE_OUT },
      );
    }
    if (lastMode.current !== mode) {
      lastModeAt.current = performance.now();
      beforeLast.current = previous;
    }
    lastMode.current = mode;
    lastBox.current = to;

    // 出発点は後片付けの中では測らない。後片付けが動く時点では、要素はもう次の指定に切り替わっていて、
    // 位置の決まっていない（ページの左下の）箱を測ってしまう
    return cleanup;
  }, [mode, slot]);

  // 右下のプレイヤーが本文の最後を隠さないよう、本文の下の余白を変えるための印
  useEffect(() => {
    document.documentElement.dataset.player = mode;
  }, [mode]);
  return frame;
}
