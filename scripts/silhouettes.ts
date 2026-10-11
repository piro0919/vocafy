/**
 * 共有の絵（src/app/[lang]/producers/[id]/og.tsx）に出す、キャラの影絵を書き出す。
 * キャラの絵（public/characters/{id}.webp）の形を、初音ミクの青緑一色で塗った PNG にして src/assets/silhouettes/{id}.png に置く。
 * 共有の絵を作る仕組み（next/og）は、WebP の絵を切り抜きや SVG の中で読めなかったので、PNG を別に持つ（2026-10-11）
 *
 * キャラの絵を足したり描き直したりしたら `pnpm silhouettes` で書き出し直す。足し忘れは test/silhouettes.test.ts が落とす
 */
import { mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { COLORS } from '../src/lib/colors';

const FROM = join(process.cwd(), 'public/characters');
const TO = join(process.cwd(), 'src/assets/silhouettes');
const RGB = [1, 3, 5].map((i) => parseInt(COLORS.miku.slice(i, i + 2), 16));
const CHANNELS = 4;

async function main() {
  mkdirSync(TO, { recursive: true });
  for (const name of readdirSync(FROM).filter((f) => f.endsWith('.webp'))) {
    const { data, info } = await sharp(join(FROM, name))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    // 不透明さはそのまま残し、色だけを塗り替える
    for (let i = 0; i < data.length; i += CHANNELS) {
      data[i] = RGB[0];
      data[i + 1] = RGB[1];
      data[i + 2] = RGB[2];
    }
    await sharp(data, { raw: info })
      .png({ compressionLevel: 9, palette: true })
      .toFile(join(TO, name.replace(/\.webp$/, '.png')));
  }
  console.log(`${readdirSync(TO).length} 枚を書き出しました`);
}

void main();
