/**
 * ページを描く前に <html data-theme> と <html data-voice> を付けるスクリプト。layout.tsx の <head> にそのまま埋め込む。
 * React が動き出してから色を決めると、開いた瞬間に暗い画面から明るい画面へちらつくため。
 * 選んだテーマは localStorage の THEME_KEY。'light' | 'dark' で、無ければ端末の設定に合わせる。
 * 選んだキャラの色は VOICE_KEY（voice.ts）。無ければ初音ミクで、data-voice を付けない
 */
export const THEME_KEY = 'vocafy-theme';
export const VOICE_KEY = 'vocafy-voice';

export const themeScript = `(() => {
  try {
    const pref = localStorage.getItem('${THEME_KEY}');
    const dark = pref ? pref === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    const voice = localStorage.getItem('${VOICE_KEY}');
    if (voice) document.documentElement.dataset.voice = voice;
  } catch {}
})();`;
