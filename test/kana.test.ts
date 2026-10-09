import { describe, expect, it } from 'vitest';
import { rowOf } from '@/lib/kana';

describe('rowOf', () => {
  it('かなで始まる曲名は、その字の行', () => {
    expect(rowOf('ローリンガール')).toBe('ら');
    expect(rowOf('ぽっかんカラー')).toBe('は');
    expect(rowOf('ヴァンパイア')).toBe('あ');
    expect(rowOf('ゴーストルール')).toBe('か');
  });

  it('頭の記号やかっこは飛ばす', () => {
    expect(rowOf('「アンドロイドガール」')).toBe('あ');
    expect(rowOf('*ハロー、プラネット。')).toBe('は');
  });

  it('半角のカタカナも、全角と同じ行', () => {
    expect(rowOf('ﾓｻﾞｲｸﾛｰﾙ')).toBe('ま');
  });

  it('英字で始まる曲名は、5字ずつの行', () => {
    expect(rowOf('ECHO')).toBe('a-e');
    expect(rowOf('"bye-bye" by my 愛')).toBe('a-e');
    expect(rowOf('Just Be Friends')).toBe('f-j');
    expect(rowOf('magnet')).toBe('k-o');
    expect(rowOf('Tell Your World')).toBe('p-t');
    expect(rowOf('Zero')).toBe('u-z');
  });

  it('飾りの付いた英字は、元の字の行', () => {
    expect(rowOf('ÅMARA(大未来電脳)')).toBe('a-e');
  });

  it('数字で始まる曲名は 0-9。全角の数字も同じ', () => {
    expect(rowOf('39')).toBe('0-9');
    expect(rowOf('１８歳')).toBe('0-9');
  });

  it('漢字で始まる曲名は、ローマ字の曲名の頭の字で決める', () => {
    expect(rowOf('千本桜', 'Senbonzakura')).toBe('さ');
    expect(rowOf('炉心融解', 'Roshin Yuukai')).toBe('ら');
    expect(rowOf('六兆年と一夜物語', 'Rokuchounen to Ichiya Monogatari')).toBe('ら');
    expect(rowOf('東京テディベア', 'Tokyo Teddy Bear')).toBe('た');
    expect(rowOf('脳漿炸裂ガール', 'Nousou Sakuretsu Girl')).toBe('な');
  });

  it('読みの分からない曲名は etc', () => {
    expect(rowOf('千本桜')).toBe('etc');
    expect(rowOf('롤링 걸')).toBe('etc');
    expect(rowOf('…')).toBe('etc');
  });
});
