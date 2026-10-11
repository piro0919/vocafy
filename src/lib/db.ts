// DB を読み書きするのはサーバーだけ
import 'server-only';
import pg from 'pg';
import { env } from '@/env';

/** 1つの関数の実体が同時に開く接続の上限。台帳の読み・お気に入り・流せない動画・ログインで分け合う */
const MAX_CONNECTIONS = 3;

let pool: pg.Pool | undefined;

/**
 * サイトの DB の接続（台帳・アカウント・お気に入り・流せない動画）。1つの入れ物を使い回す。前は使う場所ごとに入れ物を
 * 持っていて（台帳 3・ログイン 2・お気に入り 1・流せない動画 1）、関数1つあたり最大7本の接続を開きえた。
 * 初めて使うときに作る。読み込みの時点で作ると、DATABASE_URL の無い型の確かめなどが落ちる
 */
export function db(): pg.Pool {
  pool ??= new pg.Pool({ connectionString: env.DATABASE_URL, max: MAX_CONNECTIONS });
  return pool;
}
