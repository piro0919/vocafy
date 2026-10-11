import { describe, expect, it, vi } from 'vitest';
import type { QueueItem } from '@/lib/catalog';
import { findRadioAdditions } from '@/components/player/use-radio-extension';

const song = (songId: number) => ({ songId }) as QueueItem;
const songs = (...ids: number[]) => ids.map(song);
const ids = (items: QueueItem[]) => items.map((s) => s.songId);

describe('findRadioAdditions（ラジオの並びを伸ばす）', () => {
  it('いまの曲の関連曲のうち、まだ並びに無い曲を返す', async () => {
    const related = vi.fn(async () => songs(1, 2, 9));
    expect(ids(await findRadioAdditions(songs(1, 2, 3), 1, related, () => true))).toEqual([9]);
    expect(related).toHaveBeenCalledWith(2);
  });

  it('いまの曲の関連曲がどれも並びにあれば、並びの後ろの曲からさかのぼって探す', async () => {
    const answers: Record<number, QueueItem[]> = { 1: songs(2, 3), 3: songs(1), 2: songs(7) };
    const related = vi.fn(async (id: number) => answers[id] ?? []);
    expect(ids(await findRadioAdditions(songs(1, 2, 3), 0, related, () => true))).toEqual([7]);
    expect(related.mock.calls.map(([id]) => id)).toEqual([1, 3, 2]);
  });

  it('聞くのは6曲まで。見つからなければ空', async () => {
    const related = vi.fn(async () => [] as QueueItem[]);
    expect(await findRadioAdditions(songs(1, 2, 3, 4, 5, 6, 7, 8), 0, related, () => true)).toEqual(
      [],
    );
    expect(related).toHaveBeenCalledTimes(6);
  });

  it('待っているあいだに並びが替わったら、やめて空を返す', async () => {
    let current = true;
    const related = vi.fn(async () => {
      current = false;
      return songs(9);
    });
    expect(await findRadioAdditions(songs(1, 2), 0, related, () => current)).toEqual([]);
    expect(related).toHaveBeenCalledTimes(1);
  });
});
