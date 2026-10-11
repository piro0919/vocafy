/** 指やマウスで引く操作の決まり */

/** 引く操作とみなすまでの動き（px）。これより小さい動きは、押しただけの指の揺れとして見ない */
export const DRAG_SLOP = 8;

/** 再生位置を矢印のキーで動かす幅（秒） */
export const SEEK_STEP = 5;

/** 再生位置を J・L で動かす幅（秒。YouTube と同じ） */
export const LONG_SEEK_STEP = 10;

/** 音量を矢印のキーで動かす幅（0〜100） */
export const VOLUME_STEP = 10;
