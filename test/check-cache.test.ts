import { describe, expect, it } from 'vitest';
import { staleIds } from '../scripts/lib/check-cache';

describe('staleIds（確かめ直す番号）', () => {
  const now = Date.parse('2026-10-12T00:00:00Z');
  const cache = {
    old: { at: '2026-09-01T00:00:00Z' },
    recent: { at: '2026-10-10T00:00:00Z' },
  };

  it('控えに無い番号と、30日たった番号を選ぶ。同じ番号は1回', () => {
    expect(staleIds(['new', 'old', 'recent', 'new'], cache, 30, now)).toEqual(['new', 'old']);
  });
});
