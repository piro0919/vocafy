import type { Metadata } from 'next';
import Link from 'next/link';
import { CharacterCard } from '@/components/browse-cards';
import { Heading, SECTION } from '@/components/heading';
import { voices } from '@/lib/catalog';
import { voiceArt } from '@/lib/voice-art';
import { formatCount } from '@/lib/format';

export const metadata: Metadata = { title: '歌声' };

// 台帳は取り込みのときにしか変わらないので、時間では作り直さず、次の配備まで作ったページを使い回す（DB を起こさないため）。
export const revalidate = false;

/** 歌声ライブラリのうち、これ以上の曲がある歌声は札を少し大きくする。1〜2曲の UTAU の音源などが数百あり、同じ大きさだと埋もれるため */
const MINOR = 20;

/**
 * 歌声の一覧。曲の多い順のまま、キャラクター（絵のある歌声）と歌声ライブラリ（絵の無い歌声）の2つに分ける。
 * 絵の無い歌声の多くは、VY1・女声1・Mai のようにキャラの絵を持たない声なので、「ライブラリ」と呼ぶ。
 * 曲の多い順に人数で切っていた（36 人、のちに 48 人）が、人数は列の数から逆算した数で、なぜその段にいるかが画面から読めなかった。
 * 絵のある全員を出すと 79 人で長い壁になったので、キャラクターの札は小さくして列を増やした。
 * 歌声ライブラリは、20 曲以上とそれ未満で段を分けると 11 件だけの段ができて半端だったので、1つの並びにして札の大きさだけ変える
 */
export default async function VoicesPage() {
  const list = await voices();
  const characters = list.flatMap((v) => {
    const art = voiceArt(v.id);
    return art ? [{ ...v, art }] : [];
  });
  const libraries = list.filter((v) => !voiceArt(v.id));
  return (
    <>
      <div className="pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow="Voices">
          歌声
        </Heading>
      </div>

      <section>
        <div className="mb-3">
          <Heading eyebrow="Characters">キャラクター</Heading>
        </div>
        <ul className="grid grid-cols-3 gap-x-2.5 gap-y-3 sm:grid-cols-6 sm:gap-y-4 lg:grid-cols-8">
          {characters.map((v) => (
            <li key={v.id}>
              <CharacterCard {...v} />
            </li>
          ))}
        </ul>
      </section>

      <section className={SECTION}>
        <div className="mb-3">
          <Heading eyebrow="Libraries">歌声ライブラリ</Heading>
        </div>
        <ul className="flex flex-wrap gap-1.5">
          {libraries.map((v) => (
            <li key={v.id} className="min-w-0">
              <Link
                href={`/voices/${v.id}`}
                className={`flex max-w-60 items-baseline gap-1.5 rounded-full border border-line/60 transition-[background-color,scale] duration-150 ease-(--ease-out) hover:bg-accent/10 active:scale-95 ${
                  v.songCount >= MINOR ? 'bg-glass px-4 py-1.5 text-sm' : 'px-3 py-1 text-xs'
                }`}
              >
                <span className="truncate font-bold">{v.name}</span>
                <span className="shrink-0 text-xs text-muted">{formatCount(v.songCount)}曲</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
