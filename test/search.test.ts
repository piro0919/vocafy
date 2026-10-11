import { describe, expect, it } from 'vitest';
import { foldLong, normalize, normalizeRomaji, score, searchable } from '@/lib/search';

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

describe('normalizeRomaji', () => {
  it('長音の記号と空白を外し、記号なしで打っても当たるようにする', () => {
    expect(normalizeRomaji('Roshin Yūkai')).toBe('roshinyukai');
    expect(score(normalizeRomaji('Senbonzakura'), normalize('senbon'))).toBe(2);
  });
});

describe('foldLong', () => {
  it('伸ばす音の書き方の揺れをならす', () => {
    const forms = ['Shoushitsu', 'Shoshitsu', 'Shōshitsu', 'Shooshitsu'].map(normalizeRomaji);
    expect(new Set(forms).size).toBe(1);
    expect(foldLong(normalize('Roshin Yuukai'))).toBe(normalizeRomaji('Roshin Yūkai'));
  });
});

describe('searchable', () => {
  it('かな・英数字の1文字では探さない', () => {
    for (const q of ['あ', 'a', '7', 'ー']) expect(searchable(normalize(q))).toBe(false);
    expect(searchable(normalize('ア'))).toBe(false);
    expect(searchable(normalize('Ａ'))).toBe(false);
  });

  it('漢字や記号の1文字、2文字からは探す', () => {
    for (const q of ['嘘', '🐈', '∞', 'ia', 'あい']) expect(searchable(normalize(q))).toBe(true);
  });

  it('空では探さない', () => {
    expect(searchable('')).toBe(false);
  });
});
