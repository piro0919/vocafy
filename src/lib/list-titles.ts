/** 「10-09」→「10月9日」。日付の一覧の画面と、その再生用の画面（/play）で同じものを使う */
export function dayLabel(day: string): string {
  const [m, d] = day.split('-').map(Number);
  return `${m}月${d}日`;
}

/**
 * 一覧の再生用の画面の小さな英字。全曲から選んだ曲を流すときは PICKUP を添える（「2026 PICKUP」「ON THIS DAY PICKUP」）。
 * 曲数を出さないので、並んでいるのが全曲の一部だと分かる手がかりにする。「PICKUP FROM 2026」の形は、日付の一覧で不自然になる
 */
export function withPickup(eyebrow: string, pickup: boolean): string {
  return pickup ? `${eyebrow} PICKUP` : eyebrow;
}
