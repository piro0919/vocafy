import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { MIGRATIONS_DIR, readMigrationNames } from '../../scripts/lib/migrations';
import { adminUrl, TEST_DB, testUrl } from './urls';

/**
 * テストの前に、テスト用の DB を空から作り直し、db/migrations/ を番号順に当てる。
 * 本番や手元の台帳と同じ表で確かめるため、表の作りを書き写さず migration をそのまま使う
 */
export default async function setup() {
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    await admin.query(`drop database if exists ${TEST_DB} with (force)`);
    await admin.query(`create database ${TEST_DB}`);
  } finally {
    await admin.end();
  }

  const names = await readMigrationNames();
  const client = new pg.Client({ connectionString: testUrl });
  await client.connect();
  try {
    for (const name of names) {
      await client.query(await readFile(new URL(`${name}.sql`, MIGRATIONS_DIR), 'utf8'));
    }
  } finally {
    await client.end();
  }
}
