import { describe, expect, it } from 'vitest';
import { dayLabel } from '@/lib/iso-date';

describe('dayLabel（きょうの日付の曲の札）', () => {
  it('同じ月日の曲は年だけ', () => {
    expect(dayLabel('2016-10-11', '2026-10-11')).toBe('2016');
  });

  it('前後の日から補った曲は年月日', () => {
    expect(dayLabel('2016-10-12', '2026-10-11')).toBe('2016.10.12');
  });
});
