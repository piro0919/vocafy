// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * ブラウザの側のログイン（auth-client.ts）。ログインしたことのある端末の印の付け外しと、Google でのログイン・ログアウトの頼み方。
 * Better Auth のブラウザの窓口は差し替える
 */

const client = vi.hoisted(() => ({
  signIn: { social: vi.fn(async () => ({})) },
  signOut: vi.fn(async () => ({})),
}));
vi.mock('better-auth/react', () => ({ createAuthClient: () => client }));

const { hasSignInHint, setSignInHint, signIn, signOut } = await import('@/lib/auth-client');

beforeEach(() => {
  localStorage.clear();
  client.signIn.social.mockClear();
  client.signOut.mockClear();
  window.history.replaceState(null, '', '/producers/45');
});

describe('auth-client', () => {
  it('ログインしたことのない端末には印が無い。付けて外せる', () => {
    expect(hasSignInHint()).toBe(false);
    setSignInHint(true);
    expect(hasSignInHint()).toBe(true);
    setSignInHint(false);
    expect(hasSignInHint()).toBe(false);
  });

  it('ログインは印を付けてから、いまの画面へ戻ってくるよう Google に頼む', async () => {
    await signIn();
    expect(hasSignInHint()).toBe(true);
    expect(client.signIn.social).toHaveBeenCalledWith({
      provider: 'google',
      callbackURL: 'http://localhost:3000/producers/45',
    });
  });

  it('ログアウトしたら印を外す（次からセッションを聞きに行かない）', async () => {
    setSignInHint(true);
    await signOut();
    expect(client.signOut).toHaveBeenCalledTimes(1);
    expect(hasSignInHint()).toBe(false);
  });

  it('localStorage が使えないブラウザでも止まらない（印は無い扱い）', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(hasSignInHint()).toBe(false);
    expect(() => setSignInHint(true)).not.toThrow();
    getItem.mockRestore();
    setItem.mockRestore();
  });
});
