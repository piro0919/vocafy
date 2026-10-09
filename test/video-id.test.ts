import { describe, expect, it } from 'vitest';
import { isVideoId } from '@/lib/video-id';

describe('isVideoId', () => {
  it('YouTube の動画の ID は11字の英数字と - _', () => {
    expect(isVideoId('youtube', 'KushW6zvazM')).toBe(true);
    expect(isVideoId('youtube', 'x')).toBe(false);
    expect(isVideoId('youtube', 'KushW6zvazM/../x')).toBe(false);
  });

  it('ニコニコの動画の ID は sm・so・nm に数字', () => {
    expect(isVideoId('niconico', 'sm8166339')).toBe(true);
    expect(isVideoId('niconico', 'so45521725')).toBe(true);
    expect(isVideoId('niconico', 'lv123')).toBe(false);
    expect(isVideoId('niconico', 'sm1?x=1')).toBe(false);
  });
});
