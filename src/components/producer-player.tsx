'use client';

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import type { QueueItem, Song } from '@/lib/catalog';
import { glideWindowTo } from '@/lib/motion';
import { NO_RESTORE } from '@/lib/no-restore';
import { FavoriteButton } from './favorite-button';
import { Bars } from './now-playing';
import { StagePlayButton } from './player-stage';
import { usePlayer } from './player/player-provider';
import { usePreload } from './player/use-preload';
import { NoAutoplay } from './song-list';
import { Marquee } from './marquee';
import { ScrollRow } from './scroll-row';
import { useTakeOver } from './player/use-take-over';
import { useLinkedSong, useSongInUrl } from './player/use-song-in-url';
import { StageLayout } from './stage-layout';
import { ShareMenu } from './share-menu';
import { useClientValue } from '@/lib/client-value';
import { GLASS } from '@/components/surface-styles';
import { defineText } from '@/i18n/text';
import { useLocalize, useText } from '@/i18n/navigation';
import { TERMS } from '@/i18n/terms';
import { useVoiceNames } from '@/components/voice-names';

const TEXT = defineText({
  ja: {
    shareSong: 'この曲を共有',
    shareProducer: 'このボカロPを共有',
    playSong: (title: string) => `「${title}」を再生`,
    playProducer: 'このボカロPの曲を再生',
    unplayable: 'この曲は本家の動画の情報が足りず、再生できません',
    jumpToYear: '年ごとに移動',
  },
  en: {
    shareSong: 'Share this song',
    shareProducer: 'Share this producer',
    playSong: (title: string) => `Play “${title}”`,
    playProducer: "Play this producer's songs",
    unplayable: "Can't play this song: details of the original video are missing",
    jumpToYear: 'Jump to year',
  },
});

/** 年の札の行のすぐ下に、どこまで来た曲をその年とみなすか（px） */
const YEAR_LINE_GAP = 8;
/** ページの一番下とみなす余り（px。小数の丸めで届かないことがある） */
const BOTTOM_SLACK = 2;
/** 一番下まで来たときに、見えている年とみなす画面の下の端からの位置（px） */
const BOTTOM_LINE = 40;

/**
 * ボカロPの画面。左に大きなプレイヤーの置き場所、右に曲の一覧（新しい順）。
 * このボカロPの曲を流している間は、共通のプレイヤーが置き場所に重なって大きく出る。
 * ほかの曲を流しているあいだや、まだ何も流していないときは、サムネイルと再生ボタンを出す
 */
