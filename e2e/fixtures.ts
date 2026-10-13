import { test as base, expect, type Page } from '@playwright/test';

/**
 * E2E では本物の YouTube とニコニコを使わない（2026-10-12）。本物を使っていたころは、CI では YouTube の動画が流せずに
 * 次の曲へ勝手に進み、手元では流れるので、同じテストが CI と手元で違う動きをした。外への通信が遅いと落ちることもあった。
 *
 * - YouTube の仕組み（iframe_api）は、本物と同じ形でプレイヤーを作る偽物を返す。頼まれたら「再生中」を知らせ、
 *   一時停止を頼まれたら「一時停止」を知らせる。曲が終わったり流せなかったりはしないので、勝手に次の曲へは進まない
 * - YouTube の埋め込みのページは空のページを返す。テストは埋め込みの住所（src）で、どちらで流したかを見る
 * - ニコニコの埋め込みのページは、niconico.ts が使う分の知らせをやりとりする偽物を返す（2026-10-13）。読み込めたら知らせ、
 *   play で「再生中」、pause で「一時停止」、seek で位置を知らせる。届いた知らせの名前は埋め込みの中の window.__received に残す。
 *   住所の from（秒）から始める
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

/** ニコニコの埋め込みのページの偽物。niconico.ts が使う分だけ */
const FAKE_NICONICO_EMBED = `<!doctype html><title>embed</title><script>
(() => {
  const params = new URLSearchParams(location.search);
  const playerId = params.get('playerId');
  const DURATION = 200000;
  let current = Number(params.get('from') || 0) * 1000;
  window.__received = [];
  const post = (eventName, data) => parent.postMessage({ eventName, playerId, data }, '*');
  const status = (playerStatus) => post('statusChange', { playerStatus, seekStatus: 0 });
  const meta = () => post('playerMetadataChange', { currentTime: current, duration: DURATION });
  addEventListener('message', (e) => {
    const { eventName, data } = e.data || {};
    if (!eventName) return;
    window.__received.push(eventName);
    if (eventName === 'play') { status(2); meta(); }
    if (eventName === 'pause') status(3);
    if (eventName === 'seek') { current = data.time; meta(); }
  });
  post('loadComplete', { videoInfo: { watchId: location.pathname.split('/').pop() } });
  meta();
})();
</script>`;

/** 動画の仕組みを偽物に差し替える */
async function fakeVideos(page: Page) {
  await page.route('https://www.youtube.com/iframe_api', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: FAKE_IFRAME_API }),
  );
  await page.route('https://www.youtube.com/embed/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: BLANK }),
  );
  await page.route('https://embed.nicovideo.jp/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: FAKE_NICONICO_EMBED }),
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
