import { describe, expect, it } from 'vitest';
import { displayTitle, englishTitle } from '@/lib/english-name';

describe('englishTitle', () => {
  it('片仮名と英字だけの曲名は、英語の名前を出す', () => {
    expect(englishTitle('ワールドイズマイン', 'World is Mine', null)).toEqual({
      main: 'World is Mine',
    });
    expect(englishTitle('ゴーストルール', null, 'Gosuto Ruru')).toEqual({ main: 'Gosuto Ruru' });
  });

  it('漢字やひらがなを含む曲名は、ローマ字を主にして英語の訳を添える', () => {
    expect(englishTitle('千本桜', 'A Thousand Cherry Blossoms', 'Senbonzakura')).toEqual({
      main: 'Senbonzakura',
      sub: 'A Thousand Cherry Blossoms',
    });
    expect(englishTitle('えねみぃ', null, 'Enemii')).toEqual({ main: 'Enemii' });
    expect(englishTitle('砂の惑星', 'DUNE', null)).toEqual({ main: 'DUNE' });
  });

  it('英語の訳がローマ字と同じなら添えない', () => {
    expect(
      englishTitle('脳漿炸裂ガール', 'Noushou Sakuretsu Girl', 'Noushou Sakuretsu Girl'),
    ).toEqual({
      main: 'Noushou Sakuretsu Girl',
    });
  });

  it('英字だけの曲名と、名前の無い曲名は、そのまま出す（undefined）', () => {
    expect(englishTitle('KING', null, null)).toBeUndefined();
    expect(englishTitle('有明の月。', null, null)).toBeUndefined();
  });
});

describe('displayTitle', () => {
  const song = { title: '千本桜', en: { main: 'Senbonzakura', sub: 'A Thousand Cherry Blossoms' } };

  it('日本語の画面は曲名だけ', () => {
    expect(displayTitle(song, 'ja')).toEqual({ main: '千本桜' });
  });

  it('英語の画面は英語の名前を主にし、日本語の曲名を添える。英語の名前の無い曲は日本語のまま', () => {
    expect(displayTitle(song, 'en')).toEqual({
      main: 'Senbonzakura',
      sub: 'A Thousand Cherry Blossoms',
      ja: '千本桜',
    });
    expect(displayTitle({ title: '有明の月。' }, 'en')).toEqual({ main: '有明の月。' });
  });
});
