/** 「10-09」→「10月9日」。日付の一覧の画面と、その再生用の画面（/play）で同じものを使う */
export function dayLabel(day: string): string {
  const [m, d] = day.split('-').map(Number);
  return `${m}月${d}日`;
}
