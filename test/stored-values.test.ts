import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QueueItem } from '@/lib/catalog';
import { mergeFresh, moveItem } from '@/lib/list-ops';
import { parseList } from '@/lib/local-list';
import { isStoredProducer, isStoredSong } from '@/lib/stored-shapes';

/** テストの中だけの localStorage と window（node には無い） */
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, String(value));
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  clear() {
    this.map.clear();
  }
}
const storage = new MemoryStorage();
vi.stubGlobal('localStorage', storage);
vi.stubGlobal('window', new EventTarget());

const { addToHistory, clearHistory, restoreHistory } = await import('@/lib/history');
const { readResume, saveResume, setResumeEnabled } =
  await import('@/components/player/player-resume');

const song = (songId: number): QueueItem => ({
  songId,
  title: `曲${songId}`,
  service: 'youtube',
  videoId: `yt${songId}`,
  thumb: '',
  producerId: 1,
  producerName: 'P',
  vocalists: '',
});
const ids = (items: { songId: number }[]) => items.map((s) => s.songId);
const history = () => ids(JSON.parse(storage.getItem('vocafy-history') ?? '[]') as QueueItem[]);

beforeEach(() => storage.clear());

describe('parseList（残した並びを読む）', () => {
  it('読めない文字列と、並びでない値は空', () => {
    for (const raw of [null, '', '{', 'null', '{}', '"x"', '1']) {
      expect(parseList(raw, isStoredSong)).toEqual([]);
    }
  });

  it('形の違う要素だけを落とす', () => {
    const raw = JSON.stringify([song(1), null, { songId: '2' }, { songId: 3 }, song(4)]);
    expect(ids(parseList(raw, isStoredSong))).toEqual([1, 4]);
  });

  it('表紙や名前が欠けた昔の形の曲も落とさない（お気に入りの画面で引き直す）', () => {
    const raw = JSON.stringify([{ songId: 5, service: 'niconico', videoId: 'sm5' }]);
    expect(ids(parseList(raw, isStoredSong))).toEqual([5]);
  });

  it('ボカロPは id と名前があれば残す', () => {
    expect(isStoredProducer({ id: 1, name: 'P', picture: null })).toBe(true);
    expect(isStoredProducer({ id: '1', name: 'P' })).toBe(false);
    expect(isStoredProducer({ id: 1 })).toBe(false);
  });
});

describe('moveItem（お気に入りの曲を並べ替える）', () => {
  const list = [song(1), song(2), song(3), song(4)];
  const idOf = (s: QueueItem) => s.songId;

  it('動かした曲を、行き先の曲がいた位置へ入れる（前へも後ろへも）', () => {
    expect(ids(moveItem(list, 1, 3, idOf)!)).toEqual([2, 3, 1, 4]);
    expect(ids(moveItem(list, 4, 2, idOf)!)).toEqual([1, 4, 2, 3]);
  });

  it('無い曲か同じ曲なら動かさない', () => {
    expect(moveItem(list, 9, 1, idOf)).toBeNull();
    expect(moveItem(list, 2, 2, idOf)).toBeNull();
  });
});

describe('mergeFresh（お気に入りを引き直す）', () => {
  const idOf = (s: QueueItem) => s.songId;

  it('送った曲は新しい情報に替え、返ってこなかった曲は外し、待つあいだに足した曲は残す', () => {
    const fresh = { ...song(2), title: '新しい題' };
    const merged = mergeFresh([song(9), song(1), song(2)], [song(1), song(2)], [fresh], idOf);
    expect(merged).toEqual([song(9), fresh]);
  });
});

describe('視聴履歴', () => {
  it('新しい順に残し、もう一度聴いた曲は先頭へ移す', () => {
    for (const id of [1, 2, 3, 1]) addToHistory(song(id));
    expect(history()).toEqual([1, 3, 2]);
  });

  it('100曲までにする', () => {
    for (let id = 1; id <= 105; id++) addToHistory(song(id));
    expect(history()).toHaveLength(100);
    expect(history()[0]).toBe(105);
  });

  it('消したあとに戻すと、消したあとに聴いた曲は先頭に残る', () => {
    for (const id of [1, 2]) addToHistory(song(id));
    clearHistory();
    expect(storage.getItem('vocafy-history')).toBeNull();
    addToHistory(song(3));
    restoreHistory([song(2), song(1), song(3)]);
    expect(history()).toEqual([3, 2, 1]);
  });

  it('壊れた中身が残っていても、落ちずに足せる', () => {
    storage.setItem('vocafy-history', '{"broken":');
    addToHistory(song(1));
    expect(history()).toEqual([1]);
  });
});

describe('開き直したときに戻す控え', () => {
  const resume = {
    queue: [song(1), song(2)],
    index: 1,
    order: [0, 1],
    position: 30,
    duration: 200,
    owner: { kind: 'producer' as const, producerId: 1 },
  };

  it('残した控えを読む', () => {
    saveResume(resume);
    expect(readResume()).toMatchObject({ index: 1, position: 30, owner: resume.owner });
  });

  it('12時間を過ぎた控えは戻さない', () => {
    saveResume(resume);
    const raw = JSON.parse(storage.getItem('vocafy-resume')!) as { at: number };
    storage.setItem('vocafy-resume', JSON.stringify({ ...raw, at: Date.now() - 13 * 3_600_000 }));
    expect(readResume()).toBeNull();
  });

  it('壊れた控え・形の違う控え・持ち主をまとめる前の控えは戻さない', () => {
    const at = Date.now();
    for (const value of [
      'null',
      '{',
      JSON.stringify({ ...resume, at, queue: [{ songId: 1 }, song(2)] }),
      JSON.stringify({ ...resume, at, index: 5 }),
      JSON.stringify({ ...resume, at, order: [0] }),
      JSON.stringify({ ...resume, at, owner: undefined, context: 'list' }),
    ]) {
      storage.setItem('vocafy-resume', value);
      expect(readResume()).toBeNull();
    }
  });

  it('設定で「前回の続きから始める」を切っていれば戻さない', () => {
    saveResume(resume);
    setResumeEnabled(false);
    expect(readResume()).toBeNull();
    setResumeEnabled(true);
    expect(readResume()).not.toBeNull();
  });
});
