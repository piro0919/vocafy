import { defineConfig, devices } from '@playwright/test';

/**
 * ブラウザを動かして、壊れやすい動き（ボカロPの画面・再生）を確かめる。
 * 本番と同じ作りで見るため、ビルドしてから起動する。ビルドは1回だけ
 */
const port = 3311;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `pnpm build && pnpm start -p ${port}`,
    // 手元の開発サーバー（.next）を上書きしないよう、別のフォルダにビルドする（next.config.ts の distDir）
    env: { NEXT_DIST_DIR: '.next-e2e' },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