export function ProducerPlayer({
  producerId,
  producerName,
  linkedSongId,
  heading,
  songs,
  queue,
  cover,
}: {
  producerId: number;
  /** 共有の文に入れる名前 */
  producerName: string;
  /** 共有の住所（/producers/[id]/songs/[songId]）で開いたときの曲。無ければ住所の ?song= を読む */
  linkedSongId?: number;
  /** 動画の下に出す名前。ページの側で作る */
  heading: ReactNode;
  songs: Song[];
  queue: QueueItem[];
  cover: string | null;
}) {
  const { current, playing, owner, playQueue, takeOver, toggle, skipsNiconico } = usePlayer();
  const t = useText(TEXT);
  const terms = useText(TERMS);
  const voices = useVoiceNames();
  const to = useLocalize();
  // 動画をここに大きく出すのは、この人の曲の並びを流しているときだけ。お気に入りの並び・一覧の「再生」の並びのまま
  // 出すと、次の曲が別の人の曲になった途端に、この画面にいるまま動画が右下の窓へ飛んだ。流している曲がこの人の一覧に
  // あれば、開いたときに並びをこの人の曲に切り替える（use-take-over.ts。どの画面も同じ決まり）
  const page = useMemo(() => ({ kind: 'producer' as const, producerId }), [producerId]);
  const here = useTakeOver(queue, page);
  // 流せる曲。ニコニコにしか本家が無い曲もニコニコで流せるが、表紙の取れていない曲は流さない
  const playable = new Map(queue.map((q) => [q.songId, q]));
  // ニコニコの曲の行が見えているあいだ、埋め込みを先に読み込んでおく（iPad・iPhone だけ）
  const list = useRef<HTMLOListElement>(null);
  usePreload(list, songs);

  // この人の曲を流しているあいだは、住所に流している曲を入れる（use-song-in-url.ts）
  useSongInUrl(here ? current : null, `/producers/${producerId}`);

  // 共有されたリンク（?song=曲の id）で来たときの曲。開いただけでは流さない（ブラウザが押す操作の無い再生を止めるため）。
  // その曲を一覧で目立たせ、大きな再生ボタンをその曲からにする
  const fromQuery = useLinkedSong();
  const linked = linkedSongId ?? fromQuery;
  // その曲の行までスクロールするのは、開いたときの1回だけ。流しているあいだは住所の曲が曲ごとに変わるが、そのたびには動かさない
  const scrolledToLinked = useRef(false);
  useEffect(() => {
    if (!linked || scrolledToLinked.current) return;
    scrolledToLinked.current = true;
    document.getElementById(`song-${linked}`)?.scrollIntoView({ block: 'center' });
  }, [linked]);
  const linkedItem = !here && linked ? playable.get(linked) : undefined;

  // 曲の一覧から押して来たときは、その1曲だけを流している。曲は止めずに、順番待ちをこの人の曲にする。
  // 一覧は新しい順なので、古い曲だと流している行がずっと下にある。その行が見えるところまでスクロールする
  useEffect(() => {
    if (!here || !current || owner.kind !== 'pending') return;
    const at = queue.findIndex((q) => q.songId === current.songId);
    if (at < 0) return;
    // 並びの種類も「移る途中（pending）」から「この人の曲の並び（list）」に改める。pending のまま残すと、ほかの画面
    // （お気に入りの曲の画面など）が「移る途中」と見分けられず、並びを横取りしたり、戻ったときに取り戻せなかったりした
    takeOver(queue, at, page);
    document.getElementById(`song-${current.songId}`)?.scrollIntoView({ block: 'center' });
  }, [here, current, owner.kind, queue, takeOver, page]);

  const start = (songId?: number) =>
    playQueue(
      queue,
      songId
        ? Math.max(
            0,
            queue.findIndex((q) => q.songId === songId),
          )
        : 0,
      page,
    );

  // 共有するのは、この人の曲を流しているときはその曲、それ以外はこの人。曲つきのリンクは、曲名を題名と共有の絵に入れた住所
  // （songs/[songId]/page.tsx）。住所の元はブラウザの側で決める（作り置きのページにサーバーの住所を焼き込まない）
  const sharedSong = here ? current : linkedItem;
  const origin = useClientValue(() => window.location.origin, '');
  const share = (
    <ShareMenu
      url={`${origin}${to(`/producers/${producerId}${sharedSong ? `/songs/${sharedSong.songId}` : ''}`)}`}
      text={sharedSong ? `${sharedSong.title} - ${producerName}` : producerName}
      label={sharedSong ? t.shareSong : t.shareProducer}
    />
  );

  return (
    <StageLayout
      song={here ? current : null}
      cover={linkedItem?.thumb ?? cover}
      label={linkedItem ? t.playSong(linkedItem.title) : t.playProducer}
      onPlay={() => start(linkedItem?.songId)}
      heading={heading}
      play={
        <StagePlayButton
          playing={here && playing}
          onClick={() => (here ? toggle() : start(linkedItem?.songId))}
        />
      }
      share={share}
    >
      <div className="min-w-0">
        <YearJump songs={songs} />
        {/*
          行の地の色は字の手前まで広げたいので、行の内側に余白（px-3）を取る。そのぶん並び全体を外へ出し（-mx-3）、
          番号の頭が題名の頭とそろうようにする
        */}
        <ol ref={list} className="-mx-3">
          {songs.map((song, i) => {
            const active = here && current?.songId === song.id;
            const item = playable.get(song.id);
            return (
              <li
                key={song.id}
                id={`song-${song.id}`}
                data-preload={item?.service === 'niconico' ? item.videoId : undefined}
                className={`group flex items-center rounded-md border pr-1 transition-colors duration-react ${
                  active || linkedItem?.songId === song.id
                    ? 'border-line/60 bg-glass'
                    : item
                      ? 'border-transparent hover:bg-hover'
                      : 'border-transparent'
                }`}
              >
                <button
                  type="button"
                  disabled={!item}
                  {...NO_RESTORE}
                  title={item ? undefined : t.unplayable}
                  onClick={() => item && start(song.id)}
                  className="flex min-w-0 flex-1 items-center gap-4 px-3 py-2 text-left disabled:cursor-default disabled:text-muted/50"
                >
                  <span className="flex w-6 shrink-0 justify-end text-sm tabular-nums text-muted">
                    {active ? <Bars playing={playing} /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    {/* 曲名と補足の字は、ほかの曲の行（SongItem）と同じ 14px の太字と 12px の灰色 */}
                    <Marquee active={active} className="text-sm font-bold">
                      {song.title}
                    </Marquee>
                    <span className="block truncate text-xs text-muted">
                      {song.vocalists.map(voices.name).join('・')}
                      {song.year && ` ・ ${terms.year(song.year)}`}
                    </span>
                  </span>
                </button>
                {skipsNiconico && item?.service === 'niconico' && <NoAutoplay />}
                {item && <FavoriteButton song={item} quiet />}
              </li>
            );
          })}
        </ol>
      </div>
    </StageLayout>
  );
}

/** これより曲の多い人だけ、一覧の上に年の札を出す */
const YEAR_JUMP_MIN = 100;

/**
 * 一覧の上に並べる年の札。押すと、その年の最初の曲の行までスクロールする。曲の多い人（ピノキオピーは 166 曲）で、
 * 古い曲まで長くスクロールしなくて済むように。曲が少ない人や、1年に収まる人には出さない
 */
function YearJump({ songs }: { songs: Song[] }) {
  const firsts = [
    ...songs.reduce(
      (m, s) => (s.year && !m.has(s.year) ? m.set(s.year, s.id) : m),
      new Map<number, number>(),
    ),
  ];
  const show = songs.length > YEAR_JUMP_MIN && firsts.length >= 2;
  const t = useText(TEXT);
  const bar = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  // 札を押して送っているあいだと、送り終えたあとは、自分でスクロールし直すまで押した年を目立たせ続ける。
  // 一覧の最後のほうの年は、ページの下が尽きて最初の曲を札の行のすぐ下まで送れず、位置からは別の年に見えるため
  const chosen = useRef<number | null>(null);

  // いま見えている曲の年。札の行のすぐ下を通っている曲の年を、スクロールのたびに求める（年の最初の曲の位置だけを見る）
  const key = firsts.map(([y]) => y).join(',');
  useEffect(() => {
    if (!show) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (chosen.current !== null) return;
      const line = (bar.current?.getBoundingClientRect().bottom ?? 0) + YEAR_LINE_GAP;
      // ページの一番下まで来ているときは、最後のほうの年の最初の曲を札の行のすぐ下まで送れない。そのときは、
      // 画面に見えている年のうち一番古い年にする（一覧の最後の年を押したのに、一つ前の年が目立つのを避ける）
      const bottom =
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - BOTTOM_SLACK;
      let year = firsts[0][0];
      for (const [y, id] of firsts) {
        const top = document.getElementById(`song-${id}`)?.getBoundingClientRect().top;
        if (top !== undefined && top <= (bottom ? window.innerHeight - BOTTOM_LINE : line))
          year = y;
      }
      setActive(year);
    };
    const onScroll = () => {
      frame ||= requestAnimationFrame(update);
    };
    // 自分でスクロールし始めたら、押した年を保つのをやめ、また位置から求める
    const release = () => {
      chosen.current = null;
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('wheel', release, { passive: true });
    window.addEventListener('touchstart', release, { passive: true });
    window.addEventListener('keydown', release);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('wheel', release);
      window.removeEventListener('touchstart', release);
      window.removeEventListener('keydown', release);
      cancelAnimationFrame(frame);
    };
    // firsts は key が同じなら中身も同じ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, key]);

  // 目立たせた札が行の外に出ていたら、見えるところまで行をずらす
  useEffect(() => {
    if (active === null) return;
    const chip = bar.current?.querySelector<HTMLElement>(`[data-year="${active}"]`);
    const row = chip?.parentElement;
    if (!chip || !row) return;
    const left = chip.offsetLeft - row.offsetLeft;
    if (left < row.scrollLeft || left + chip.offsetWidth > row.scrollLeft + row.clientWidth) {
      row.scrollTo({ left: left - row.clientWidth / 2 + chip.offsetWidth / 2, behavior: 'smooth' });
    }
  }, [active]);

  if (!show) return null;
  return (
    // 一覧をスクロールしても、一覧の上に貼り付ける（パソコンは左の列と同じ高さ、スマホは固定した動画の下）。
    // スマホは、スクロールすると動画の下に操作の帯（player-stage.tsx の StageControls）が出るので、その下に gutter を空けて貼る
    // 地は、ほかの浮いた板（左のメニュー・再生の帯）と同じすりガラス。単色で塗ると上部の表紙の色の背景と合わなかった
    <div
      ref={bar}
      // 上下の板の後ろの覆い（ambient.tsx の EdgeVeil、z-raised）より手前に出すため、ほかの浮いた板と同じく上の段の重なり（z-header）に置く
      // スマホでは、すぐ上の操作の帯と横幅をそろえ、画面の端から gutter の位置まで広げる（gutter-x）
      className={`${GLASS} sticky top-(--below-stage-controls) z-header mb-3 max-md:gutter-x rounded-full p-1 shadow-float md:top-(--below-header) lg:top-(--stage-top)`}
    >
      {/* 1行で横にスクロールする。スクロールバーは見せず、続きがある側の端だけをぼかす（ScrollRow） */}
      <ScrollRow label={t.jumpToYear} className="gap-1">
        {firsts.map(([year, id]) => (
          <button
            key={year}
            type="button"
            data-year={year}
            aria-current={active === year ? 'true' : undefined}
            onClick={() => {
              // その年の最初の曲を、札の行のすぐ下に送る（真ん中に送ると、札の行とのあいだに前の年の曲が残り、
              // そちらの年が目立ってしまった）
              chosen.current = year;
              setActive(year);
              const row = document.getElementById(`song-${id}`);
              // 札の行は、送ったあとには貼り付いている。押した時点の位置ではなく、貼り付く位置（CSS の top）で計る
              const el = bar.current;
              const below = el
                ? parseFloat(getComputedStyle(el).top) + el.offsetHeight + YEAR_LINE_GAP
                : 0;
              // ブラウザの smooth は Firefox で一気に飛んだので、自前で送る（motion.ts）
              if (row) glideWindowTo(window.scrollY + row.getBoundingClientRect().top - below);
            }}
            className={`shrink-0 rounded-full px-3 py-1 font-tech text-xs font-black tracking-wider transition duration-react active:scale-95 ${
              active === year
                ? 'bg-miku text-on-miku'
                : 'text-muted hover:bg-hover hover:text-foreground'
            }`}
          >
            {year}
          </button>
        ))}
      </ScrollRow>
    </div>
  );
}
