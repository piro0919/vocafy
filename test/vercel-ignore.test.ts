import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/** 本番の配備を飛ばす判定（scripts/vercel-ignore.sh）。exit 0 で飛ばし、1 で作る */
const SCRIPT = resolve('scripts/vercel-ignore.sh');
const RENOVATE = 'renovate[bot]';
const HUMAN = 'piro0919';
/** 判定の RECENT（30 分）より前 */
const LONG_AGO_SECONDS = 3600;
const SKIP = 0;
const BUILD = 1;

let repo: string;
let n = 0;

const git = (args: string[], env: Record<string, string> = {}) =>
  execFileSync('git', args, { cwd: repo, env: { ...process.env, ...env } })
    .toString()
    .trim();

/** author のコミットを1つ足し、その番号を返す。agoSeconds は何秒前に作ったことにするか */
function commit(author: string, agoSeconds = 0): string {
  writeFileSync(join(repo, 'file.txt'), String(n++));
  const date = `@${Math.floor(Date.now() / 1000) - agoSeconds} +0000`;
  git(['add', '.']);
  git(['commit', '-q', '-m', 'change'], {
    GIT_AUTHOR_NAME: author,
    GIT_AUTHOR_EMAIL: 'a@example.com',
    GIT_COMMITTER_NAME: 'GitHub',
    GIT_COMMITTER_EMAIL: 'c@example.com',
    GIT_AUTHOR_DATE: date,
    GIT_COMMITTER_DATE: date,
  });
  return git(['rev-parse', 'HEAD']);
}

function decide(env: Record<string, string>): number | null {
  const base: NodeJS.ProcessEnv = { ...process.env, VERCEL_ENV: 'production' };
  delete base.VERCEL_GIT_PREVIOUS_SHA;
  return spawnSync('sh', [SCRIPT], { cwd: repo, env: { ...base, ...env } }).status;
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'vercel-ignore-'));
  git(['init', '-q']);
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe('vercel-ignore.sh', () => {
  it('前の配備からのコミットがすべて Renovate で、マージの直後なら飛ばす', () => {
    const prev = commit(HUMAN, LONG_AGO_SECONDS);
    commit(RENOVATE);
    commit(RENOVATE);
    expect(decide({ VERCEL_GIT_PREVIOUS_SHA: prev })).toBe(SKIP);
  });

  it('人のコミットが1つでも入っていれば作る（飛ばした依存の更新も一緒に出る）', () => {
    const prev = commit(HUMAN, LONG_AGO_SECONDS);
    commit(RENOVATE);
    commit(HUMAN);
    expect(decide({ VERCEL_GIT_PREVIOUS_SHA: prev })).toBe(BUILD);
  });

  it('先頭のコミットから 30 分たっていれば作る（取り込みの Deploy Hook）', () => {
    const prev = commit(HUMAN, LONG_AGO_SECONDS * 2);
    commit(RENOVATE, LONG_AGO_SECONDS);
    expect(decide({ VERCEL_GIT_PREVIOUS_SHA: prev })).toBe(BUILD);
  });

  it('プレビューは作る', () => {
    const prev = commit(HUMAN, LONG_AGO_SECONDS);
    commit(RENOVATE);
    expect(decide({ VERCEL_GIT_PREVIOUS_SHA: prev, VERCEL_ENV: 'preview' })).toBe(BUILD);
  });

  it('確かめられないときは作る（前の配備が無い・見つからない・同じコミットの配備し直し）', () => {
    const prev = commit(HUMAN, LONG_AGO_SECONDS);
    expect(decide({})).toBe(BUILD);
    expect(decide({ VERCEL_GIT_PREVIOUS_SHA: 'f'.repeat(40) })).toBe(BUILD);
    expect(decide({ VERCEL_GIT_PREVIOUS_SHA: prev })).toBe(BUILD);
  });
});
