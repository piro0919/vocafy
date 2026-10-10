import { formatCount } from './format';

/** 「10-09」→「10月9日」。日付の一覧の画面と、その再生用の画面（/play）で同じものを使う */
export function dayLabel(day: string): string {
  const [m, d] = day.split('-').map(Number);
  return `${m}月${d}日`;
}

/**
 * 一覧で流す曲の数の表記。全曲を流すなら「350曲」、全曲から選んで流すなら「100曲（全950曲）」。
 * 歌声の画面の「96曲（全1,613曲）」と同じ書き方。一覧の画面とその再生用の画面で同じものを使う
 */
export function playlistCount(p: { songs: unknown[]; total: number; pickup: boolean }): string {
  return p.pickup
    ? `${formatCount(p.songs.length)}曲（全${formatCount(p.total)}曲）`
    : `${formatCount(p.total)}曲`;
}
