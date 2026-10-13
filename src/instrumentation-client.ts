import { sentryLoaderUrl, sentryOptions } from '@/lib/sentry';

// ブラウザで起きたエラーと、押したのに鳴らなかった曲（components/player/watch.ts）を Sentry に送る。
// SDK を束ねると、配る JavaScript が圧縮後で 130〜150KB 増えた（Next.js の束ね方では使わない部分を落としきれない）ので、
// Sentry の読み込み役だけを置き、本体は送るときにだけ読み込む（src/lib/sentry.ts）。サーバーの側は instrumentation.ts
const loader = sentryLoaderUrl();
if (loader) {
  window.sentryOnLoad = () =>
    window.Sentry?.init({
      ...sentryOptions(),
      // 拡張機能の中で起きたエラーは、こちらでは直せない
      denyUrls: [/^(?:chrome|moz|safari(?:-web)?)-extension:\/\//],
    });
  const script = document.createElement('script');
  script.src = loader;
  script.crossOrigin = 'anonymous';
  document.head.append(script);
}
