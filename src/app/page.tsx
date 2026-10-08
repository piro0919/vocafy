import Link from 'next/link';
import type { WebSite, WithContext } from 'schema-dts';
import { MixWall, OnThisDay } from '@/components/home-sections';
import { Heading } from '@/components/heading';
import { JsonLd } from '@/components/json-ld';
import { Shelf } from '@/components/shelf';
import { dailyMix, kanaRows, onThisDay, today, voices, years } from '@/lib/catalog';
import { ROW_LABEL, ROWS } from '@/lib/kana';
import { voiceColor } from '@/lib/voice-color';
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
 * 上から、きょうの日付の曲、日替わりの無作為の並び、歌声、年代、あいうえお順。毎日変わるものを上に、探しに行く入口を下に置く
 */
export default async function Home() {
  const date = today();
  const [day, mix, voiceList, yearList, rowCounts] = await Promise.all([
    onThisDay(date, 8),
    dailyMix(date, 24),
    voices(),
    years(),
    kanaRows(),
  ]);
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

      {/* 歌声。曲の多い順に、キャラの色の札で並べる。歌っている曲が少ない歌声まで並べると長くなるので 5 曲以上 */}
      <section className="mt-10 sm:mt-14">
        <div className="mb-3">
          <Heading eyebrow="Voices">歌声</Heading>
        </div>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {voiceList
            .filter((v) => v.songCount >= 5)
            .slice(0, 18)
            .map((v) => (
              <li key={v.id}>
                <Link
                  href={`/voices/${v.id}`}
                  style={{ '--c': voiceColor(v.name) } as React.CSSProperties}
                  className="flex h-full items-center gap-3 rounded-2xl border border-line/60 bg-[color-mix(in_oklab,var(--c)_14%,var(--sidebar))] px-3 py-2.5 transition-[background-color,scale] duration-150 ease-out hover:bg-[color-mix(in_oklab,var(--c)_24%,var(--sidebar))] active:scale-95"
                >
                  <span aria-hidden className="size-7 shrink-0 rounded-full bg-(--c) shadow-sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{v.name}</span>
                    <span className="block text-xs text-muted">{v.songCount} 曲</span>
                  </span>
                </Link>
              </li>
            ))}
        </ul>
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
