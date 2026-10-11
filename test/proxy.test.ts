import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { hourInJapan, today } from '@/lib/iso-date';
import { proxy } from '@/proxy';

describe('proxy（トップの振り分け）', () => {
  it('トップには、日本のいまの日付と時のページを、住所を変えずに返す', () => {
    const res = proxy(new NextRequest('http://localhost/'));
    expect(res.headers.get('x-middleware-rewrite')).toBe(
      `http://localhost/home/${today()}/${hourInJapan()}`,
    );
  });

  it('日付のページを直に開かれたらトップへ送る', () => {
    const res = proxy(new NextRequest('http://localhost/home/2020-01-01/3'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/');
  });
});
