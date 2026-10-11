/**
 * DB を読むテスト（test/db/）の接続先。手元の Postgres（compose.yaml）か、CI の Postgres の中に、テスト専用の DB を作って使う。
 * テストは表を空にしてから自分のデータを入れるので、取り込んだ台帳の DB（vocafy）は使わない
 */
const base = process.env.DATABASE_URL ?? 'postgres://vocafy:vocafy@localhost:5434/vocafy';

/** テスト用の DB を作り直すときにつなぐ先（同じサーバーの、取り込んだ台帳の DB） */
export const adminUrl = base;

/** テスト用の DB の名前。作り直すときに消すので、この名前の DB にしか使わない */
export const TEST_DB = 'vocafy_test';

const url = new URL(base);
url.pathname = `/${TEST_DB}`;
export const testUrl = url.href;
