/** 曲数・人数を出すときの数字。4桁から 3 桁ごとにカンマを入れる（「1979 曲」が年に見えないように） */
export function formatCount(n: number): string {
  return n.toLocaleString('ja-JP');
}
