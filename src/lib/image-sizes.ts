import { atLeast } from './breakpoints';

/**
 * 画像の大きさ（px）。next/image の width・height・sizes に渡す値を、数字をじかに書かずにここから取る。
 * CSS の名前と同じ値のもの（thumb の幅・dockWide）は、test/design-rules.test.ts が globals.css との一致を見る。
 * そのほかは、同じ要素の Tailwind のクラスと合わせる（それぞれの説明に書く）
 */
export const IMAGE_SIZES = {
  /** 一覧の小さな表紙（16:9）。幅は globals.css の --spacing-thumb */
  thumb: { width: 85, height: 48 },
  /** 再生の帯の表紙（16:9） */
  barThumb: { width: 71, height: 40 },
  /** 左のメニューのロゴの影絵 */
  logo: { width: 43, height: 36 },
  /** 検索の結果のボカロPのアイコン（size-8） */
  avatar: 32,
  /** 右上の顔写真（size-9）。隣のサイコロ・ログインと同じ高さ */
  account: 36,
  /** ボカロPの画面の題名のアイコン（sm:size-14） */
  producerIcon: 56,
  /** 表紙の札の顔の画像 */
  coverCard: 192,
  /** パソコンの右下の窓の幅。globals.css の --spacing-dock-wide */
  dockWide: 356,
} as const;

/** 一覧で、先に読み込む（lazy にしない）表紙の数。最初の画面に見えている分 */
export const EAGER_IMAGES = 8;

/**
 * 画面の幅で変わる画像の sizes。表紙を出す枠の幅（画面の幅に対する割合）を、同じ要素の Tailwind のクラスと合わせる
 */
export const RESPONSIVE_SIZES = {
  /** トップのきょうの日付の大きな1曲（パソコンは左の4割、タブレットは半分、スマホは幅いっぱい） */
  hero: `${atLeast('lg')} 40vw, ${atLeast('sm')} 50vw, 100vw`,
  /** きょうの出会いの壁の1枚（パソコンは6列、タブレットは4列ほど、スマホは3列ほど） */
  mixTile: `${atLeast('lg')} 16vw, ${atLeast('sm')} 25vw, 33vw`,
  /** 動画を大きく出す画面の動画の置き場所の表紙（パソコンは左の列、スマホは幅いっぱい） */
  stage: `${atLeast('lg')} 60vw, 100vw`,
  /** 表紙の札（パソコンは決まった幅、タブレットは3列、スマホは2列） */
  coverCard: `${atLeast('lg')} 240px, ${atLeast('sm')} 33vw, 50vw`,
} as const;
