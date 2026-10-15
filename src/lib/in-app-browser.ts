/**
 * LINE の中のブラウザで開かれたら、外のブラウザで開き直すための住所。
 * LINE の中のブラウザ（Android の WebView）は、ページで押した操作を YouTube の埋め込みの中の再生に渡さず、
 * 曲の行も帯の ▶ も最初の1曲を流せない。動画そのものを押したときだけ流れる（2026-10-15 に Pixel 9a の LINE で確かめた。Sentry の VOCAFY-3）。
 * LINE は住所に openExternalBrowser=1 が付いていると外のブラウザで開くので、それを付けた住所へ移る
 */
const EXTERNAL_PARAM = 'openExternalBrowser';

const LINE_AGENT = /\sLine\//;

/** 外のブラウザへ送る住所。LINE の中でないか、もう付けて開いた住所（外へ開けなかったとき）なら null */
export function externalBrowserUrl(href: string, agent: string): string | null {
  if (!LINE_AGENT.test(agent)) return null;
  const url = new URL(href);
  if (url.searchParams.has(EXTERNAL_PARAM)) return null;
  url.searchParams.set(EXTERNAL_PARAM, '1');
  return url.toString();
}

/** 外のブラウザで開いたあと、住所から印を外した住所。印が無ければ null */
export function withoutExternalParam(href: string): string | null {
  const url = new URL(href);
  if (!url.searchParams.has(EXTERNAL_PARAM)) return null;
  url.searchParams.delete(EXTERNAL_PARAM);
  return url.toString();
}
