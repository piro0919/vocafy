import { describe, expect, it } from 'vitest';
import { canonical, canonicalOnly, isIndexedProducer, MIN_INDEXED_SONGS } from '@/lib/site';

describe('検索に渡す住所', () => {
  it('正規の住所と一緒に、日本語・英語・既定の住所を hreflang として返す', () => {
    expect(canonical('/producers/45', 'en')).toEqual({
      canonical: 'https://vocafy.kkweb.io/en/producers/45',
      languages: {
        ja: 'https://vocafy.kkweb.io/producers/45',
        en: 'https://vocafy.kkweb.io/en/producers/45',
        'x-default': 'https://vocafy.kkweb.io/producers/45',
      },
    });
  });

  it('トップは英語が /en になる', () => {
    expect(canonical('/', 'ja').languages).toEqual({
      ja: 'https://vocafy.kkweb.io/',
      en: 'https://vocafy.kkweb.io/en',
      'x-default': 'https://vocafy.kkweb.io/',
    });
  });

  it('別の住所を指すだけのページには hreflang を付けない', () => {
    expect(canonicalOnly('/producers', 'en')).toEqual({
      canonical: 'https://vocafy.kkweb.io/en/producers',
    });
  });

  it('曲の少ないボカロPは検索に載せない', () => {
    expect(isIndexedProducer(MIN_INDEXED_SONGS - 1)).toBe(false);
    expect(isIndexedProducer(MIN_INDEXED_SONGS)).toBe(true);
  });
});
