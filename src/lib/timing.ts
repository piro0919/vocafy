/**
 * 待ち時間（ミリ秒）。2か所以上で使うものと、動きではない時間をここに置く（動きの長さは motion.ts）
 */
/** 1分・1時間のミリ秒 */
export const MINUTE_MS = 60 * 1000;
export const HOUR_MS = 60 * MINUTE_MS;

export const TIMING = {
  /** 検索欄に打ち終えてから検索するまで待つ時間 */
  searchDebounce: 300,
  /** 「元に戻す」の付いた知らせを出しておく時間 */
  undoToast: 5000,
  /** 再生中に、再生位置をプレイヤーから拾う間隔（間は帯の側で補う） */
  positionPoll: 500,
  /** 一時停止がこれだけ続いたら、無音で開けておいた音の出口を止める（keep-awake.ts） */
  audioRest: 30_000,
  /** 画面を移り始めてから、住所が変わらなくても移動中の印を外すまでの時間（navigation-state.ts） */
  navigationLimit: 10_000,
  /** 「戻る」を送ってから、履歴が動かなかったとみなしてトップへ移るまでの時間（leave.ts） */
  backFallback: 500,
  /** 押した曲が鳴る前に同じ曲をこれだけのうちに押し直したら、鳴らなかったとみなして知らせる（player/watch.ts） */
  retapWindow: 15_000,
  /** これより早い押し直しは数えない。素早い二度押しで、鳴らないと感じて押し直したのではない（player/watch.ts） */
  retapMin: 1000,
} as const;
