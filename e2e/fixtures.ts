import { test as base, expect, type Page } from '@playwright/test';

/**
 * E2E では本物の YouTube とニコニコを使わない（2026-10-12）。本物を使っていたころは、CI では YouTube の動画が流せずに
 * 次の曲へ勝手に進み、手元では流れるので、同じテストが CI と手元で違う動きをした。外への通信が遅いと落ちることもあった。
 *
 * - YouTube の仕組み（iframe_api）は、本物と同じ形でプレイヤーを作る偽物を返す。頼まれたら「再生中」を知らせ、
 *   一時停止を頼まれたら「一時停止」を知らせる。曲が終わったり流せなかったりはしないので、勝手に次の曲へは進まない
 * - 埋め込みのページ（YouTube・ニコニコ）は空のページを返す。テストは埋め込みの住所（src）で、どちらで流したかを見る
 *
 * 曲送りを確かめるテストは、Shift+N などで明示して送る
 */

/** YouTube の IFrame API の偽物。youtube.ts が使う分だけ */
const FAKE_IFRAME_API = `
(() => {
  const STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2 };
  class Player {
    constructor(el, options) {
      this.events = options.events || {};
      this.current = 0;
      this.iframe = document.createElement('iframe');
      el.replaceWith(this.iframe);
      if (options.videoId) this.show(options.videoId);
      setTimeout(() => this.events.onReady && this.events.onReady({ target: this }), 0);
    }
    show(id) {
      this.iframe.src = 'https://www.youtube.com/embed/' + id + '?enablejsapi=1';
    }
    state(data) {
      setTimeout(() => this.events.onStateChange && this.events.onStateChange({ data }), 0);
    }
    loadVideoById(id) { this.show(id); this.current = 0; this.state(STATE.PLAYING); }
    playVideo() { this.state(STATE.PLAYING); }
    pauseVideo() { this.state(STATE.PAUSED); }
    stopVideo() {}
    seekTo(seconds) { this.current = seconds; }
    getCurrentTime() { return this.current; }
    getDuration() { return 200; }
    setVolume() {}
    mute() {}
    unMute() {}
    unloadModule() {}
    destroy() { this.iframe.remove(); }
  }
  window.YT = { Player, PlayerState: STATE };
  if (window.onYouTubeIframeAPIReady) window.onYouTubeIframeAPIReady();
})();
`;

const BLANK = '<!doctype html><title>embed</title>';

/** 動画の仕組みを偽物に差し替える */
async function fakeVideos(page: Page) {
  await page.route('https://www.youtube.com/iframe_api', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: FAKE_IFRAME_API }),
  );
  await page.route('https://www.youtube.com/embed/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: BLANK }),
  );
  await page.route('https://embed.nicovideo.jp/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: BLANK }),
  );
}

export const test = base.extend({
  // 2つ目の引数は Playwright の「この値でテストを走らせる」関数。use という名前だと React のフックの規則に掛かるので、名前を替える
  page: async ({ page }, provide) => {
    await fakeVideos(page);
    await provide(page);
  },
});

export { expect };
