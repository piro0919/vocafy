import type { WebSite, WithContext } from 'schema-dts';
import { CharacterCard, MoreLink, YearCard } from '@/components/browse-cards';
import { FavoriteNewSongs } from '@/components/favorite-new-songs';
import { MixWall, OnThisDay } from '@/components/home-sections';
import { Heading, SECTION } from '@/components/heading';
import { JsonLd } from '@/components/json-ld';
import { Shelf } from '@/components/shelf';
import { dailyMix, onThisDay, PAGE_SIZE, songsOfDay, today, voices, years } from '@/lib/catalog';
import { SITE_URL } from '@/lib/site';
import { voiceArt } from '@/lib/voice-art';

/** サイトそのものの情報 */
const jsonLd: WithContext<WebSite> = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Vocafy',
  url: SITE_URL,
};

// きょうの日付の曲と日替わりの並びが毎日変わるので、トップだけは1時間ごとに作り直す（日付が変わってから1時間以内に替わる）。
// DB を読むのは1日24回まで。ほかのページは時間では作り直さない
export const revalidate = 3600;

/**
 * トップ。人気で並べず、どの曲も同じ扱いで出会えるようにする（2026-10-08 に本人と決めた）。
 * 上から、お気に入りの棚（あれば）、きょうの日付の曲、日替わりの無作為の並び、歌声、年代。毎日変わるものを上に、探しに行く入口を下に置く
 */
export default async function Home() {
  const date = today();
  const [day, dayList, mix, voiceList, yearList] = await Promise.all([
    onThisDay(date, 8),
    songsOfDay(date.slice(5), 1),
    dailyMix(date, 18),
    voices(),
    years(),
  ]);
  const { hero, rest } = day;
  const [month, dayOfMonth] = date.slice(5).split('-').map(Number);

  return (
    <>
      <JsonLd data={jsonLd} />

      {hero && (
        <OnThisDay
          title={`${month}月${dayOfMonth}日に生まれた曲`}
          playlist={{
            songs: dayList.songs,
            source: `days/${date.slice(5)}`,
            last: Math.ceil(dayList.total / PAGE_SIZE),
          }}
          hero={hero}
          rest={rest}
          today={date}
        />
      )}

      {/* お気に入りのボカロPがいる人にだけ出す、その人の棚。ブラウザで組み立てる */}
      <FavoriteNewSongs />

      <section className={SECTION}>
        <div className="mb-3">
          <Heading eyebrow="Daily Mix">きょうの出会い</Heading>
        </div>
        <MixWall songs={mix} />
      </section>

      {/* 歌声。絵のあるキャラを、曲の多い順に絵の札で並べる。ほかの歌声は「すべて表示」から。
          スマホの幅では 3 列 × 3 段、4 列の幅では 4 段までにする（縦に長くなりすぎる） */}
      <section className={SECTION}>
        <div className="mb-3 flex items-end gap-3">
          <Heading eyebrow="Voices">歌声</Heading>
          <div className="ml-auto">
            <MoreLink href="/voices" />
          </div>
        </div>
        <ul className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 sm:gap-y-5 lg:grid-cols-6">
          {voiceList
            .flatMap((v) => {
              const art = voiceArt(v.id);
              return art ? [{ ...v, art }] : [];
            })
            .slice(0, 18)
            .map((v, i) => (
              <li
                key={v.id}
                className={i >= 16 ? 'hidden lg:block' : i >= 9 ? 'max-sm:hidden' : undefined}
              >
                <CharacterCard {...v} />
              </li>
            ))}
        </ul>
      </section>

      <div className="mt-6 sm:mt-10">
        <Shelf title="年代" eyebrow="Years">
          {/* Orbitron は数字ごとに幅が違い、札の幅がそろわないので、幅を決め打ちにする（一番広い年でも収まる幅） */}
          {yearList.map((y) => (
            <YearCard
              key={y.year}
              year={y.year}
              count={y.count}
              className="w-28 shrink-0 snap-start sm:w-36"
            />
          ))}
        </Shelf>
      </div>
    </>
  );
}
