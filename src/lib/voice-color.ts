/**
 * 歌声（キャラ）の色。札や印に使う。公式の絵の髪や衣装の色に寄せた、飾りのための色で、
 * 文字の地には使わない（字は札の地の上に、いつもの字の色で載せる）。表に無い歌声は差し色の青緑
 */
const COLORS: Record<string, string> = {
  初音ミク: '#39c5bb',
  鏡音リン: '#f5c400',
  鏡音レン: '#f29b00',
  巡音ルカ: '#f37fa6',
  カイト: '#3d6fd8',
  メイコ: '#d9363e',
  グミ: '#78c13f',
  神威がくぽ: '#7d55c7',
  重音テト: '#e0405a',
  イア: '#e8b4cf',
  可不: '#7fb7ec',
  結月ゆかり: '#a679d8',
  歌愛ユキ: '#e85d8c',
  ブイフラワ: '#8a4fbf',
  音街ウナ: '#f08a3c',
  ずんだもん: '#7cc46b',
  小春六花: '#b79ad9',
  MAYU: '#d9a0dc',
  リリィ: '#e3c13b',
  'SF-A2 開発コード miki': '#e2554a',
};

export function voiceColor(name: string): string {
  return COLORS[name] ?? '#39c5bb';
}
