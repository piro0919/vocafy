import type { WebSite, WithContext } from 'schema-dts';
import { CharacterCard, MoreLink, YearCard } from '@/components/browse-cards';
import { FavoriteNewSongs } from '@/components/favorite-new-songs';
import { MixWall, OnThisDay } from '@/components/home-sections';
import { PlayAllPill } from '@/components/play-all';
import { Heading, SECTION } from '@/components/heading';
import { JsonLd } from '@/components/json-ld';
import { Shelf } from '@/components/shelf';
import { dailyMix, MIX_SIZE, onThisDay, playlistOfDay, today, voices, years } from '@/lib/catalog';
import { SITE_URL } from '@/lib/site';
import { voiceArt } from '@/lib/voice-art';
import { monthDayOf } from '@/lib/iso-date';

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

/** トップの歌声の区画に出すキャラの数。列の数（3・4・6）の3段・4段・3段で、最後の段が欠けないようにする */
const VOICE_CARDS = { base: 9, sm: 16, lg: 18 };
/** きょうの日付の曲がこれより少ない日は、前後の日に広げる */
const ON_THIS_DAY_MIN = 8;

/**
 * トップ。人気で並べず、どの曲も同じ扱いで出会えるようにする（2026-10-08 に本人と決めた）。
 * 上から、お気に入りの棚（あれば）、きょうの日付の曲、日替わりの無作為の並び、歌声、年代。毎日変わるものを上に、探しに行く入口を下に置く
 */
export default async function Home() {
  const date = today();
  const [day, dayList, mix, voiceList, yearList] = await Promise.all([
    onThisDay(date, ON_THIS_DAY_MIN),
    playlistOfDay(monthDayOf(date)),
    dailyMix(date, MIX_SIZE),
    voices(),
    years(),
  ]);
  const { hero, rest } = day;
  const [month, dayOfMonth] = monthDayOf(date).split('-').map(Number);

  return (
    <>
      <JsonLd data={jsonLd} />

      {hero && (
        <OnThisDay
          title={`${month}月${dayOfMonth}日に生まれた曲`}
          playlist={{
            songs: dayList.songs,
            source: `days/${monthDayOf(date)}`,
            last: 1,
            pickup: dayList.pickup,
          }}
          hero={hero}
          rest={rest}
          today={date}
        />
      )}

      {/* お気に入りのボカロPがいる人にだけ出す、その人の棚。ブラウザで組み立てる */}
      <FavoriteNewSongs />

      <section className={SECTION}>
        {/* 「再生」で18曲を通して流す（再生用の画面へ移る）。壁の曲を押したときは、その曲のボカロPの画面へ移る */}
        <div className="mb-3 flex items-end gap-3">
          <Heading eyebrow="Daily Mix">きょうの出会い</Heading>
          <div className="ml-auto">
            <PlayAllPill songs={mix} list={{ source: `mix/${date}`, page: 1, last: 1 }} />
          </div>
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
            .slice(0, VOICE_CARDS.lg)
            .map((v, i) => (
              <li
                key={v.id}
                className={
                  i >= VOICE_CARDS.sm
                    ? 'hidden lg:block'
                    : i >= VOICE_CARDS.base
                      ? 'max-sm:hidden'
                      : undefined
                }
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
