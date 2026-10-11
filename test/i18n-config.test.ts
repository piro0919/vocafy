import { describe, expect, it } from 'vitest';
import { langOfPath, localize, stripLang } from '@/i18n/config';

describe('言語の住所', () => {
  it('日本語は住所を変えず、英語は頭に /en を付ける', () => {
    expect(localize('/producers/45', 'ja')).toBe('/producers/45');
    expect(localize('/producers/45?song=1', 'en')).toBe('/en/producers/45?song=1');
    expect(localize('/', 'en')).toBe('/en');
  });

  it('外のサイトの住所と、ページの中の印は変えない', () => {
    expect(localize('https://vocadb.net/', 'en')).toBe('https://vocadb.net/');
    expect(localize('//example.com/a', 'en')).toBe('//example.com/a');
    expect(localize('#top', 'en')).toBe('#top');
  });

  it('頭の言語を外す。サーバーが中で描く /ja も外す', () => {
    expect(stripLang('/en/producers/45')).toBe('/producers/45');
    expect(stripLang('/ja/home/2026-10-12/3')).toBe('/home/2026-10-12/3');
    expect(stripLang('/en')).toBe('/');
    expect(stripLang('/producers/45')).toBe('/producers/45');
    // 頭が en で始まる別の住所は外さない
    expect(stripLang('/english')).toBe('/english');
  });

  it('住所の頭から言語を読む', () => {
    expect(langOfPath('/en/voices')).toBe('en');
    expect(langOfPath('/en')).toBe('en');
    expect(langOfPath('/voices')).toBe('ja');
    expect(langOfPath('/ja/voices')).toBe('ja');
  });
});
