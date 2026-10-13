// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { QueueItem } from '@/lib/catalog';

// vitest の globals を使っていないので、描いた部品はテストごとに自分で片付ける（残すと受け口が重なる）
afterEach(cleanup);

/**
 * 流しているあいだのタブの題名（song-title.tsx）。ブラウザは題名を読むときに空白を整えるので、
 * 書いた文字のまま覚えると読み返しと食い違い、見張りが書き直し続けてページが固まった（2026-10-13、曲名「不♡快感 」）
 */

const player = vi.hoisted(() => ({
  value: { current: null as QueueItem | null, playing: false },
}));
vi.mock('@/components/player/player-provider', () => ({ usePlayer: () => player.value }));
vi.mock('@/components/display-names', () => ({
  useSongTitle: () => (song: { title: string }) => ({ main: song.title }),
  useProducerName: () => (_id: number, name: string) => name,
}));

const { SongTitle } = await import('@/components/player/song-title');

/** 書き直しが止まらなかったときにテストまで固まらないよう、この回数を超えた書き込みは捨てる */
const WRITE_CAP = 50;

let writes: string[];

/** 題名の書き込みを数える。読み書きはブラウザ（happy-dom）の本来の題名に任せる */
function countTitleWrites() {
  let proto: object | null = Object.getPrototypeOf(document);
  let descriptor: PropertyDescriptor | undefined;
  while (proto && !descriptor) {
    descriptor = Object.getOwnPropertyDescriptor(proto, 'title');
    proto = Object.getPrototypeOf(proto);
  }
  const native = descriptor!;
  Object.defineProperty(document, 'title', {
    configurable: true,
    get: () => native.get!.call(document),
    set: (value: string) => {
      writes.push(value);
      if (writes.length <= WRITE_CAP) native.set!.call(document, value);
    },
  });
}

/** 見張り（MutationObserver）の知らせが届ききるまで待つ */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 20)));

function song(title: string): QueueItem {
  return {
    songId: 1,
    title,
    service: 'youtube',
    videoId: 'a',
    thumb: '',
    producerId: 45,
    producerName: 'DECO＊27',
    vocalists: '初音ミク',
  } as QueueItem;
}

beforeEach(() => {
  document.head.innerHTML = '<title>DECO＊27 | Vocafy</title>';
  writes = [];
  countTitleWrites();
});
afterEach(() => {
  Reflect.deleteProperty(document, 'title');
});

it('流しているあいだは「曲名 - ボカロP | Vocafy」にし、止めたら画面の題名に戻す', async () => {
  player.value = { current: song('罪と罰'), playing: true };
  const view = renderHook(() => SongTitle());
  await settle();
  expect(document.title).toBe('罪と罰 - DECO＊27 | Vocafy');
  player.value = { current: song('罪と罰'), playing: false };
  view.rerender();
  await settle();
  expect(document.title).toBe('DECO＊27 | Vocafy');
});

it('曲名に頭や末尾の空白があっても、題名を書き直し続けない', async () => {
  player.value = { current: song('罪と罰'), playing: true };
  const view = renderHook(() => SongTitle());
  await settle();
  // 見張りを付けたあとに、空白のある曲名へ替わる
  player.value = { current: song(' 不♡快感 '), playing: true };
  view.rerender();
  await settle();
  expect(writes).toHaveLength(2);
  expect(document.title).toBe('不♡快感  - DECO＊27 | Vocafy');
});

it('画面を移って題名が書き換えられたら、それを画面の題名として覚え、曲名に戻す', async () => {
  player.value = { current: song('罪と罰'), playing: true };
  const view = renderHook(() => SongTitle());
  await settle();
  // Next.js が題名の要素を差し替える
  document.head.innerHTML = '<title>Vocafy</title>';
  await settle();
  expect(document.title).toBe('罪と罰 - DECO＊27 | Vocafy');
  player.value = { current: song('罪と罰'), playing: false };
  view.rerender();
  await settle();
  expect(document.title).toBe('Vocafy');
});
