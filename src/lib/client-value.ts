import { useSyncExternalStore } from 'react';

/** 変わらない値なので、見張らない */
const noSubscribe = () => () => {};

/**
 * ブラウザでしか決まらず、画面を開いているあいだは変わらない値（住所・端末の判定など）を読む。サーバーで描くときは server を使い、
 * ブラウザで描き直したときに get の値になる（サーバーの HTML と食い違わない）
 */
export function useClientValue<T>(get: () => T, server: T): T {
  return useSyncExternalStore(noSubscribe, get, () => server);
}
