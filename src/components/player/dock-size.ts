import { type PointerEvent as ReactPointerEvent, useEffect } from 'react';
import { atLeast } from '@/lib/breakpoints';
import { IMAGE_SIZES } from '@/lib/image-sizes';

/**
 * パソコンの右下の窓（ミニプレーヤー）の大きさ（2026-10-11 に本人と決めた）。窓の上の帯の外側の角の引き手を引いて変える
 * （dock-strip.tsx の DockResizeHandle）。設定の画面には置かない。引き手が見えるので、引けることは見て分かる。
 * 縦横は 16:9 のまま、幅だけを持つ。下限はいまの大きさ（高さ 200px。YouTube の規約の下限）、上限は画面の幅の 75% と、
 * 窓と上の帯が上の段の下に収まる高さ。
 * 窓の大きさは globals.css の --spacing-dock（高さ）・--spacing-dock-wide（幅）から、上に積む板や本文の余白まで組み立てているので、
 * html にその2つを書き換えれば周りもまとめて追従する。スマホは正方形の下限のままで、動かせる幅が無いので変えない。
 * 決めた幅はこのブラウザに残す。引き手をダブルクリックすると元の大きさに戻す
 */
const KEY = 'vocafy-dock-width';
/** 横と縦の比。動画の形そのもの（16:9）なので数字のまま書く */
// eslint-disable-next-line @typescript-eslint/no-magic-numbers
const RATIO = 16 / 9;
/** 上限。画面の幅に対する割合。大きくして本文や板が見えづらくなるのは、その人が選んだ結果として許す（2026-10-11 に本人と決めた） */
const MAX_SHARE = 0.75;
const WIDE = atLeast('md');

function saved(): number | null {
  try {
    const width = Number(localStorage.getItem(KEY));
    return Number.isFinite(width) && width > 0 ? width : null;
  } catch {
    return null;
  }
}

/** globals.css の長さ（計算前の式のまま返るもの）を px で測る。見えない箱の高さにして読む */
function measure(length: string): number {
  const probe = document.createElement('div');
  probe.style.cssText = `position:absolute;visibility:hidden;height:${length}`;
  document.body.append(probe);
  const px = probe.offsetHeight;
  probe.remove();
  return px;
}

/**
 * 高さの上限。窓と上の帯が、パソコンの上の段の下に収まるところまで。上の段に重なると、検索欄やログインが窓の下に隠れて押せなくなる。
 * 窓の下端（--dock-bottom）・帯の高さ（--spacing-dock-strip）・上の段の下端（--below-header）は globals.css から測る
 */
function maxHeight(): number {
  return (
    window.innerHeight -
    measure('var(--dock-bottom)') -
    measure('var(--spacing-dock-strip)') -
    measure('var(--below-header)')
  );
}

/** 幅の上限。画面の幅と高さで決まる。測るたびに画面の配置を計算し直させるので、引いているあいだは引き始めに1回だけ測る */
function maxWidth(): number {
  return Math.min(window.innerWidth * MAX_SHARE, maxHeight() * RATIO);
}

function clamp(width: number, max = maxWidth()): number {
  return Math.max(IMAGE_SIZES.dockWide, Math.min(width, max));
}

/** 窓の大きさを html に書く。null や下限のときは、globals.css の元の大きさに戻す */
function apply(width: number | null) {
  const style = document.documentElement.style;
  if (width === null || !window.matchMedia(WIDE).matches || width <= IMAGE_SIZES.dockWide) {
    style.removeProperty('--spacing-dock');
    style.removeProperty('--spacing-dock-wide');
    return;
  }
  style.setProperty('--spacing-dock-wide', `${width}px`);
  style.setProperty('--spacing-dock', `${width / RATIO}px`);
}

/** 残した大きさを当てる。画面の幅や高さが変わったら、上限に収め直す */
export function useDockSize() {
  useEffect(() => {
    const wide = window.matchMedia(WIDE);
    const refit = () => {
      const width = saved();
      apply(width === null ? null : clamp(width));
    };
    // 画面の大きさを変えているあいだは resize が続けて届くので、1コマに1回だけ収め直す
    let frame = 0;
    const onResize = () => {
      frame ||= requestAnimationFrame(() => {
        frame = 0;
        refit();
      });
    };
    refit();
    wide.addEventListener('change', refit);
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame);
      wide.removeEventListener('change', refit);
      window.removeEventListener('resize', onResize);
    };
  }, []);
}

/**
 * 引き手を押したとき。外側の角を引いた分だけ窓を大きくする。右に寄せているときは左上の角を左か上へ、
 * 左に寄せているときは右上の角を右か上へ引くと大きくなる。横と縦の引いた量の大きい方に合わせる
 */
export function startDockResize(e: ReactPointerEvent<HTMLElement>) {
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  const handle = e.currentTarget;
  const frame = document.querySelector<HTMLElement>('[data-player-frame]');
  const left = document.documentElement.dataset.dock === 'left';
  const startX = e.clientX;
  const startY = e.clientY;
  const startWidth = frame?.getBoundingClientRect().width ?? IMAGE_SIZES.dockWide;
  let width = startWidth;
  // 引いているあいだは画面の大きさが変わらないので、上限は引き始めに1回だけ測る
  const max = maxWidth();
  handle.setPointerCapture(e.pointerId);
  // 引いているあいだに指が動画の上へ入っても、埋め込みに取られないようにする
  if (frame) frame.style.pointerEvents = 'none';

  const move = (ev: PointerEvent) => {
    const dx = left ? ev.clientX - startX : startX - ev.clientX;
    const dy = (startY - ev.clientY) * RATIO;
    width = clamp(startWidth + Math.max(dx, dy), max);
    apply(width);
  };
  const up = () => {
    handle.removeEventListener('pointermove', move);
    handle.removeEventListener('pointerup', up);
    handle.removeEventListener('pointercancel', up);
    if (frame) frame.style.pointerEvents = '';
    try {
      if (width <= IMAGE_SIZES.dockWide) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, String(Math.round(width)));
    } catch {
      // 残せない窓では、開き直すと元の大きさに戻る
    }
  };
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', up);
  handle.addEventListener('pointercancel', up);
}

/** 元の大きさに戻す（引き手のダブルクリック） */
export function resetDockSize() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 残せない窓でも、この画面では戻る
  }
  apply(null);
}
