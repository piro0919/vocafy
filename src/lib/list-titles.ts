import { KANA_ROWS, ROW_LABEL, type Row } from './kana';

/** 一覧の題名に使う名前。一覧の画面と、その再生用の画面（/play）で同じものを使う */

/** 「10-09」→「10月9日」 */
export function dayLabel(day: string): string {
  const [m, d] = day.split('-').map(Number);
  return `${m}月${d}日`;
}

/** あいうえお順の行の名前。かなの行は「あ行」、英字と数字は札の字のまま */
export function rowTitle(row: Row): string {
  if (row === 'etc') return 'そのほか';
  return (KANA_ROWS as readonly string[]).includes(row) ? `${ROW_LABEL[row]}行` : ROW_LABEL[row];
}
