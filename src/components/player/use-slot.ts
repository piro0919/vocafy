import { useCallback, useRef, useState } from 'react';

/** 曲の一覧から押したとき、ボカロPの画面の置き場所を待つ長さ（ミリ秒）。過ぎたら右下の窓に出す */
const WAIT_FOR_SLOT = 1000;

/** holdSlot で前の画面に動画を出し続けさせる長さの上限（ミリ秒）。初めて開くラジオの画面も読み込み中の形はすぐ出る */
const HOLD_SLOT = 3000;

/**
 * 動画を大きく出す置き場所（player-stage.tsx が知らせる）と、置き場所を待つ・持ち続ける状態。
 * - holdSlot: 画面を移るあいだ、いまの置き場所に動画を出し続けさせる（行き先の置き場所ができるか HOLD_SLOT まで）
 * - waitForSlot: 置き場所ができるまで、右下の窓を出さずに WAIT_FOR_SLOT まで待つ。false を渡すと待つのをやめる
 */
export function useSlot() {
  const [slot, setSlotState] = useState<HTMLElement | null>(null);
  const [holdingSlot, setHoldingSlot] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const holdSlot = useCallback(() => {
    clearTimeout(holdTimer.current);
    setHoldingSlot(true);
    holdTimer.current = setTimeout(() => setHoldingSlot(false), HOLD_SLOT);
  }, []);
  // 新しい置き場所ができたら、前の画面に出し続けさせるのをやめる
  const setSlot = useCallback((el: HTMLElement | null) => {
    setSlotState(el);
    if (el) {
      clearTimeout(holdTimer.current);
      setHoldingSlot(false);
    }
  }, []);
  // 曲の一覧から押してボカロPの画面へ移る途中（pending）は、置き場所が見つかるまで右下の窓を出さずに待つ。
  // 出すと、窓に出てから大きな置き場所へ移る動きが見えた（作り置きの無いボカロPの画面は開くのに時間がかかる）。
  // プレイヤーは流しているあいだ見せておく決まり（YouTube の規約）なので、待つのは WAIT_FOR_SLOT まで。
  // 埋め込みが読み込まれて鳴り始めるまでにも1秒前後かかるので、見えないまま鳴ることはほぼ無い
  const [waitingForSlot, setWaitingForSlot] = useState(false);
  const waitTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const waitForSlot = useCallback((on = true) => {
    clearTimeout(waitTimer.current);
    setWaitingForSlot(on);
    if (on) waitTimer.current = setTimeout(() => setWaitingForSlot(false), WAIT_FOR_SLOT);
  }, []);
  return { slot, setSlot, holdingSlot, holdSlot, waitingForSlot, waitForSlot };
}
