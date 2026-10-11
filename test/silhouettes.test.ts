import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { VOICE_ART_IDS } from '../src/lib/voice-art';

describe('共有の絵のキャラの影絵', () => {
  it('絵のあるキャラはどれも影絵の PNG がある（無ければ pnpm silhouettes で書き出す）', () => {
    const missing = VOICE_ART_IDS.filter(
      (id) => !existsSync(join(process.cwd(), 'src/assets/silhouettes', `${id}.png`)),
    );
    expect(missing).toEqual([]);
  });
});
