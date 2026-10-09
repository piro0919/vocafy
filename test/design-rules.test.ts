import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 見た目の決まり（CLAUDE.md の「見た目」）から外れた書き方を見つける。ボタンや部品をその場で書き起こすと、
 * 少しずつ違う形が増えた（2026-10-09 に洗い出して直した）。決まりを変えるときは、ここも一緒に変える
 */

const ROOT = join(import.meta.dirname, '..', 'src');
const files = readdirSync(ROOT, { recursive: true, encoding: 'utf8' })
  .filter((f) => /\.(tsx|ts)$/.test(f))
  .map((f) => ({ path: f, lines: readFileSync(join(ROOT, f), 'utf8').split('\n') }));

/** 決まりに合わない行を「ファイル:行」で集める。コメントの行は見ない */
function offenders(test: (line: string) => boolean, allow: string[] = []): string[] {
  return files.flatMap(({ path, lines }) =>
    allow.includes(path)
      ? []
      : lines.flatMap((line, i) =>
          /^\s*(\/\/|\*|\/\*|\{\/\*)/.test(line) || !test(line) ? [] : [`${path}:${i + 1}`],
        ),
  );
}

describe('見た目の決まり', () => {
  it('動きの曲線は自前の --ease-out だけ（Tailwind の ease-out などは使わない）', () => {
    expect(offenders((l) => /(?<![\w(_[-])ease-(out|in|in-out|linear)(?![\w)-])/.test(l))).toEqual(
      [],
    );
  });

  it('押したときの縮みは 95%。幅いっぱいの曲の行だけ 98%', () => {
    expect(offenders((l) => /(?<!group-)active:scale-(?!95\b|\[0\.98\])/.test(l))).toEqual([]);
  });

  it('すりガラスの地は bg-glass だけ（bg-sidebar の透け具合を個別に書かない）', () => {
    expect(offenders((l) => /bg-sidebar\/\d/.test(l))).toEqual([]);
  });

  it('縁の線は border-line/60（透けない border-line は使わない）', () => {
    expect(offenders((l) => /\b(border|ring)-line(?!\/)/.test(l))).toEqual([]);
  });

  it('表紙（aspect-video）の角は、行の中の小さな表紙 rounded・札 rounded-xl・大きな表紙と動画 rounded-2xl', () => {
    expect(offenders((l) => /aspect-video/.test(l) && /\brounded-(md|lg|sm)\b/.test(l))).toEqual(
      [],
    );
  });

  it('丸いボタンの形は button-styles.ts から選ぶ（書き起こさない）', () => {
    expect(
      offenders(
        (l) =>
          /\bsize-(8|9|10)\b/.test(l) && /place-items-center/.test(l) && /rounded-full/.test(l),
        [
          'components/button-styles.ts',
          // ログインしている人の頭文字の丸。押せる部品ではない
          'components/account/account-button.tsx',
        ],
      ),
    ).toEqual([]);
  });
});
