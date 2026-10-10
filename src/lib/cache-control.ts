/** 1日の秒数 */
const DAY = 24 * 60 * 60;

/**
 * CDN に置く期限の Cache-Control。days 日のあいだはそのまま返し、そのあと stale 日までは古いものを返しながら取り直す。
 * ページの revalidate は Next.js が数字のままでしか読まないので、ここは使えない（数字を書き、日数を説明に書く）
 */
export function cdnCache(days: number, stale: number): string {
  return `public, s-maxage=${days * DAY}, stale-while-revalidate=${stale * DAY}`;
}
