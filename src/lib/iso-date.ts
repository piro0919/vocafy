/**
 * 日付の文字列（"2026-10-11" や "2026-10-11T..."）から部分を取り出す。位置の数字をあちこちに書かないためにここにまとめる
 */
const YEAR = { start: 0, end: 4 };
const MONTH = { start: 5, end: 7 };
const MONTH_DAY = { start: 5, end: 10 };
const DATE = { start: 0, end: 10 };

/** "2026" */
export const yearOf = (iso: string) => iso.slice(YEAR.start, YEAR.end);
/** "10" */
export const monthOf = (iso: string) => iso.slice(MONTH.start, MONTH.end);
/** "10-11" */
export const monthDayOf = (iso: string) => iso.slice(MONTH_DAY.start, MONTH_DAY.end);
/** "2026-10-11" */
export const dateOf = (iso: string) => iso.slice(DATE.start, DATE.end);

/** 日本の暦できょうの日付（"2026-10-11"）。トップの中身を選ぶ proxy.ts と、日替わりの選び方（catalog.ts）が使う */
export function today(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
}

/** 日本の時刻のいまの時（0〜23）。トップの大きな1曲を1時間ごとに替えるのに proxy.ts が使う */
export function hourInJapan(): number {
  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tokyo',
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(new Date()),
  );
}
