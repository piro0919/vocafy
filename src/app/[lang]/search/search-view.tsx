'use client';

import { useProducerName } from '@/components/display-names';
import { Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CHIP, PILL } from '@/components/button-styles';
import { Heading, SECTION } from '@/components/heading';
import { FadeImage } from '@/components/fade-image';
import { SongList } from '@/components/song-list';
import type { QueueItem, SearchDetails } from '@/lib/catalog';
import { normalize } from '@/lib/search';
import {
  addRecentSearch,
  clearRecentSearches,
  restoreRecentSearches,
  useRecentSearches,
} from '@/lib/recent-searches';
import { detailsToItems, findInIndex, loadIndex, type Prepared } from '@/lib/search-index';
import { voiceArt } from '@/lib/voice-art';
import { formatCount } from '@/lib/format';
import { IMAGE_SIZES } from '@/lib/image-sizes';
import { TIMING } from '@/lib/timing';
import { useText } from '@/i18n/navigation';
import { defineText } from '@/i18n/text';
import { TERMS } from '@/i18n/terms';
import { useVoiceNames } from '@/components/voice-names';

const TEXT = defineText({
  ja: {
    recent: '最近の検索',
    clear: '検索履歴を削除',
    cleared: '検索履歴を削除しました',
    undo: '元に戻す',
    failed: '索引を読めませんでした。開き直してください。',
    loading: '読み込んでいます…',
    noResults: (q: string) => `「${q}」に当てはまる曲は見つかりませんでした。`,
    songs: '曲',
    firstOf: (shown: string, total: string) => `${shown}曲（全${total}曲）`,
  },
  en: {
    recent: 'Recent searches',
    clear: 'Clear searches',
    cleared: 'Searches cleared',
    undo: 'Undo',
    failed: 'Couldn’t load the search index. Please reload the page.',
    loading: 'Loading…',
    noResults: (q: string) => `No results for “${q}”.`,
    songs: 'Songs',
    firstOf: (shown: string, total: string) => `${shown} of ${total} songs`,
  },
});

/** 一度に出す曲の数。それより多く当たったときは、言葉を足して絞ってもらう */
const SONG_LIMIT = 100;
const PRODUCER_LIMIT = 12;
const VOICE_LIMIT = 12;

/** 2段目（そのボカロPの曲の id・動画の ID・表紙）。読んだものは覚えておく */
const details = new Map<number, Promise<SearchDetails>>();

function loadDetails(producerId: number): Promise<SearchDetails> {
  let pending = details.get(producerId);
  if (!pending) {
    pending = fetch(`/search-index/${producerId}`)
      .then((res) => res.json() as Promise<SearchDetails>)
      .catch((error: unknown) => {
        details.delete(producerId);
        throw error;
      });
    details.set(producerId, pending);
  }
  return pending;
}

