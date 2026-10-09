import { ROW_LABEL, type Row } from './kana';

/** 一覧の題名に使う名前。一覧の画面と、その再生用の画面（/play）で同じものを使う */

/** 「10-09」→「10月9日」 */
export function dayLabel(day: string): string {
  const [m, d] = day.split('-').map(Number);
  return `${m}月${d}日`;
}

/** あいうえお順の行の名前。かなの行は「あ行」、それ以外は札の字のまま */
export function rowTitle(row: Row): string {
  return row === 'abc' ? 'ABC・数字' : row === 'etc' ? 'そのほか' : `${ROW_LABEL[row]}行`;
}
