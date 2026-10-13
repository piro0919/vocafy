// env.ts を通さずに読む。通すと、ブラウザに検査の仕組み（zod）まで配ることになる。値の形はビルドのときに env.ts が確かめている
const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

/** 1つのタブ（サーバーなら1つのプロセス）から送る数の上限。無料の枠（組織全体で月 5,000 件）を1つの不具合で使い切らないため */
const MAX_EVENTS = 10;

/**
 * Sentry の設定のうち、ブラウザとサーバーで共通のもの（2026-10-14）。DSN が無い手元と CI では送らない。
 * 性能の計測と画面の録画は使わない（送る量を増やさないため）
 */
export function sentryOptions() {
  let sent = 0;
  return {
    dsn: DSN,
    enabled: Boolean(DSN),
    // 本番・プレビューを分ける。Vercel の外（手元）は development
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend<T>(event: T): T | null {
      if (sent >= MAX_EVENTS) return null;
      sent += 1;
      return event;
    },
  };
}

/**
 * ブラウザの Sentry の読み込み役（Loader Script）の住所。DSN の公開鍵から決まる。
 * 読み込み役は 1KB ほどで、本体（圧縮後 30KB ほど）はエラーか再生の失敗を送るときにだけ読み込む。
 * 読み込み役の設定（本体の版・性能の計測と画面の録画を切る）は、Sentry の vocafy のプロジェクトの Client Keys にある
 */
export function sentryLoaderUrl(): string | null {
  if (!DSN) return null;
  return `https://js.sentry-cdn.com/${new URL(DSN).username}.min.js`;
}

/** 読み込み役が window.Sentry に置く窓口のうち、使う分。本体を読み込むまでは呼び出しを溜めておき、読み込んだら流す */
type SentryApi = {
  init(options: Record<string, unknown>): void;
  addBreadcrumb(breadcrumb: { category: string; message: string; data?: object }): void;
  captureMessage(
    message: string,
    context: {
      level: 'warning';
      tags: Record<string, string | boolean>;
      contexts: Record<string, Record<string, unknown>>;
      fingerprint: string[];
    },
  ): void;
};

declare global {
  interface Window {
    Sentry?: SentryApi;
    sentryOnLoad?: () => void;
  }
}
