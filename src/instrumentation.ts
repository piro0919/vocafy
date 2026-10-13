import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from '@/lib/sentry';

// サーバーで起きたエラーを Sentry に送る（ブラウザの分は instrumentation-client.ts）
export function register() {
  Sentry.init(sentryOptions());
}

export const onRequestError = Sentry.captureRequestError;
