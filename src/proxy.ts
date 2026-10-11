import { type NextRequest, NextResponse } from 'next/server';
import { today } from '@/lib/iso-date';

/**
 * トップ（`/`）に来た人に、日本のきょうの日付のページ（`app/home/[date]`）を返す。住所は `/` のまま。
 * 中身が日付だけで決まるので、日付ごとのページを作り置き、0時を過ぎたら次の日のページへ切り替える。
 * `/home/日付` を直に開かれたら `/` へ送る。昔の日付のページを外から作らせないため
 */
export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  if (url.pathname !== '/') {
    url.pathname = '/';
    return NextResponse.redirect(url);
  }
  url.pathname = `/home/${today()}`;
  return NextResponse.rewrite(url);
}

// トップの住所だけで動かす。ほかの住所でも動かすと、画像なども含めて回数が何倍にもなり、料金が増える
export const config = {
  matcher: ['/', '/home/:path*'],
};
