import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * スマホとタブレットの動画の画面（ボカロPの画面など）で、上に固定した動画・下の再生の帯と本文が重ならないことを、位置で確かめる。
 * 位置は html の印（data-watch・data-player など）と globals.css の変数の掛け合わせで決まり、組み合わせを1つ誤ると、
 * 見た目で気づくまで分からない（2026-10-13 に3件続いた: 最後の曲が帯の裏に隠れる・iPad の幅で題名が動画に接する・
 * 流している行へ送ると動画の裏に寄る）。
 *
 * 幅は、スマホ（Pixel 7 の 412px）と、md より狭い iPad の縦向き（744px）。どちらもスマホの組み立てになる
 */

// 縦は、fixture の4曲でも一覧が帯の裏まで届く高さに詰める
const SIZES = [
  { width: 412, height: 520 },
  { width: 744, height: 640 },
];

/** 動画の下端・題名の上端・最後の行の下端・帯の上端と、スクロールで行を見せる範囲（scroll-padding） */
async function measure(page: Page) {
  return page.evaluate(() => {
    const video = document.querySelector('[data-stage-video]');
    const rows = document.querySelectorAll('[id^="song-"]');
    const bar = document.querySelector('.chrome-bar');
    if (!video || rows.length === 0 || !bar) throw new Error('画面の部品が見つからない');
    const root = getComputedStyle(document.documentElement);
    return {
      videoBottom: video.getBoundingClientRect().bottom,
      // 動画の置き場所のすぐ次が題名（stage-layout.tsx の SwipeToLeave）
      headingTop: video.nextElementSibling?.getBoundingClientRect().top ?? 0,
      lastRowBottom: rows[rows.length - 1].getBoundingClientRect().bottom,
      barTop: bar.getBoundingClientRect().top,
      scrollPaddingTop: parseFloat(root.scrollPaddingTop) || 0,
      scrollPaddingBottom: parseFloat(root.scrollPaddingBottom) || 0,
      viewport: innerHeight,
    };
  });
}

for (const { width, height } of SIZES) {
  test(`幅 ${width}px の動画の画面で、題名・最後の曲・流している行が動画と帯に隠れない`, async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, '指で操作する端末の組み立て');
    await page.setViewportSize({ width, height });
    await page.goto('/producers/45');
    await page.getByRole('button', { name: 'このボカロPの曲を再生' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-player', 'slot');
    await expect(page.locator('html')).toHaveAttribute('data-watch', '');

    // 開いたとき: 題名は動画の下にある。押す前に Playwright がボタンを見える所へスクロールするので、先頭へ戻してから測る
    await page.evaluate(() => window.scrollTo(0, 0));
    const top = await measure(page);
    expect(top.headingTop).toBeGreaterThanOrEqual(top.videoBottom);

    // 流している行へ送るときの範囲は、動画の下から帯の上まで
    expect(top.scrollPaddingTop).toBeGreaterThanOrEqual(top.videoBottom);
    expect(top.viewport - top.scrollPaddingBottom).toBeLessThanOrEqual(top.barTop);

    // 一番下まで送ると、最後の曲は帯の上に出る
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect
      .poll(async () => {
        const m = await measure(page);
        return m.lastRowBottom <= m.barTop;
      })
      .toBe(true);
  });
}

test('再生の帯のつまみは、帯の中身に潜らず、つかめる', async ({ page }) => {
  // つまみは帯の上の縁に乗る。下半分が帯の中身に潜っていたころは、スマホでつまみをつかんで引くと
  // 帯の中身が受け取り、位置が動かなかった（2026-10-14、Android の Chrome で）
  await page.goto('/producers/45');
  await page.getByRole('button', { name: 'このボカロPの曲を再生' }).click();
  const slider = page.getByRole('slider', { name: '再生位置' });
  await expect(slider).toBeVisible();
  const hits = await slider.evaluate((el) => {
    const knob = el.querySelector('span.rounded-full');
    if (!knob) throw new Error('つまみが見つからない');
    const k = knob.getBoundingClientRect();
    // つまみの中心と、帯の中身に潜っていた下寄りの点
    return [k.top + k.height / 2, k.bottom - 1].map((y) =>
      el.contains(document.elementFromPoint(k.left + k.width / 2, y)),
    );
  });
  expect(hits).toEqual([true, true]);
});
