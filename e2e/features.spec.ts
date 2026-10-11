import { expect, test } from './fixtures';

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

test('共有の板に送り先が並び、QRコードに切り替えて戻れる', async ({ page, isMobile }) => {
  // 指の端末では、板を出さずに端末の共有の窓を開く
  test.skip(isMobile, 'マウスの端末だけの板');
  await page.goto('/producers/45');
  await page.getByRole('button', { name: /を共有$/ }).click();
  const menu = page.getByRole('menu');
  const x = menu.getByRole('menuitem', { name: 'X' });
  await expect(x).toHaveAttribute('href', /^https:\/\/x\.com\/intent\/post\?.*hashtags=Vocafy/);
  await expect(x).toHaveAttribute('href', /producers%2F45/);
  await expect(menu.getByRole('menuitem', { name: 'リンクをコピー' })).toBeVisible();
  await menu.getByRole('menuitem', { name: 'QRコード' }).click();
  await expect(menu.getByRole('img', { name: /QR コード$/ })).toBeVisible();
  await menu.getByRole('button', { name: '共有の一覧に戻る' }).click();
  await expect(x).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
});

test('スリープタイマーを選ぶと残りが出て、切ると元に戻る', async ({ page }) => {
  await page.goto('/producers/45');
  await page.getByRole('button', { name: 'このボカロPの曲を再生' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-player', 'slot');
  const timer = page
    .getByRole('button', { name: /^スリープタイマー/ })
    .locator('visible=true')
    .first();
  await timer.click();
  const panel = page.getByRole('dialog', { name: 'スリープタイマー' });
  await panel.getByRole('button', { name: '30分' }).click();
  await expect(panel).toBeHidden();
  await expect(timer).toHaveAccessibleName(/あと(30|29)分で止まります/);
  await timer.click();
  await panel.getByRole('button', { name: 'タイマーを切る' }).click();
  await expect(timer).toHaveAccessibleName('スリープタイマー');
});

test('開き直すと、前の曲が止まった状態で戻り、押すとその曲から流れる', async ({ page }) => {
  await page.goto('/producers/45');
  await page.getByRole('button', { name: 'このボカロPの曲を再生' }).click();
  await expect(page).toHaveURL(/song=\d+/);
  await page.reload();
  // 勝手には流さない。プレイヤーを作らず、その曲の表紙と再生ボタンを、持ち主の画面なら大きな動画の場所に出す
  const resume = page.getByRole('button', { name: /の続きを再生$/ }).first();
  await expect(resume).toBeVisible();
  await expect(page.locator('[data-player-frame] iframe')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-player', 'slot');
  await resume.click();
  await expect(page.locator('[data-player-frame] iframe')).toHaveCount(1);
});

test('持ち主でない画面で開き直したときは、右下の窓の場所に戻す', async ({ page }) => {
  await page.goto('/producers/45');
  await page.getByRole('button', { name: 'このボカロPの曲を再生' }).click();
  await expect(page).toHaveURL(/song=\d+/);
  await page.goto('/years');
  await expect(page.locator('html')).toHaveAttribute('data-player', 'dock');
  await page.reload();
  await expect(page.getByRole('button', { name: /の続きを再生$/ }).first()).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-player', 'dock');
});

test('設定で「前回の続きから始める」を切ると、開き直しても戻さない', async ({ page }) => {
  await page.goto('/producers/45');
  await page.getByRole('button', { name: 'このボカロPの曲を再生' }).click();
  await expect(page).toHaveURL(/song=\d+/);
  await page.goto('/settings');
  await page.getByText('前回の続きから始める').click();
  await page.goto('/producers/45');
  await expect(page.getByRole('button', { name: 'このボカロPの曲を再生' })).toBeVisible();
  await expect(page.getByRole('button', { name: /の続きを再生$/ })).toHaveCount(0);
});
