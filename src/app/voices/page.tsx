import type { Metadata } from 'next';
import Link from 'next/link';
import { CharacterCard, VoiceCard } from '@/components/browse-cards';
import { Heading } from '@/components/heading';
import { voices } from '@/lib/catalog';
import { voiceArt } from '@/lib/voice-art';

export const metadata: Metadata = { title: '歌声' };

// 台帳は取り込みのときにしか変わらないので、時間では作り直さず、次の配備まで作ったページを使い回す（DB を起こさないため）。
export const revalidate = false;

/** これより曲の少ない歌声は、名前だけの小さな札にまとめる。1〜2曲の UTAU の音源などが数百あり、同じ札で並べると埋もれるため */
const MINOR = 20;

/**
 * 歌声の一覧。曲の多い順のまま、絵のあるキャラと絵の無い歌声で上下に分ける。
 * 上の段は絵のあるキャラ全員（トップと同じ絵の札）。絵の無い歌声は、MINOR 曲以上をいつもの札、残りを名前だけで詰める。
 * 曲の多い順に人数で切っていた（36 人、のちに 48 人）が、人数は列の数から逆算した数で、なぜその段にいるかが画面から読めなかった。
 * 絵があるかで分ければ見た目どおりに分かれる。そのかわり、絵の無い Fukase（100 曲超）が 40 曲台の絵のあるキャラより下に来る
 */
export default async function VoicesPage() {
  const list = await voices();
  const characters = list.flatMap((v) => {
    const art = voiceArt(v.id);
    return art ? [{ ...v, art }] : [];
  });
  const others = list.filter((v) => !voiceArt(v.id));
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
