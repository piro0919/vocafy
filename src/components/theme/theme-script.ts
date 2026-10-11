/**
 * ページを描く前に <html data-theme> と <html data-voice> を付けるスクリプト。layout.tsx の <head> にそのまま埋め込む。
 * React が動き出してから色を決めると、開いた瞬間に暗い画面から明るい画面へちらつくため。
 * 選んだテーマは localStorage の THEME_KEY。'light' | 'dark' で、無ければ端末の設定に合わせる。
 * 選んだキャラの色は VOICE_KEY（voice.ts）。無ければ初音ミクで、data-voice を付けない。
 * 開くたびに変える設定（VOICE_POOL_KEY。選んだキャラを「,」でつないだもの）があれば、その中から前回と違う色を引いて VOICE_KEY に残す
 */
export const THEME_KEY = 'vocafy-theme';
export const VOICE_KEY = 'vocafy-voice';
export const VOICE_POOL_KEY = 'vocafy-voice-pool';

export const themeScript = `(() => {
  try {
    const pref = localStorage.getItem('${THEME_KEY}');
    const dark = pref ? pref === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    let voice = localStorage.getItem('${VOICE_KEY}') || 'miku';
    const pool = (localStorage.getItem('${VOICE_POOL_KEY}') || '').split(',').filter(Boolean);
    if (pool.length) {
      const rest = pool.length > 1 ? pool.filter((v) => v !== voice) : pool;
      voice = rest[Math.floor(Math.random() * rest.length)];
      if (voice === 'miku') localStorage.removeItem('${VOICE_KEY}');
      else localStorage.setItem('${VOICE_KEY}', voice);
    }
    if (voice !== 'miku') document.documentElement.dataset.voice = voice;
  } catch {}
})();`;
