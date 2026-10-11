/**
 * 面の形。浮いた板・帯・メニューはどれも同じすりガラスの地にする（CLAUDE.md の「見た目」）。ボタンの形は button-styles.ts。
 *
 * - GLASS: すりガラスの地（縁の線・70% の地・ぼかし）。角の丸み・影・余白・位置は使う側で足す（下の帯は上の角だけ丸め、影を付けない）
 * - GLASS_PANEL: 浮いた板（角 16px・影）。上の段・左のメニュー・下のタブ・メニューの板など
 * - MENU_ROW: 板の中の押せる行（右上のメニュー・共有の送り先）。並べ方は使う側で足す
 * - sidebarRow: 左のメニューの1行。いまの画面の行は地を付ける
 */
export const GLASS = 'border border-line/60 bg-glass backdrop-blur-lg backdrop-saturate-150';

export const GLASS_PANEL = `rounded-2xl ${GLASS} shadow-float`;

export const MENU_ROW =
  'rounded-md px-3 py-2 text-left text-sm font-bold text-muted transition-colors hover:bg-hover hover:text-foreground';

export const sidebarRow = (active: boolean) =>
  `flex items-center gap-4 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors duration-react ${
    active ? 'bg-foreground/10 text-foreground' : 'text-muted hover:text-foreground'
  }`;
