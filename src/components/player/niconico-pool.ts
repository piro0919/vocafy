import { createNiconicoPool as createEmbedPool, type NiconicoPool } from 'niconico-embed-player';
import { langOfPath } from '@/i18n/config';
import { defineText } from '@/i18n/text';

export type { NiconicoPool, Preloaded } from 'niconico-embed-player';

/**
 * iPad・iPhone で、画面に見えているニコニコの曲の埋め込みを、隠して先に読み込んでおく。
 * iPad の Safari は、押す操作の無い再生を止める。ニコニコの埋め込みは曲ごとに作り直すので、押してから作ると読み込みを待つあいだに
 * 押した操作の続きとみなされなくなり、1回目は必ず止められた。読み込み済みの埋め込みなら、押した操作の中で play を送れば流れる
 * （帯の ▶ と同じ）。押されたら take で受け取り、プレイヤー（niconico.ts）がそのまま使う。
 *
 * 仕組みはパッケージ niconico-embed-player の createNiconicoPool に任せる（2026-10-16 に切り出した）。読み込めたら音を消して流し、
 * 流れ始めたらすぐ止めて動画の準備まで済ませておくこと、見えている行の数を埋め込みと別に持つこと（refresh）も、パッケージの側にある。
 *
 * 埋め込みは1つ目が 0.7MB ほど、2つ目からはスクリプトを使い回して 0.2MB ほど（2026-10-10 に測った）。動画は押すまで読み込まない。
 * 数の上限は置かず、行が画面から外れたら捨てる。抱える数は、画面に見えているニコニコの曲の数になる。
 * 初めは 6 つまでにしていたが、ニコニコの曲が多く並ぶ画面で7つ目からの行が1回で流れなかった（2026-10-10 に本人と外した）。
 * 一番多くなるのは、iPad で昔の年の月の全曲（2段組み）を開いたときで、20〜30 になりうる。iPad のメモリがどこまで耐えるかは測っていない
 */
const TEXT = defineText({
  ja: { title: 'ニコニコ動画のプレイヤー' },
  en: { title: 'Niconico video player' },
});

/** 埋め込みの読み上げの名前。React の外で作るので、いまの住所から言語を読む */
export function niconicoFrameTitle(): string {
  return TEXT[langOfPath(location.pathname)].title;
}

/** 流し始める位置を持たないとき */
const NO_START = (): number | undefined => undefined;

export function createNiconicoPool(
  frame: () => HTMLElement | null,
  /** いま流している動画。その曲は先に読み込まない（流し始めたあとも行は見えたままなので、同じ動画をもう1つ読み込んでいた） */
  playing: () => string | undefined,
  /** その動画を流し始める位置（秒）。開き直して戻した曲の続きの位置 */
  startOf: (videoId: string) => number | undefined = NO_START,
): NiconicoPool {
  return createEmbedPool({
    container: frame,
    playing,
    startAt: startOf,
    title: niconicoFrameTitle(),
  });
}
