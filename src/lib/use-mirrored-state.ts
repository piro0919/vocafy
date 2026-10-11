import { type RefObject, useCallback, useRef, useState } from 'react';

/**
 * 画面に出す値（state）と、作ったときの関数を持ち続ける処理から読む値（ref）を、いつも同じに保つ。set は両方を書き換える。
 * プレイヤーの知らせ（engine.ts）や時計は作ったときの関数を持ち続けるので、state だけでは古い値を読む。
 * 前は ref と state を別々に書き換えていて、片方だけ書き換える食い違いが入りやすかった（2026-10-12 にまとめた）
 */
export function useMirroredState<T>(initial: T): [T, RefObject<T>, (next: T) => void] {
  const [value, setValue] = useState(initial);
  const ref = useRef(initial);
  const set = useCallback((next: T) => {
    ref.current = next;
    setValue(next);
  }, []);
  return [value, ref, set];
}
