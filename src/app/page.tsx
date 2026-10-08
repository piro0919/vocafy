import Link from 'next/link';
import type { WebSite, WithContext } from 'schema-dts';
import { MixWall, OnThisDay } from '@/components/home-sections';
import { Heading } from '@/components/heading';
import { JsonLd } from '@/components/json-ld';
import { Shelf } from '@/components/shelf';
import { dailyMix, onThisDay, today, years } from '@/lib/catalog';
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

/** 文字列から決まる 0 以上の整数。日付ごとに、大きく見せる1曲を決めるのに使う */
function hash(text: string): number {
  let h = 0;
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/**
 * トップ。人気で並べず、どの曲も同じ扱いで出会えるようにする（2026-10-08 に本人と決めた）。
 * 上から、きょうの日付の曲、日替わりの無作為の並び、年代。毎日変わるものを上に、探しに行く入口を下に置く
 */
export default async function Home() {
  const date = today();
  const [day, mix, yearList] = await Promise.all([onThisDay(date, 8), dailyMix(date, 24), years()]);
  // 大きく見せる1曲は、きょうと同じ月日の曲から、日ごとに決まった1曲を選ぶ
  const exact = day.filter((s) => s.publishedOn.slice(5) === date.slice(5));
  const hero = (exact.length > 0 ? exact : day)[
    hash(date) % Math.max(1, exact.length || day.length)
  ];
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
          <OnThisDay
            hero={hero}
            rest={day.filter((s) => s.songId !== hero.songId).slice(0, 11)}
            today={date}
          />
        </section>
      )}

      <section className="mt-10 sm:mt-14">
        <div className="mb-3">
          <Heading eyebrow="Daily Mix">きょうの出会い</Heading>
        </div>
        <MixWall songs={mix} />
      </section>

      <div className="mt-6 sm:mt-10">
        <Shelf title="年代" eyebrow="Years">
          {yearList.map((y) => (
            <Link
              key={y.year}
              href={`/years/${y.year}`}
              className="flex shrink-0 snap-start flex-col items-start rounded-2xl border border-line/60 bg-sidebar/60 px-4 py-3 transition-[background-color,border-color,scale] duration-150 ease-out hover:border-accent/50 hover:bg-accent/10 active:scale-95"
            >
              <span className="font-tech text-2xl font-black text-accent sm:text-3xl">
                {y.year}
              </span>
              <span className="mt-1 text-xs text-muted">{y.count} 曲</span>
            </Link>
          ))}
        </Shelf>
      </div>
    </>
  );
}
