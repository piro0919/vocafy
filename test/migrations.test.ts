import { describe, expect, it } from 'vitest';
import { migrationNames } from '../scripts/lib/migrations';

describe('migrationNames（表の変更のファイル名）', () => {
  it('決まった形のファイルだけを、番号順に、.sql を落として返す', () => {
    expect(
      migrationNames([
        '0002_b.sql',
        'README.md',
        '0001_a.sql',
        '0003_C.sql',
        '12_short.sql',
        '0004_d.sql.bak',
      ]),
    ).toEqual(['0001_a', '0002_b']);
  });
});
