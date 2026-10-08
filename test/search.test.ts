import { describe, expect, it } from 'vitest';
import { normalize, score } from '@/lib/search';

describe('normalize', () => {
  it('カタカナとひらがなを区別しない', () => {
    expect(normalize('ローリンガール')).toBe(normalize('ろーりんがーる'));
  });

  it('全角と半角、大文字と小文字を区別しない', () => {
    expect(normalize('ＤＥＣＯ＊２７')).toBe(normalize('deco27'));
    expect(normalize('ECHO')).toBe('echo');
  });

  it('空白と区切りの記号は無視する', () => {
    expect(normalize('ワールズエンド・ダンスホール')).toBe(normalize('ワールズエンドダンスホール'));
    expect(normalize('Bad ∞ End')).toContain('bad');
  });
});

describe('score', () => {
  it('頭から一致するものを、途中に含むものより先にする', () => {
    expect(score(normalize('千本桜'), normalize('千本'))).toBe(2);
    expect(score(normalize('「千本桜」ver.'), normalize('千本'))).toBe(2);
    expect(score(normalize('ゴーストルール'), normalize('ルール'))).toBe(1);
    expect(score(normalize('ゴーストルール'), normalize('メルト'))).toBe(0);
  });
});
