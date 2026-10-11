// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement, type MouseEventHandler, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * サイトの Link（i18n/navigation.tsx）。押してサイトの中の別の画面へ移るときだけ、住所が変わるまで移動中の印を付ける
 * （pending-navigation.ts）。next/link は、押されたら何もしない a に差し替える
 */

vi.mock('next/link', () => ({
  default: ({
    href,
    onClick,
    children,
    ...rest
  }: {
    href: string;
    onClick: MouseEventHandler;
    children: ReactNode;
  }) =>
    createElement(
      'a',
      {
        href,
        ...rest,
        onClick: (e: React.MouseEvent) => {
          onClick(e);
          e.preventDefault();
        },
      },
      children,
    ),
}));
vi.mock('next/navigation', () => ({ usePathname: () => window.location.pathname }));
vi.mock('@bprogress/next/app', () => ({ useRouter: () => ({}) }));

const { Link } = await import('@/i18n/navigation');
const { endNavigation, navigationPending } = await import('@/lib/pending-navigation');

// vitest の globals を使っていないので、描いた部品はテストごとに自分で片付ける（残すと受け口が重なる）
afterEach(cleanup);
beforeEach(() => {
  window.history.replaceState(null, '', '/producers/45');
  endNavigation();
});

const link = (href: string, props: Record<string, unknown> = {}) => {
  render(createElement(Link, { href, ...props }, 'リンク'));
  return screen.getByText('リンク');
};

describe('Link', () => {
  it('別の画面へ移るリンクを押したら、移動中の印を付ける', () => {
    fireEvent.click(link('/years'));
    expect(navigationPending()).toBe(true);
  });

  it('同じ画面のリンク・新しいタブで開く押し方・target 付きでは付けない', () => {
    fireEvent.click(link('/producers/45?song=2'));
    cleanup();
    fireEvent.click(link('/years'), { metaKey: true });
    cleanup();
    fireEvent.click(link('/years'), { button: 1 });
    cleanup();
    fireEvent.click(link('/years', { target: '_blank' }));
    expect(navigationPending()).toBe(false);
  });

  it('渡した onClick も呼ぶ', () => {
    const onClick = vi.fn();
    fireEvent.click(link('/years', { onClick }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('英語の画面では、言語の付いた住所にする', () => {
    window.history.replaceState(null, '', '/en/producers/45');
    expect(link('/years').getAttribute('href')).toBe('/en/years');
  });
});
