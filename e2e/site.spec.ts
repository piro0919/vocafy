import { expect, test } from '@playwright/test';

/**
 * 壊れやすい流れだけを確かめる。台帳は CI では db/fixture.sql（DECO＊27 の4曲）を使う。
 * 手元で本物の取り込みをした DB に向けても通るよう、曲名ではなく形で見る
 */

test('トップからボカロPの画面へ移り、その人の曲が並ぶ', async ({ page }) => {
  await page.goto('/');
  // きょうの日付の曲は、台帳によっては無い日がある。日替わりの並びは毎日出る
  await expect(page.getByRole('heading', { name: 'きょうの出会い' })).toBeVisible();
  await page.goto('/producers');
  // 合作の相手として名前だけ入った人は、一覧に出さない
  await expect(page.getByText('合作の相手')).toHaveCount(0);
  // 一覧は見えている段だけを描く（virtual-producer-grid.tsx）ので、手元の台帳で下のほうにいる人は押せない。
  // 名前ではなく、一覧の先頭の人を押して、その人の画面が開くことを見る
  const first = page.locator('[data-index] a').first();
  const name = (await first.locator('p span').first().textContent()) ?? '';
  await first.click();
  // ボカロPの画面はビルドのときに作らず、最初に開かれたときに作る。手元の台帳では、一覧に見えている人の画面を
  // 先読みがまとめて作り始めるので、サーバー1台だと押した画面ができるまで5秒を超えることがある
  await expect(page).toHaveURL(/\/producers\/\d+$/, { timeout: 20_000 });
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
});

test('ニコニコにしか本家が無い曲は、ニコニコのプレイヤーで流す', async ({ page }) => {
  await page.goto('/producers/45');
  // 手元の台帳には同じ名前の曲（ほかの版）もあるので、曲の id（VocaDB の 8478）の行で選ぶ。
  // 行には「◯◯をお気に入りに入れる」ボタンも並ぶので、曲名のあとにそれが続かないボタンを選ぶ
  await page
    .locator('#song-8478')
    .getByRole('button', { name: /罪と罰(?!をお気に入り)/ })
    .click();
  await expect(page.locator('[data-player-frame] iframe')).toHaveAttribute(
    'src',
    /embed\.nicovideo\.jp\/watch\/sm8166339/,
  );
});

test('再生を押すと、プレイヤーが画面の置き場所に出る', async ({ page }) => {
  await page.goto('/producers/45');
  await page.getByRole('button', { name: 'このボカロPの曲を再生' }).click();
  await expect(page.locator('[data-player-frame] iframe')).toHaveAttribute(
    'src',
    /youtube\.com\/embed\//,
  );
  await expect(page.locator('html')).toHaveAttribute('data-player', 'slot');
});

// 動画を大きく出すのは、流している並びの持ち主の画面だけ（player-rules.ts の owns）。戻る・進むや曲送りで、
// 大きく出したり右下の窓にしたりが食い違ったことが何度もあった
test('一覧を流すと再生用の画面で大きく出し、戻ると右下の窓、進むとまた大きく出す', async ({
  page,
}) => {
  await page.goto('/years/2016');
  await page.getByRole('button', { name: /^(再生|ピックアップ)$/ }).click();
  await expect(page).toHaveURL(/\/years\/2016\/play/);
  await expect(page.locator('html')).toHaveAttribute('data-player', 'slot');
  await page.goBack();
  await expect(page).toHaveURL(/\/years\/2016$/);
  await expect(page.locator('html')).toHaveAttribute('data-player', 'dock');
  await page.goForward();
  await expect(page.locator('html')).toHaveAttribute('data-player', 'slot');
});

test('曲の一覧から押すと、その人の画面で大きく出し、次の曲へ進んでも大きいまま', async ({
  page,
}) => {
  await page.goto('/years/2016');
  // 曲の行は「曲名 ボカロP ・ 歌声」の名前のボタン。ハートのボタンは名前に「・」を含まない
  await page.locator('main button').filter({ hasText: '・' }).first().click();
  await expect(page).toHaveURL(/\/producers\/\d+/);
  await expect(page.locator('html')).toHaveAttribute('data-player', 'slot');
  const before = page.url();
  await page.keyboard.press('Shift+N');
  // その人の曲の並びに差し替わっていれば、次の曲もこの画面の曲で、住所の ?song= が書き換わる
  await expect(page).not.toHaveURL(before);
  await expect(page).toHaveURL(/\/producers\/\d+\?song=\d+/);
  await expect(page.locator('html')).toHaveAttribute('data-player', 'slot');
});

test('ボカロPをお気に入りに入れると、お気に入りの画面に出て、外すと消える', async ({ page }) => {
  await page.goto('/producers/45');
  await page.getByRole('button', { name: 'DECO＊27をお気に入りに入れる' }).click();
  await expect(page.getByRole('button', { name: 'DECO＊27をお気に入りから外す' })).toBeVisible();
  await page.goto('/favorites');
  await expect(page.getByRole('link', { name: /DECO＊27/ })).toBeVisible();
  await page.goto('/producers/45');
  await page.getByRole('button', { name: 'DECO＊27をお気に入りから外す' }).click();
  await page.goto('/favorites');
  await expect(page.getByText('お気に入りはまだありません')).toBeVisible();
});

