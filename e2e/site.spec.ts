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
  // 曲の行には「◯◯をお気に入りに入れる」ボタンも並ぶので、曲名のあとにそれが続かないボタンを選ぶ
  await page.getByRole('button', { name: /罪と罰(?!をお気に入り)/ }).click();
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

test('年の札から、その年の曲が並ぶ画面へ', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /^2016/ }).click();
  await expect(page).toHaveURL(/\/years\/2016$/);
  await expect(page.getByRole('heading', { level: 1, name: '2016年の曲' })).toBeVisible();
  // 曲が多い年はページに分かれ、どの曲が1ページ目に入るかは台帳による。曲名ではなく、曲が並んでいるかを見る
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

test('歌声の画面と、あいうえお順の行の画面が開く', async ({ page }) => {
  // 初音ミク（VocaDB の id は 1）。版の違いは、この画面にまとめて並ぶ
  await page.goto('/voices/1');
  await expect(page.getByRole('heading', { level: 1, name: '初音ミク' })).toBeVisible();
  // 全曲の一覧はやめ、年ごとの代表曲だけにした。ページ送りは無い（年ごとの全曲の画面にはある）
  expect((await page.goto('/voices/1/2'))?.status()).toBe(404);
  // 年の「すべて表示」から、その年の全曲へ。CI の台帳（db/fixture.sql）にある年を開く
  await page.goto('/voices/1/2016');
  await expect(page.getByRole('heading', { level: 1, name: '初音ミクの2016年の曲' })).toBeVisible();
  await page.goto('/kana/か');
  await expect(page.getByRole('heading', { level: 1, name: 'か行の曲' })).toBeVisible();
  const res = await page.goto('/kana/xyz');
  expect(res?.status()).toBe(404);
});

test('検索で、曲名をひらがなで打ってもカタカナの曲が見つかる', async ({ page }) => {
  await page.goto('/search');
  await page.getByRole('searchbox', { name: '曲名・ボカロP・歌声の名前で探す' }).fill('ごーすと');
  await expect(page.getByRole('button', { name: /ゴーストルール(?!をお気に入り)/ })).toBeVisible();
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
