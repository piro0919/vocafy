import { expect, test } from '@playwright/test';

/**
 * 再生の周りの機能（キーボード操作・次に流れる曲・履歴・設定）。台帳は CI では db/fixture.sql（DECO＊27 の4曲）。
 * 曲名ではなく形で見るので、手元の取り込んだ台帳に向けても通る
 */

test('? でキーボード操作の一覧を開き、Esc で閉じる', async ({ page }) => {
  await page.goto('/producers/45');
  await page.keyboard.press('?');
  const panel = page.getByRole('dialog', { name: 'キーボード操作' });
  await expect(panel).toBeVisible();
  await expect(panel.getByText('次に流れる曲')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
});

test('流しているあいだ、Q で次に流れる曲の板を開き、並びの曲が並ぶ', async ({ page }) => {
  await page.goto('/producers/45');
  // 何も流していないときは受けない
  await page.keyboard.press('q');
  await expect(page.getByRole('dialog', { name: '次に流れる曲' })).toHaveCount(0);
  await page.getByRole('button', { name: 'このボカロPの曲を再生' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-player', 'slot');
  await page.keyboard.press('q');
  const panel = page.getByRole('dialog', { name: '次に流れる曲' });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('button').filter({ hasText: 'DECO＊27' }).first()).toBeVisible();
});

test('履歴の画面に聴いた曲が並び、削除しても知らせから元に戻せる', async ({ page }) => {
  await page.addInitScript(() => {
    // 実際に鳴り始めた曲だけが残る（history-recorder.tsx）。CI では YouTube が鳴るのを待てないので、残した形を先に入れる
    if (localStorage.getItem('vocafy-history')) return;
    localStorage.setItem(
      'vocafy-history',
      JSON.stringify([
        {
          songId: 8478,
          title: '罪と罰',
          service: 'niconico',
          videoId: 'sm8166339',
          thumb: 'https://nicovideo.cdn.nimg.jp/thumbnails/8166339/8166339',
          producerId: 45,
          producerName: 'DECO＊27',
          vocalists: '初音ミク',
        },
      ]),
    );
  });
  await page.goto('/history');
  const row = page.locator('main button').filter({ hasText: '罪と罰' }).first();
  await expect(row).toBeVisible();
  await page.getByRole('button', { name: '履歴を削除' }).click();
  await expect(page.getByText('履歴はまだありません')).toBeVisible();
  await page.getByRole('button', { name: '元に戻す' }).click();
  await expect(row).toBeVisible();
});

test('サイトカラーとミニプレーヤーの位置は、選ぶとすぐ変わり、開き直しても残る', async ({
  page,
}) => {
  await page.goto('/settings');
  const html = page.locator('html');
  // 札は見えない radio を包んだ label。選ぶと色をフェードで切り替える（View Transitions）ので、押したあとは html の印で待つ
  const card = (name: string) =>
    page.locator('label').filter({ has: page.getByRole('radio', { name }) });
  await card('鏡音リン').click();
  await expect(html).toHaveAttribute('data-voice', 'rin');
  await card('左').click();
  await expect(html).toHaveAttribute('data-dock', 'left');

  await page.reload();
  await expect(html).toHaveAttribute('data-voice', 'rin');
  await expect(html).toHaveAttribute('data-dock', 'left');
  await expect(page.getByRole('radio', { name: '鏡音リン' })).toBeChecked();

  // 初音ミクに戻すと、印を外して既定の色にする
  await card('初音ミク').click();
  await expect(html).not.toHaveAttribute('data-voice', /.+/);
});
