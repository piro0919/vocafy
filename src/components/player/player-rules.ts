import type { QueueItem } from '@/lib/catalog';
import type { ListSource, PlayContext, Repeat, Sleep } from './player-types';

/**
 * プレイヤーの分かれ道のうち、状態だけで決まるもの。プレイヤー（engine）を呼ぶ時機や音量の扱いはここに置かない
 * （player-provider.tsx）。値を書き換えず、決めた結果を返すだけにする（テストできるように）
 */

/** 移る途中（pending）は、開き直したときや流し直すときには残さない。着いた画面が差し替える前の仮の種類のため */
export function settledContext(context: PlayContext): PlayContext {
  return context === 'pending' ? 'list' : context;
}

/** ラジオを始める前に流していた並び。ラジオをやめたら、始めた曲のままならここへ戻す */
export type BeforeRadio = {
  queue: QueueItem[];
  index: number;
  context: PlayContext;
  listSource: string | null;
  more: ListSource | null;
};

/**
 * ラジオをやめたときにどうするか。href は並びの持ち主の画面。
 * - empty: 流している曲が無い
 * - restore: 始めた曲のまま（ラジオでまだ次へ進んでいない）なので、元の並びのその位置に戻す
 * - producer: ラジオで次へ進んでいたら（戻す並びが無いときも）、いまの曲のボカロPの曲の並びにして、その曲から続ける。
 *   元の並びに戻すと、いまの曲が終わるまで、その曲の載っていない元の持ち主の画面に動画を大きく出すことになった
 *   （2026-10-10 に本人と決めた）
 */
export type RadioExit =
  | { kind: 'empty'; href: string }
  | { kind: 'restore'; before: BeforeRadio; context: PlayContext; href: string }
  | { kind: 'producer'; item: QueueItem; href: string };

export function radioExit(now: QueueItem | undefined, before: BeforeRadio | null): RadioExit {
  if (!now) return { kind: 'empty', href: '/' };
  const producer = `/producers/${now.producerId}`;
  if (before && before.queue[before.index]?.songId === now.songId) {
    return {
      kind: 'restore',
      before,
      context: before.context === 'radio' ? 'list' : settledContext(before.context),
      href:
        before.context === 'favorites'
          ? '/favorites/songs'
          : before.listSource
            ? `/${before.listSource}/play`
            : producer,
    };
  }
  return { kind: 'producer', item: now, href: producer };
}

/**
 * 自動で進んだ先のニコニコの曲を、読み込まずに飛ばすか。iPad の Safari では、自動で進んだ先のニコニコの曲は必ず止められる
 * （blocked。一度止められたらこのタブではずっと）。自分で押した曲は ▶ で流せるので飛ばさない。並びがニコニコの曲だけのときに
 * 回り続けないよう、続けて飛ばした数（skipped）が並びの数に届いたら飛ばさない
 */
export function skipsAutoNiconico(
  item: QueueItem | undefined,
  {
    auto,
    blocked,
    skipped,
    length,
  }: { auto: boolean; blocked: boolean; skipped: number; length: number },
): boolean {
  return auto && blocked && item?.service === 'niconico' && skipped < length;
}

/**
 * 曲が終わったときにどうするか。スリープタイマーが「この曲が終わったら」なら止める、1曲ループなら頭から、
 * そうでなければ流す順の次の曲へ
 */
export function afterEnded(
  sleep: Sleep | null,
  repeat: Repeat | undefined,
): 'stop' | 'repeat' | 'next' {
  if (sleep?.kind === 'end') return 'stop';
  if (repeat === 'one') return 'repeat';
  return 'next';
}
