import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalChoice, createLocalFlag } from '@/lib/local-flag';

const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
});
vi.stubGlobal('window', new EventTarget());

const { addRecentSearch, restoreRecentSearches } = await import('@/lib/recent-searches');
const { rightEdge, setRightEdge, setSwipeBack, swipeBackEnabled } =
  await import('@/components/swipe-back/swipe-back-store');

beforeEach(() => store.clear());

describe('createLocalFlag（入・切の設定）', () => {
  it('既定は残っていない側。既定と違う側に切り替えたときだけ値を残す', () => {
    const flag = createLocalFlag({ key: 'off', value: '1', stored: false });
    expect(flag.read()).toBe(true);
    flag.write(false);
    expect(store.get('off')).toBe('1');
    expect(flag.read()).toBe(false);
    flag.write(true);
    expect(store.has('off')).toBe(false);
  });

  it('切り替えたら同じタブに知らせる', () => {
    const flag = createLocalFlag({ key: 'on', value: 'on', stored: true });
    const onChange = vi.fn();
    const unsubscribe = flag.subscribe(onChange);
    flag.write(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    unsubscribe();
    flag.write(false);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('前から残っている値をそのまま読む（鍵と値の形を変えていない）', () => {
    store.set('vocafy-swipe-back', 'on');
    store.set('vocafy-swipe-back-right', 'forward');
    expect(swipeBackEnabled()).toBe(true);
    expect(rightEdge()).toBe('forward');
    setSwipeBack(false);
    setRightEdge('back');
    expect(store.size).toBe(0);
  });
});

describe('最近の検索', () => {
  it('壊れた中身や言葉でない値が残っていても、落ちずに足せる', () => {
    store.set('vocafy-recent-searches', 'null');
    addRecentSearch('ミク');
    store.set('vocafy-recent-searches', JSON.stringify(['テト', 3, null]));
    addRecentSearch('ルカ');
    expect(JSON.parse(store.get('vocafy-recent-searches')!)).toEqual(['ルカ', 'テト']);
  });

  it('8件までで、消したあとに戻すと、あとから足した言葉が先頭に残る', () => {
    for (const q of ['1', '2', '3', '4', '5', '6', '7', '8', '9']) addRecentSearch(q);
    expect(JSON.parse(store.get('vocafy-recent-searches')!)).toHaveLength(8);
    store.clear();
    addRecentSearch('a');
    restoreRecentSearches(['b', 'a']);
    expect(JSON.parse(store.get('vocafy-recent-searches')!)).toEqual(['a', 'b']);
  });
});

describe('createLocalChoice（選択の設定）', () => {
  const choice = createLocalChoice({
    key: 'theme',
    values: ['system', 'light', 'dark'] as const,
    fallback: 'system',
    event: 'theme-change',
  });

  it('既定を選んだときは何も残さず、ほかを選んだら残す', () => {
    choice.save('dark');
    expect(store.get('theme')).toBe('dark');
    expect(choice.read()).toBe('dark');
    choice.save('system');
    expect(store.has('theme')).toBe(false);
    expect(choice.read()).toBe('system');
  });

  it('知らない値が残っていたら既定として読む', () => {
    store.set('theme', 'sepia');
    expect(choice.read()).toBe('system');
  });

  it('残しただけでは知らせず、notify で知らせる', () => {
    const onChange = vi.fn();
    const unsubscribe = choice.subscribe(onChange);
    choice.save('light');
    expect(onChange).not.toHaveBeenCalled();
    choice.notify();
    expect(onChange).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
