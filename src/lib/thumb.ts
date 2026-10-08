/**
 * YouTube のサムネイル。mqdefault は動画と同じ 16:9 で、黒い帯が入らない。
 * hqdefault は 4:3 に黒い帯が付いていて、16:9 の枠に収めると端を切ることになる（サムネイルの改変は規約で禁止）。
 * ブラウザ側の部品からも使うので、カタログ（catalog.json）を読み込む catalog.ts には置かない
 */
export function thumbOf(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}
