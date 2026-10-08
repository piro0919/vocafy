import { expect, test } from '@playwright/test';

/**
 * 壊れやすい流れだけを確かめる。台帳は CI では db/fixture.sql（DECO＊27 の4曲）を使う。
 * 手元で本物の取り込みをした DB に向けても通るよう、曲名ではなく形で見る
 */

test('トップからボカロPの画面へ移り、その人の曲が並ぶ', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '人気曲' })).toBeVisible();
  await page.goto('/producers');
  // 合作の相手として名前だけ入った人は、一覧に出さない
  await expect(page.getByText('合作の相手')).toHaveCount(0);
  await page
    .getByRole('link', { name: /DECO＊27/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/producers\/45$/);
  await expect(page.getByRole('heading', { level: 1, name: 'DECO＊27' })).toBeVisible();
});

test('ニコニコにしか本家が無い曲は、押せない', async ({ page }) => {
  await page.goto('/producers/45');
  await expect(page.getByRole('button', { name: /罪と罰/ })).toBeDisabled();
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

test('無いボカロPは 404', async ({ page }) => {
  const res = await page.goto('/producers/123456789');
  expect(res?.status()).toBe(404);
});
