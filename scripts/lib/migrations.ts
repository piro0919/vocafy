import { readdir } from 'node:fs/promises';

/** 表の変更のファイルを置く場所 */
export const MIGRATIONS_DIR = new URL('../../db/migrations/', import.meta.url);

/** db/migrations/ のファイル名から、番号順の名前の一覧へ。決まった形（0001_xxx.sql）のファイルだけを拾い、.sql は落とす */
export function migrationNames(files: string[]): string[] {
  return files
    .filter((file) => /^\d{4}_[a-z0-9_]+\.sql$/.test(file))
    .map((file) => file.replace(/\.sql$/, ''))
    .toSorted();
}

/** db/migrations/ にある表の変更の名前（番号順） */
export async function readMigrationNames(): Promise<string[]> {
  return migrationNames(await readdir(MIGRATIONS_DIR));
}