export function SearchView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  // 打つ欄は上の帯にあり（header-search.tsx）、そちらが住所の ?q= を書き換える。この画面は住所の言葉で探すだけ。
  // 前はこの画面でも言葉を持ち、住所に合わせたあと同じ言葉で住所を書き直していて、打つたびに画面の移動（とサーバーへの
  // 問い合わせ）が2回ずつ起きていた
  // state に写してから使う（住所の値をそのまま使うと、React Compiler が下の useMemo の最適化をあきらめた）
  const fromUrl = params.get('q') ?? '';
  const [text, setText] = useState(fromUrl);
  if (text !== fromUrl) setText(fromUrl);
  const [index, setIndex] = useState<Prepared | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadIndex().then(setIndex, () => setFailed(true));
  }, []);

  const recent = useRecentSearches();
  const t = useText(TEXT);
  const terms = useText(TERMS);
  const producerName = useProducerName();
  const voices = useVoiceNames();
  const query = normalize(text);
  const found = useMemo(() => (index && query ? findInIndex(index, query) : null), [index, query]);

  // 出す曲のボカロPの分だけ2段目を読み、曲の一覧に組み立てる。打つあいだに古い結果が後から届いても使わない
  const [shown, setShown] = useState<{ query: string; items: QueueItem[] } | null>(null);
  useEffect(() => {
    if (!found || found.songs.length === 0) return;
    const top = found.songs.slice(0, SONG_LIMIT);
    let current = true;
    Promise.all(
      [...new Set(top.map((s) => s.producer.id))].map(
        async (id) => [id, await loadDetails(id)] as const,
      ),
    ).then(
      (loaded) => {
        if (!current) return;
        const items = detailsToItems(top, new Map(loaded));
        setShown({ query, items });
      },
      () => current && setFailed(true),
    );
    return () => {
      current = false;
    };
  }, [found, query]);
  const items = shown?.query === query ? shown.items : null;

  return (
    // 結果（ボカロP・歌声・曲）を押したら、そのときの言葉を最近の検索に残す。打っただけの言葉は残さない
    <div
      className="md:mt-4"
      onClickCapture={(e) => {
        const q = text.trim();
        const hit = (e.target as HTMLElement).closest('a, button');
        if (q && hit && hit.closest('section') && !hit.closest('[data-recent]')) addRecentSearch(q);
      }}
    >
      {/* 何も打っていないときは、最近の検索の言葉を出す。押すとその言葉で探す */}
      {!query && recent.length > 0 && (
        <section data-recent className="mt-6">
          <div className="mb-3 flex items-end gap-3">
            <Heading eyebrow="Recent">{t.recent}</Heading>
            {/* 履歴の画面の「履歴を削除」と同じく、確かめずにすぐ消し、知らせの「元に戻す」で戻せるようにする */}
            <button
              type="button"
              onClick={() => {
                const removed = recent;
                clearRecentSearches();
                toast(t.cleared, {
                  duration: TIMING.undoToast,
                  action: { label: t.undo, onClick: () => restoreRecentSearches(removed) },
                });
              }}
              className={`${PILL} ml-auto`}
            >
              {t.clear}
            </button>
          </div>
          <ul className="flex flex-wrap gap-2">
            {recent.map((q) => (
              <li key={q} className="min-w-0">
                <button
                  type="button"
                  onClick={() =>
                    router.replace(`${pathname}?q=${encodeURIComponent(q)}`, { scroll: false })
                  }
                  title={q}
                  // 長い言葉は「…」で切り、札が画面からはみ出さないようにする
                  className={`block max-w-60 truncate px-4 py-1.5 ${CHIP}`}
                >
                  {q}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {failed && <p className="mt-6 text-sm text-muted">{t.failed}</p>}
      {!failed && query && !index && <p className="mt-6 text-sm text-muted">{t.loading}</p>}

      {found && found.producers.length + found.songs.length + found.voices.length === 0 && (
        <p className="mt-6 text-sm text-muted">{t.noResults(text.trim())}</p>
      )}

      {found && found.producers.length > 0 && (
        <section className="mt-6">
          <div className="mb-3">
            <Heading eyebrow="Producers">{terms.producers}</Heading>
          </div>
          <ul className="flex flex-wrap gap-2">
            {found.producers.slice(0, PRODUCER_LIMIT).map((p) => (
              <li key={p.id}>
                <Link
                  href={`/producers/${p.id}`}
                  className={`flex items-center gap-2 py-1 pr-4 pl-1 ${CHIP}`}
                >
                  {p.picture ? (
                    <FadeImage
                      src={p.picture}
                      alt=""
                      width={IMAGE_SIZES.avatar}
                      height={IMAGE_SIZES.avatar}
                      className="size-8 rounded-full bg-surface object-cover"
                    />
                  ) : (
                    <span className="size-8 rounded-full bg-surface" />
                  )}
                  {producerName(p.id, p.name)}
                  <span className="text-xs font-normal text-muted">
                    {terms.songs(formatCount(p.songCount))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {found && found.voices.length > 0 && (
        <section className={SECTION}>
          <div className="mb-3">
            <Heading eyebrow="Voices">{terms.voices}</Heading>
          </div>
          <ul className="flex flex-wrap gap-2">
            {found.voices.slice(0, VOICE_LIMIT).map((v) => {
              const art = voiceArt(v.id);
              return (
                <li key={v.id}>
                  <Link
                    href={`/voices/${v.id}`}
                    className={`flex items-center gap-2 py-1 pr-4 ${CHIP} ${art ? 'pl-1' : 'pl-4'}`}
                  >
                    {art && (
                      <span className="relative size-8 shrink-0 rounded-full bg-surface">
                        <FadeImage src={art} alt="" fill unoptimized className="object-contain" />
                      </span>
                    )}
                    {voices.name(v.name)}
                    <span className="text-xs font-normal text-muted">
                      {terms.songs(formatCount(v.songCount))}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {found && found.songs.length > 0 && (
        <section className={SECTION}>
          <div className="mb-3">
            <Heading eyebrow="Songs">{t.songs}</Heading>
          </div>
          <p className="-mt-1 mb-3 text-sm text-muted">
            {found.songs.length > SONG_LIMIT
              ? t.firstOf(formatCount(SONG_LIMIT), formatCount(found.songs.length))
              : terms.songs(formatCount(found.songs.length))}
          </p>
          {items ? (
            <SongList songs={items} className="grid gap-1 md:grid-cols-2 xl:grid-cols-3" />
          ) : (
            <p className="text-sm text-muted">{t.loading}</p>
          )}
        </section>
      )}
    </div>
  );
}
