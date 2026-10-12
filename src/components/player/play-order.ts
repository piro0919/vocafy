/**
 * 流す順。ランダムでなければ並びどおり、ランダムなら start を先頭にして残りを混ぜる。
 * 前の曲へ戻ったときに同じ曲へ戻れるよう、混ぜた順は覚えておく
 */
export function buildOrder(length: number, start: number, shuffle: boolean): number[] {
  const order = Array.from({ length }, (_, i) => i);
  if (!shuffle) return order;
  const rest = order.filter((i) => i !== start);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [start, ...rest];
}

/**
 * 「再生」で流し始める位置（2026-10-12 に決めた）。anywhere なら並びのどこかから、そうでなければ先頭から。
 * 押すたびに同じ曲から始まらないようにする。ランダムでなければ、選んだ曲から並びどおりに続け、最後の次は先頭へ戻る。
 * ボカロPの画面だけは、先頭がその人の最新曲で意味があるので、ランダムのときだけ anywhere にする
 */
export function playStart(length: number, anywhere: boolean, random = Math.random): number {
  return anywhere && length > 0 ? Math.floor(random() * length) : 0;
}
