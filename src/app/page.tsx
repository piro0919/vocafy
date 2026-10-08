import Link from 'next/link';
import type { WebSite, WithContext } from 'schema-dts';
import { MoreLink, VoiceCard, YearCard } from '@/components/browse-cards';
import { MixWall, OnThisDay } from '@/components/home-sections';
import { Heading } from '@/components/heading';
import { JsonLd } from '@/components/json-ld';
import { Shelf } from '@/components/shelf';
import { dailyMix, kanaRows, onThisDay, today, voices, years } from '@/lib/catalog';
import { ROW_LABEL, ROWS } from '@/lib/kana';
import { SITE_URL } from '@/lib/site';

/** サイトそのものの情報 */
const jsonLd: WithContext<WebSite> = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Vocafy',
  url: SITE_URL,
};

// 台帳は取り込みのときにしか変わらないので、1時間は作ったページを使い回す。
// きょうの日付の曲と日替わりの並びも、この作り直しに合わせて日付が変わってから1時間以内に替わる
export const revalidate = 3600;

/**
 * トップ。人気で並べず、どの曲も同じ扱いで出会えるようにする（2026-10-08 に本人と決めた）。
 * 上から、きょうの日付の曲、日替わりの無作為の並び、歌声、年代、あいうえお順。毎日変わるものを上に、探しに行く入口を下に置く
 */
export default async function Home() {
  const date = today();
  const [day, mix, voiceList, yearList, rowCounts] = await Promise.all([
    onThisDay(date, 8),
    dailyMix(date, 18),
    voices(),
    years(),
    kanaRows(),
  ]);
  const { hero, rest } = day;
  const [month, dayOfMonth] = date.slice(5).split('-').map(Number);

  return (
    <>
      <JsonLd data={jsonLd} />

      {hero && (
        <section className="mt-2 sm:mt-4">
          <div className="mb-3">
            <Heading eyebrow="On This Day">
              {month}月{dayOfMonth}日に生まれた曲
            </Heading>
          </div>
          <OnThisDay hero={hero} rest={rest.slice(0, 11)} today={date} />
        </section>
      )}

      <section className="mt-10 sm:mt-14">
        <div className="mb-3">
          <Heading eyebrow="Daily Mix">きょうの出会い</Heading>
        </div>
        <MixWall songs={mix} />
      </section>

      {/* 歌声。曲の多い順に、キャラの色の札で並べる。歌っている曲が少ない歌声まで並べると長くなるので 5 曲以上 */}
      <section className="mt-10 sm:mt-14">
        <div className="mb-3 flex items-end gap-3">
          <Heading eyebrow="Voices">歌声</Heading>
          <div className="ml-auto">
            <MoreLink href="/voices" />
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {voiceList
            .filter((v) => v.songCount >= 5)
            .slice(0, 18)
            .map((v) => (
              <li key={v.id}>
                <VoiceCard {...v} />
              </li>
            ))}
        </ul>
      </section>

      <div className="mt-6 sm:mt-10">
        <Shelf title="年代" eyebrow="Years" href="/years">
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

      {/* あいうえお順。行の札だけを置き、曲の一覧は行ごとの画面にする */}
      <section className="mt-6 sm:mt-10">
        <div className="mb-3">
          <Heading eyebrow="Index">あいうえお順</Heading>
        </div>
        <ul className="grid grid-cols-6 gap-2 sm:grid-cols-12">
          {ROWS.map((row) => (
            <li key={row}>
              <Link
                href={`/kana/${row}`}
                aria-label={`${ROW_LABEL[row]}（${rowCounts.get(row) ?? 0} 曲）`}
                className="grid aspect-square place-items-center rounded-2xl border border-line/60 bg-sidebar/60 font-display text-xl text-accent transition-[background-color,border-color,scale] duration-150 ease-out hover:border-accent/50 hover:bg-accent/10 active:scale-95 sm:text-2xl"
              >
                <span
                  className={row === 'abc' || row === 'etc' ? 'text-sm sm:text-base' : undefined}
                >
                  {ROW_LABEL[row]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