test('お気に入りの曲は、行をつかんで並べ替えられ、ただ押せば流れる', async ({ page, isMobile }) => {
  // 行のどこでもつかめるのはマウスの端末だけ（指の端末は取っ手だけで、曲の行のハートも出さない）
  test.skip(isMobile, 'マウスの端末だけの動き');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/producers/45');
  // 曲の行のハートは、指を乗せた行にだけ出る
  for (const i of [0, 1, 2]) {
    const row = page.locator('ol > li').nth(i);
    await row.hover();
    await row.getByRole('button', { name: /をお気に入りに入れる/ }).click();
  }
  await page.goto('/favorites/songs');
  const handles = page.getByRole('button', { name: /を並べ替える$/ });
  await expect(handles).toHaveCount(3);
  const order = () =>
    page.evaluate(() =>
      (JSON.parse(localStorage.getItem('vocafy-favorites') ?? '[]') as { songId: number }[]).map(
        (s) => s.songId,
      ),
    );
  const [a, b, c] = await order();
  // パソコンは行のどこでもつかめる（取っ手より左の、行の真ん中あたりを押す）
  const top = (await handles.nth(0).boundingBox())!;
  const bottom = (await handles.nth(2).boundingBox())!;
  const x = top.x - 300;
  await page.mouse.move(x, top.y + top.height / 2);
  await page.mouse.down();
  for (let y = top.y + top.height / 2; y <= bottom.y + bottom.height / 2 + 5; y += 4) {
    await page.mouse.move(x, y);
    // つかんだ行が付いてくるのは描き直しのあと。一度に動かすと、並びの入れ替えが追いつかない
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  await expect.poll(order).toEqual([b, c, a]);
  // つかんで動かしただけでは流れない
  await expect(page.locator('html')).toHaveAttribute('data-player', 'none');
  // 置いた直後に押すと流れなかった（理由は確かめていない。並べ替えの部品が引きずりの続きとして扱っているとみている）。
  // 人が押し直すくらいの間を空ける
  await page.waitForTimeout(500);
  await page.mouse.click(x, top.y + top.height / 2);
  await expect(page.locator('html')).toHaveAttribute('data-player', 'slot');
});

test('年の札から、その年の曲が並ぶ画面へ', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /^2016/ }).click();
  await expect(page).toHaveURL(/\/years\/2016$/);
  await expect(page.getByRole('heading', { level: 1, name: '2016年の曲' })).toBeVisible();
  // 月ごとの代表曲が並ぶ。どの曲が選ばれるかは台帳による。曲名ではなく、月の見出しと曲が並んでいるかを見る
  await expect(page.getByRole('heading', { level: 2, name: /^\d+月$/ }).first()).toBeVisible();
  await expect(page.locator('main button').first()).toBeVisible();
});

test('日付の画面に、その月日の曲が年ごとに並ぶ', async ({ page }) => {
  // 手元の DB でも CI の台帳（DECO＊27 の「ゴーストルール」が 2016-01-08）でも、1月8日の曲はある
  await page.goto('/days/01-08');
  await expect(page.getByRole('heading', { level: 1, name: '1月8日に生まれた曲' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: '2016' })).toBeVisible();
  const res = await page.goto('/days/13-01');
  expect(res?.status()).toBe(404);
});

test('歌声の画面が開く', async ({ page }) => {
  // 初音ミク（VocaDB の id は 1）。版の違いは、この画面にまとめて並ぶ
  await page.goto('/voices/1');
  await expect(page.getByRole('heading', { level: 1, name: '初音ミク' })).toBeVisible();
  // 全曲の一覧はやめ、年ごとの代表曲だけにした。ページ送りは無い（年ごとの全曲の画面にはある）
  expect((await page.goto('/voices/1/2'))?.status()).toBe(404);
  // 年の「すべて表示」から、その年の全曲へ。CI の台帳（db/fixture.sql）にある年を開く
  await page.goto('/voices/1/2016');
  await expect(page.getByRole('heading', { level: 1, name: '初音ミクの2016年の曲' })).toBeVisible();
});

test('検索で、曲名をひらがなで打ってもカタカナの曲が見つかる', async ({ page }) => {
  await page.goto('/search');
  await page.getByRole('searchbox', { name: '曲名・ボカロP・歌声の名前で探す' }).fill('ごーすと');
  // 手元の台帳では、ほかの版（アレンジなど）も一緒に見つかるので、1つ目を見る
  await expect(
    page.getByRole('button', { name: /ゴーストルール(?!.*をお気に入り)/ }).first(),
  ).toBeVisible();
});

test('流せない動画の知らせは、形の違う ID を断る', async ({ request }) => {
  // 生きているか消えたかの確かめは外の窓口に問い合わせるので、ここでは形の確かめだけを見る
  const res = await request.post('/api/unplayable', { data: { service: 'youtube', videoId: 'x' } });
  expect(res.status()).toBe(400);
});

test('無いボカロPは 404', async ({ page }) => {
  const res = await page.goto('/producers/123456789');
  expect(res?.status()).toBe(404);
});
