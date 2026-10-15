import { describe, expect, it } from 'vitest';
import { externalBrowserUrl, withoutExternalParam } from '@/lib/in-app-browser';

// Sentry の VOCAFY-3 に届いた LINE の中のブラウザと、ふつうの Chrome
const LINE =
  'Mozilla/5.0 (Linux; Android 13; SCG01 Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0.0.0 Mobile Safari/537.36 Line/26.15.1/IAB';
const LINE_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/26.15.1';
const CHROME =
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36';

describe('externalBrowserUrl', () => {
  it('LINE の中のブラウザなら、印を付けた同じ住所を返す', () => {
    expect(externalBrowserUrl('https://vocafy.kkweb.io/producers/45?song=1', LINE)).toBe(
      'https://vocafy.kkweb.io/producers/45?song=1&openExternalBrowser=1',
    );
    expect(externalBrowserUrl('https://vocafy.kkweb.io/', LINE_IOS)).toBe(
      'https://vocafy.kkweb.io/?openExternalBrowser=1',
    );
  });

  it('LINE の外では送らない', () => {
    expect(externalBrowserUrl('https://vocafy.kkweb.io/', CHROME)).toBeNull();
  });

  it('印を付けて開いても LINE の中に残ったときは、もう送らない（繰り返し読み込まないため）', () => {
    expect(externalBrowserUrl('https://vocafy.kkweb.io/?openExternalBrowser=1', LINE)).toBeNull();
  });
});

describe('withoutExternalParam', () => {
  it('印だけを外し、ほかの ?以降は残す', () => {
    expect(
      withoutExternalParam('https://vocafy.kkweb.io/producers/45?song=1&openExternalBrowser=1'),
    ).toBe('https://vocafy.kkweb.io/producers/45?song=1');
  });

  it('印が無ければ何もしない', () => {
    expect(withoutExternalParam('https://vocafy.kkweb.io/producers/45')).toBeNull();
  });
});
