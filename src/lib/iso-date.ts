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
