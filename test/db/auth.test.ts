import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { makeSignature } from 'better-auth/crypto';
import { addUser, query } from './seed';

/**
 * ログイン（src/lib/auth.ts と /api/auth）。Better Auth は本物を使い、セッションはテスト用の DB に直に作って、
 * 署名した Cookie で要求を送る。Google には聞かない。確かめるのは、鍵の有る無しでの動きと、要求からユーザーを引くこと
 */

const SECRET = 'test-secret-that-is-at-least-32-chars';
const KEYS = {
  BETTER_AUTH_SECRET: SECRET,
  BETTER_AUTH_URL: 'http://localhost:3100',
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
};

/** 環境変数を入れ替えて読み込み直す（env.ts と auth.ts は読み込んだときの値を持つ） */
async function load(keys: boolean) {
  vi.resetModules();
  for (const [name, value] of Object.entries(KEYS)) vi.stubEnv(name, keys ? value : '');
  return {
    auth: await import('@/lib/auth'),
    route: await import('@/app/api/auth/[...all]/route'),
  };
}
afterEach(() => vi.unstubAllEnvs());

/** テスト用の DB にセッションを作り、Better Auth の Cookie の形（値.署名）にする */
async function sessionCookie(userId: string, expires = new Date(Date.now() + 60 * 60 * 1000)) {
  const token = `token-${userId}-${expires.getTime()}`;
  await query(
    `insert into session (id, token, "userId", "expiresAt", "createdAt", "updatedAt")
     values ($1, $2, $3, $4, now(), now())`,
    [`s-${token}`, token, userId, expires],
  );
  const signed = `${token}.${await makeSignature(token, SECRET)}`;
  return `better-auth.session_token=${encodeURIComponent(signed)}`;
}
const request = (cookie?: string) =>
  new Request('http://localhost:3100/api/favorites', cookie ? { headers: { cookie } } : {});

beforeAll(async () => {
  await query('truncate "user" cascade');
  await addUser('u1');
});

describe('userIdOf（要求からログインしているユーザーを引く）', () => {
  it('ログインの鍵が無い環境（CI など）では、聞かずにログインしていない扱い', async () => {
    const { auth } = await load(false);
    expect(await auth.userIdOf(request(await sessionCookie('u1')))).toBeNull();
  });

  it('有効なセッションの Cookie があれば、そのユーザーの id', async () => {
    const { auth } = await load(true);
    expect(await auth.userIdOf(request(await sessionCookie('u1')))).toBe('u1');
  });

  it('Cookie が無い・署名が合わない・期限が切れているときは null', async () => {
    const { auth } = await load(true);
    expect(await auth.userIdOf(request())).toBeNull();
    expect(
      await auth.userIdOf(request('better-auth.session_token=forged.c2lnbmF0dXJl')),
    ).toBeNull();
    const expired = await sessionCookie('u1', new Date(Date.now() - 1000));
    expect(await auth.userIdOf(request(expired))).toBeNull();
  });
});

describe('/api/auth（ログインの受け口）', () => {
  it('鍵があれば Better Auth が答える', async () => {
    const { route } = await load(true);
    const res = await route.GET(new Request('http://localhost:3100/api/auth/ok'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('ログインのセッションを返す。Cookie が無ければ null', async () => {
    const { route } = await load(true);
    const signedIn = await route.GET(
      new Request('http://localhost:3100/api/auth/get-session', {
        headers: { cookie: await sessionCookie('u1') },
      }),
    );
    expect(((await signedIn.json()) as { user: { id: string } }).user.id).toBe('u1');
    const anonymous = await route.GET(new Request('http://localhost:3100/api/auth/get-session'));
    expect(await anonymous.json()).toBeNull();
  });

  it('鍵が無ければ、足りない鍵の名前を挙げて止まる', async () => {
    const { route } = await load(false);
    await expect(route.GET(new Request('http://localhost:3100/api/auth/ok'))).rejects.toThrow(
      /BETTER_AUTH_SECRET・GOOGLE_CLIENT_ID・GOOGLE_CLIENT_SECRET/,
    );
  });
});
