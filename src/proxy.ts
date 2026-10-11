import { type NextRequest, NextResponse } from 'next/server';
import { hourInJapan, today } from '@/lib/iso-date';

/**
 * トップ（`/` と英語の `/en`）に来た人に、日本のいまの日付と時のページ（`app/[lang]/home/[date]/[hour]`）を返す。住所はそのまま。
 * 中身は日付と時（大きな1曲だけが時で替わる）で決まるので、そのページを作り置き、時が進んだら次のページへ切り替える。
 * `/home/日付` を直に開かれたらトップへ送る。昔の日付のページを外から作らせないため
 */
export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const lang = url.pathname === '/en' || url.pathname.startsWith('/en/') ? 'en' : 'ja';
  const top = lang === 'en' ? '/en' : '/';
  if (url.pathname !== top) {
    url.pathname = top;
    return NextResponse.redirect(url);
  }
  url.pathname = `/${lang}/home/${today()}/${hourInJapan()}`;
  return NextResponse.rewrite(url);
}

// トップの住所だけで動かす。ほかの住所でも動かすと、画像なども含めて回数が何倍にもなり、料金が増える
export const config = {
  matcher: ['/', '/en', '/home/:path*', '/en/home/:path*'],
};
