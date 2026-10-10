/**
 * ボタンの形。新しいボタンもここから選び、ボタンごとに指定を書き起こさない（CLAUDE.md の「見た目」）。
 * 表示の切り替え（grid・hidden・sm:grid など）と、入っている・いないで変わる字の色は、使う側で足す。
 *
 * - PRIMARY: 画面の題名の下に置く、その画面の主役のボタン（再生・一時停止）。アイコンと文言を並べる。文言だけのときは PRIMARY_TEXT（右上のログイン）、
 *   アイコンだけのときは PRIMARY_ICON（右上のきょうの出会いのサイコロ。高さは PRIMARY と同じ 36px）
 * - PILL: 区画の見出しの右や上の帯に置く小さな丸いボタン（すべて表示・履歴を削除）。縁だけの形で、別の画面へ移るなど
 *   流すのではない操作に使う。押すと流れる「再生」は区画の見出しの右でも PRIMARY（2026-10-11 に本人と決めた）
 * - ICON / ICON_SM: アイコンだけのボタン。帯や題名の横は 40px、曲の行の中は 36px。地は指を乗せたときだけ出す
 * - ARROW: 青緑で塗った丸い矢印（棚の送り・ページ送り）。隣に並ぶ「再生」（PRIMARY）に合わせて塗る（2026-10-11。前は縁だけで、並ぶと違和感があった）
 * - COVER_PLAY: 表紙の上に重ねる丸い再生ボタン。押せるのは表紙ごと（親の group）。大きさと位置は使う側で足す
 */
export const PRIMARY =
  'flex shrink-0 items-center gap-2 rounded-full bg-miku py-2 pr-5 pl-4 text-sm font-bold whitespace-nowrap text-on-miku shadow-press transition duration-react hover:brightness-110 active:scale-95 disabled:opacity-disabled';

/** PRIMARY の、アイコンを付けない版（左右の余白をそろえる）。右上のログイン */
export const PRIMARY_TEXT = PRIMARY.replace('pr-5 pl-4', 'px-5');

/** PRIMARY の、アイコンだけの丸い版。右上のサイコロ（mix-button.tsx） */
export const PRIMARY_ICON =
  'grid size-9 shrink-0 place-items-center rounded-full bg-miku text-on-miku shadow-press transition duration-react hover:brightness-110 active:scale-95';

export const PILL =
  'shrink-0 rounded-full border border-accent-line bg-glass px-3 py-1 text-xs font-bold text-accent transition duration-react hover:bg-hover-accent active:scale-95';

const ICON_SHAPE =
  'shrink-0 place-items-center rounded-full transition duration-react hover:bg-hover active:scale-95';
export const ICON = `size-10 ${ICON_SHAPE}`;
export const ICON_SM = `size-9 ${ICON_SHAPE}`;

export const ARROW =
  'size-9 shrink-0 place-items-center rounded-full bg-miku text-on-miku shadow-press transition duration-react hover:brightness-110 active:scale-95 disabled:opacity-disabled disabled:shadow-none disabled:hover:brightness-100';

export const COVER_PLAY =
  'grid place-items-center rounded-full bg-miku text-on-miku shadow-press transition duration-react group-hover:scale-105 group-active:scale-95';
