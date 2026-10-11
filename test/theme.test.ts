// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyTheme,
  readThemePref,
  setThemePref,
  subscribeThemePref,
} from '@/components/theme/theme';
import {
  applySinger,
  readFollowVoice,
  readVoice,
  setFollowVoice,
  setVoice,
  subscribeVoice,
} from '@/components/theme/voice';
import {
  publishAmbientColors,
  readAmbientColors,
  subscribeAmbientColors,
} from '@/components/ambient-colors';

/** 画面の色の切り替え（テーマ・サイトカラー・歌っているキャラの色）と、背景の色の受け渡し */

const html = document.documentElement;
let media: Record<string, boolean>;

beforeEach(() => {
  localStorage.clear();
  delete html.dataset.theme;
  delete html.dataset.voice;
  delete html.dataset.singer;
  media = {};
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: media[query] ?? false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, 'startViewTransition');
});

describe('テーマ', () => {
  it('端末の設定に合わせる（system）ときは、端末が暗い画面なら dark', () => {
    applyTheme('system');
    expect(html.dataset.theme).toBe('light');
    media['(prefers-color-scheme: dark)'] = true;
    applyTheme('system');
    expect(html.dataset.theme).toBe('dark');
    applyTheme('light');
    expect(html.dataset.theme).toBe('light');
  });

  it('選ぶと残して当て、知らせる。既定（system）を選んだら何も残さない', () => {
    const changed = vi.fn();
    const off = subscribeThemePref(changed);
    setThemePref('dark');
    expect(readThemePref()).toBe('dark');
    expect(html.dataset.theme).toBe('dark');
    expect(changed).toHaveBeenCalledTimes(1);
    setThemePref('system');
    expect(localStorage.getItem('vocafy-theme')).toBeNull();
    off();
  });

  it('残っている値が知らないものなら既定', () => {
    localStorage.setItem('vocafy-theme', 'sepia');
    expect(readThemePref()).toBe('system');
  });
});

describe('サイトカラー', () => {
  it('選ぶと html に印を付けて知らせる。初音ミク（既定）は印を外し、何も残さない', () => {
    const changed = vi.fn();
    const off = subscribeVoice(changed);
    setVoice('rin');
    expect(html.dataset.voice).toBe('rin');
    expect(readVoice()).toBe('rin');
    setVoice('miku');
    expect(html.dataset.voice).toBeUndefined();
    expect(localStorage.getItem('vocafy-voice')).toBeNull();
    expect(changed).toHaveBeenCalledTimes(2);
    off();
  });

  it('View Transitions があればフェードで切り替え、動きを減らす設定の人には一瞬で切り替える', () => {
    const transition = vi.fn((apply: () => void) => apply());
    Object.defineProperty(document, 'startViewTransition', {
      value: transition,
      configurable: true,
    });
    setVoice('teto');
    expect(transition).toHaveBeenCalledTimes(1);
    expect(html.dataset.voice).toBe('teto');
    media['(prefers-reduced-motion: reduce)'] = true;
    setVoice('kafu');
    expect(transition).toHaveBeenCalledTimes(1);
    expect(html.dataset.voice).toBe('kafu');
  });

  it('歌っているキャラの色に変える設定は、はじめはオンで、切ると残る', () => {
    expect(readFollowVoice()).toBe(true);
    setFollowVoice(false);
    expect(readFollowVoice()).toBe(false);
    expect(localStorage.getItem('vocafy-voice-follow')).toBe('off');
    setFollowVoice(true);
    expect(localStorage.getItem('vocafy-voice-follow')).toBeNull();
  });
});

describe('歌っているキャラの色（applySinger）', () => {
  it('印を付け替え、null で外す。保存はしない', () => {
    applySinger('初音ミク');
    expect(html.dataset.singer).toBe('初音ミク');
    applySinger('GUMI');
    expect(html.dataset.singer).toBe('GUMI');
    applySinger(null);
    expect(html.dataset.singer).toBeUndefined();
    expect(localStorage.length).toBe(0);
  });
});

describe('背景の色の受け渡し（ambient-colors）', () => {
  it('色が変わったときだけ知らせ、2色を「|」でつないで返す', () => {
    const changed = vi.fn();
    const off = subscribeAmbientColors(changed);
    publishAmbientColors(['#111', '#222']);
    publishAmbientColors(['#111', '#222']);
    expect(readAmbientColors()).toBe('#111|#222');
    expect(changed).toHaveBeenCalledTimes(1);
    publishAmbientColors(null);
    expect(readAmbientColors()).toBeNull();
    expect(changed).toHaveBeenCalledTimes(2);
    off();
    publishAmbientColors(['#333', '#444']);
    expect(changed).toHaveBeenCalledTimes(2);
  });
});
