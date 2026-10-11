// @vitest-environment happy-dom
import { act, cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 「アプリをインストール」のボタン（install-app.tsx）。出すかどうかと、押したときにブラウザの確認を出すか手順を案内するか。
 * ブラウザの仕組み（use-pwa）と iOS の案内の窓は差し替える
 */

const pwa = vi.hoisted(() => ({ canInstall: false, isInstalled: false, install: vi.fn() }));
vi.mock('use-pwa', () => ({ usePwa: () => pwa }));
const apple = vi.hoisted(() => ({ value: false }));
vi.mock('@/lib/apple-device', () => ({ isAppleDevice: () => apple.value }));
vi.mock('next/dynamic', () => ({
  default: () => (props: { isShown: boolean }) =>
    props.isShown ? createElement('div', { role: 'dialog' }, 'ホーム画面に追加の手順') : null,
}));
vi.mock('@/i18n/navigation', () => ({ useText: (text: Record<string, unknown>) => text.ja }));

const { InstallButton } = await import('@/components/install-app');

// vitest の globals を使っていないので、描いた部品はテストごとに自分で片付ける（残すと受け口が重なる）
afterEach(cleanup);

beforeEach(() => {
  pwa.canInstall = false;
  pwa.isInstalled = false;
  pwa.install.mockReset();
  apple.value = false;
});

const button = () => screen.queryByRole('button', { name: 'アプリをホーム画面に追加' });

describe('InstallButton', () => {
  it('入れられないブラウザでは出さない', () => {
    render(createElement(InstallButton));
    expect(button()).toBeNull();
  });

  it('もう入れた端末では出さない', () => {
    pwa.canInstall = true;
    pwa.isInstalled = true;
    render(createElement(InstallButton));
    expect(button()).toBeNull();
  });

  it('入れられるブラウザでは、押すとブラウザの確認を出す', () => {
    pwa.canInstall = true;
    render(createElement(InstallButton));
    act(() => button()?.click());
    expect(pwa.install).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('iPhone・iPad では、押すと共有ボタンから追加する手順を案内する', () => {
    apple.value = true;
    render(createElement(InstallButton));
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => button()?.click());
    expect(screen.getByRole('dialog').textContent).toContain('ホーム画面に追加');
    expect(pwa.install).not.toHaveBeenCalled();
  });

  it('左のメニューの1行の形でも出す', () => {
    pwa.canInstall = true;
    render(createElement(InstallButton, { menu: true }));
    expect(screen.getByRole('button', { name: 'アプリをインストール' })).not.toBeNull();
  });
});
