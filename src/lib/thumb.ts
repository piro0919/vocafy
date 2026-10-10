import type { QueueItem } from './catalog';

/**
 * YouTube のサムネイル。mqdefault は動画と同じ 16:9（320×180）で、黒い帯が入らない。
 * ブラウザ側の部品からも使うので、DB を読む catalog.ts には置かない
 */
export function thumbOf(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

/** 途中のコマの番号（およそ 25%・50%・75% の位置） */
const FRAMES = { quarter: 1, half: 2, threeQuarters: 3 } as const;
type FrameNumber = (typeof FRAMES)[keyof typeof FRAMES];
export const FRAME_NUMBERS: FrameNumber[] = Object.values(FRAMES);

/**
 * 動画の途中のコマ。YouTube が自動で選ぶもので、n = 1・2・3 がおよそ 25%・50%・75% の位置。
 * 大きさと形は mqdefault と同じ
 */
export function frameOf(videoId: string, n: FrameNumber): string {
  return `https://i.ytimg.com/vi/${videoId}/mq${n}.jpg`;
}

/**
 * 一覧の小さな表紙（85×48 ほどで出す）。YouTube の曲は、mqdefault（14.5KB ほど）ではなく default（120×90、3.5KB ほど）を使い、
 * 通信量を4分の1にする。default は 16:9 の絵の上下に黒い帯を足した 4:3 なので、16:9 の枠に object-cover で収めると、帯だけが切れて絵は丸ごと残る。
 * 表紙を切ることについて、YouTube の開発者向けの規約とブランドの手引きに禁じる文は無かった（2026-10-09 に確かめた。変えてはいけないのはロゴ）。
 * 帯の境目は端数なので、絵の端がまれに1画素ほど欠けることはある。ニコニコの曲はいまの表紙のまま
 */
export function smallThumbOf(item: Pick<QueueItem, 'service' | 'videoId' | 'thumb'>): string {
  return item.service === 'youtube'
    ? `https://i.ytimg.com/vi/${item.videoId}/default.jpg`
    : item.thumb;
}
