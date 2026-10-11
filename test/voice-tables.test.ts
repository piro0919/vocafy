import { describe, expect, it } from 'vitest';
import { VOICES } from '@/components/theme/voice';
import { VOICE_ART_NAMES, voiceArtIdByName } from '@/lib/voice-art';
import { COLORS } from '@/lib/voice-color';

// キャラの表は3つある（絵 voice-art.ts・色 voice-color.ts・サイトカラーの9人 voice.ts）。名前で引き合うので、
// どれかの名前が変わると、色が既定の青緑に黙って戻ったり、サイトカラーの絵が別のキャラになったりする
describe('キャラの表', () => {
  it('絵のあるキャラには、どれも色がある', () => {
    expect(VOICE_ART_NAMES.filter((name) => !Object.hasOwn(COLORS, name))).toEqual([]);
  });

  it('色の表のキャラには、どれも絵がある', () => {
    expect(Object.keys(COLORS).filter((name) => !VOICE_ART_NAMES.includes(name))).toEqual([]);
  });

  it('サイトカラーの9人の絵と色は、絵と色の表と同じ', () => {
    expect(VOICES).toHaveLength(9);
    for (const v of VOICES) {
      expect({ name: v.label, art: voiceArtIdByName(v.label), color: COLORS[v.label] }).toEqual({
        name: v.label,
        art: v.art,
        color: v.color,
      });
    }
  });
});
