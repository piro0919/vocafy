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
} as const;
