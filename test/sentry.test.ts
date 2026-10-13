import { describe, expect, it, vi } from 'vitest';

vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://k@o1.ingest.sentry.io/1');

const { sentryLoaderUrl, sentryOptions } = await import('@/lib/sentry');

describe('sentryOptions', () => {
  it('1つのタブから送るのは10件まで', () => {
    const options = sentryOptions();
    const event = {};
    const sent = Array.from({ length: 15 }, () => options.beforeSend(event)).filter(Boolean);
    expect(sent).toHaveLength(10);
  });

  it('読み込み役の住所は DSN の公開鍵から作る', () => {
    expect(sentryLoaderUrl()).toBe('https://js.sentry-cdn.com/k.min.js');
  });
});
