import type { QueueItem } from '@/lib/catalog';
import type { Owner, QueueOwner, Repeat, Sleep } from './player-types';

/**
 * プレイヤーの分かれ道のうち、状態だけで決まるもの。プレイヤー（engine）を呼ぶ時機や音量の扱いはここに置かない
 * （player-provider.tsx）。値を書き換えず、決めた結果を返すだけにする（テストできるように）
 */

/** 持ち主の画面が無い並び（歌声の画面の代表曲）と、ボカロPの画面へ移る途中 */
export const LOOSE: Owner = { kind: 'loose' };
export const PENDING: Owner = { kind: 'pending' };

/**
 * その画面が、いま流している並びの持ち主か（動画を大きく出すか）。流していなければ持ち主ではない。
 * ボカロPの画面へ移る途中（pending）は、流している曲のボカロPの画面を持ち主とみる（着いた画面が並びを差し替える）
 */
export function owns(owner: Owner, page: QueueOwner, current: QueueItem | null): boolean {
  if (!current) return false;
  switch (page.kind) {
    case 'producer':
      return owner.kind === 'producer'
        ? owner.producerId === page.producerId
        : owner.kind === 'pending' && current.producerId === page.producerId;
    case 'favorites':
      return owner.kind === 'favorites';
    case 'list':
      return owner.kind === 'list' && owner.source === page.source;
    case 'radio':
      return owner.kind === 'radio' && owner.home === page.home;
  }
}

/**
 * 並びの持ち主の画面の住所（右下の窓の帯の行き先など）。持ち主の画面が無い並びは、流している曲のボカロPの画面
 */
export function ownerHref(owner: Owner, item: QueueItem): string {
  switch (owner.kind) {
    case 'producer':
      return `/producers/${owner.producerId}`;
    case 'favorites':
      return '/favorites/songs';
    case 'list':
      return `/${owner.source}/play`;
    case 'radio':
      return owner.home;
    case 'pending':
    case 'loose':
      return `/producers/${item.producerId}`;
  }
}

/**
 * 移る途中（pending）は、開き直したときや流し直すときには残さず、流している曲のボカロPの並びとして残す。
 * 着いた画面が差し替える前の仮の値のため
 */
export function settledOwner(owner: Owner, item: QueueItem): Owner {
  return owner.kind === 'pending' ? { kind: 'producer', producerId: item.producerId } : owner;
}

/** ラジオを始める前に流していた並び。ラジオをやめたら、始めた曲のままならここへ戻す */
export type BeforeRadio = {
  queue: QueueItem[];
  index: number;
  owner: Owner;
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
  | { kind: 'restore'; before: BeforeRadio; owner: Owner; href: string }
  | { kind: 'producer'; item: QueueItem; href: string };

export function radioExit(now: QueueItem | undefined, before: BeforeRadio | null): RadioExit {
  if (!now) return { kind: 'empty', href: '/' };
  if (
    before &&
    before.owner.kind !== 'radio' &&
    before.queue[before.index]?.songId === now.songId
  ) {
    const owner = settledOwner(before.owner, now);
    return { kind: 'restore', before, owner, href: ownerHref(owner, now) };
  }
  return { kind: 'producer', item: now, href: `/producers/${now.producerId}` };
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
