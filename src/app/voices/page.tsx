import type { Metadata } from 'next';
import Link from 'next/link';
import { CharacterCard, VoiceCard } from '@/components/browse-cards';
import { Heading } from '@/components/heading';
import { voices } from '@/lib/catalog';
import { voiceArt } from '@/lib/voice-art';

export const metadata: Metadata = { title: '歌声' };

// 台帳は取り込みのときにしか変わらないので、時間では作り直さず、次の配備まで作ったページを使い回す（DB を起こさないため）。
export const revalidate = false;

/**
 * 絵の札で大きく出す、絵のあるキャラの人数（曲の多い順）。絵のあるキャラを全員出すと 60 人を超え、絵の札だけで長い壁になった。
 * 曲数の線で切ると端数が出て最後の段が1人になるので、列の数（3・4・6）のどれでも割り切れる数にする
 */
const FEATURED = 36;

/** これより曲の少ない歌声は、名前だけの小さな札にまとめる。1〜2曲の UTAU の音源などが数百あり、同じ札で並べると埋もれるため */
const MINOR = 20;

/**
 * 歌声の一覧。すべての歌声を、曲の多い順のまま3段に分けて並べる。
 * 上の段は曲の多い FEATURED 人の絵のあるキャラ（トップと同じ絵の札）、中の段は MINOR 曲以上の残り（絵があれば小さな顔）、
 * 下の段は残りを名前だけで詰める
 */
export default async function VoicesPage() {
  const list = await voices();
  const characters = list
    .flatMap((v) => {
      const art = voiceArt(v.id);
      return art ? [{ ...v, art }] : [];
    })
    .slice(0, FEATURED);
  const others = list.filter((v) => !characters.some((c) => c.id === v.id));
  const major = others.filter((v) => v.songCount >= MINOR);
  const minor = others.filter((v) => v.songCount < MINOR);
  return (
    <>
      <div className="pt-4 pb-4 sm:pb-6">
        <Heading as="h1" size="page" eyebrow="Voices">
          歌声
        </Heading>
      </div>
      <ul className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 sm:gap-y-5 lg:grid-cols-6">
        {characters.map((v) => (
          <li key={v.id}>
            <CharacterCard {...v} />
          </li>
        ))}
      </ul>

      <section className="mt-10 sm:mt-14">
        <div className="mb-3 sm:mb-4">
          <Heading eyebrow="Voices">{MINOR} 曲以上の歌声</Heading>
        </div>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {major.map((v) => (
            <li key={v.id}>
              <VoiceCard {...v} />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 sm:mt-14">
        <div className="mb-3 sm:mb-4">
          <Heading eyebrow="Index">{MINOR} 曲未満の歌声</Heading>
        </div>
        <ul className="flex flex-wrap gap-1.5">
          {minor.map((v) => (
            <li key={v.id} className="min-w-0">
              <Link
                href={`/voices/${v.id}`}
                className="flex max-w-60 items-baseline gap-1.5 rounded-full border border-line/60 px-3 py-1 text-xs transition-[background-color] duration-150 ease-out hover:bg-sidebar"
              >
                <span className="truncate font-bold">{v.name}</span>
                <span className="shrink-0 text-muted">{v.songCount}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
