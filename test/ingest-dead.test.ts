import { describe, expect, it } from 'vitest';
import { isDropped, tooManyDead, withoutDead } from '../scripts/lib/dead';

const both = { youtubeId: 'yt1', youtubeTopic: false, niconicoId: 'sm1', niconicoThumb: 'thumb' };
const none = new Set<string>();

describe('withoutDead（流せない動画を外す）', () => {
  it('YouTube が流せなければ、ニコニコに切り替える', () => {
    const found = withoutDead(both, { youtube: new Set(['yt1']), niconico: none });
    expect(found).toEqual({
      youtubeId: null,
      youtubeTopic: false,
      niconicoId: 'sm1',
      niconicoThumb: 'thumb',
    });
    expect(isDropped(found)).toBe(false);
  });

  it('どちらも流せなければ、その曲は入れない', () => {
    const found = withoutDead(both, { youtube: new Set(['yt1']), niconico: new Set(['sm1']) });
    expect(isDropped(found)).toBe(true);
  });

  it('ほかの動画が流せなくても、この曲は変えない', () => {
    expect(withoutDead(both, { youtube: new Set(['yt2']), niconico: new Set(['sm2']) })).toEqual(
      both,
    );
  });
});

describe('tooManyDead（多すぎたら書かずに止める）', () => {
  const limit = { youtube: 300, niconico: 300 };

  it('上限までなら止めない', () => {
    expect(tooManyDead({ youtube: 300, niconico: 300 }, limit)).toBeNull();
  });

  it('YouTube かニコニコのどちらかが上限を超えたら止める', () => {
    expect(tooManyDead({ youtube: 301, niconico: 0 }, limit)).toContain('YouTube');
    expect(tooManyDead({ youtube: 0, niconico: 301 }, limit)).toContain('ニコニコ');
  });
});
