/**
 * トップの画面か。トップは住所が `/` のまま、中身を日付と時のページ（`/home/日付/時`）から返す（proxy.ts）。
 * サーバーはそのページを `/home/...` として作り置き、ブラウザは `/` として描くので、`/` だけを見ると両者で食い違い、
 * React がサーバーの HTML を捨てて作り直していた（2026-10-12 に React のエラー #418 で分かった）。どちらもトップとして扱う
 */
export function isHomePath(pathname: string): boolean {
  return pathname === '/' || pathname.startsWith('/home/');
}
