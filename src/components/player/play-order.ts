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
