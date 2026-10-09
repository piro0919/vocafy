'use client';

import { type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import type { QueueItem, Song } from '@/lib/catalog';
import { NO_RESTORE } from '@/lib/no-restore';
import { FavoriteButton } from './favorite-button';
import { Icon } from './icon';
import { Bars } from './now-playing';
import { PlayerStage, StageControls, SwipeToLeave } from './player-stage';
import { usePlayer } from './player/player-provider';
import { PlaybackMode } from './player/playback-mode';
import { Marquee } from './marquee';
import { ScrollRow } from './scroll-row';

/**
 * ボカロPの画面。左に大きなプレイヤーの置き場所、右に曲の一覧（新しい順）。
 * このボカロPの曲を流している間は、共通のプレイヤーが置き場所に重なって大きく出る。
 * ほかの曲を流しているあいだや、まだ何も流していないときは、サムネイルと再生ボタンを出す
 */
export function ProducerPlayer({
  producerId,
  heading,
  songs,
  queue,
  cover,
}: {
  producerId: number;
  /** 動画の下に出す名前。ページの側で作る */
  heading: ReactNode;
  songs: Song[];
  queue: QueueItem[];
  cover: string | null;
}) {
  const { current, playing, context, listSource, radioHome, playQueue, adoptQueue, toggle } =
    usePlayer();
  // 動画をここに大きく出すのは、この人の曲の並びを流しているときだけ。お気に入りの並び・一覧の「再生」の並び・
  // ラジオの曲は、この人の曲でもここには出さない（右下の窓のまま）。出すと、次の曲が別の人の曲になった途端に、
  // この画面にいるまま動画が右下の窓へ飛んだ
  const ownQueue = context === 'pending' || (context === 'list' && listSource === null);
  // ラジオをやめてこの人の並びに戻した直後は、流していたラジオの曲（ほかの人の曲のこともある）が終わるまでここで大きく出す
  const radioHere = radioHome === `/producers/${producerId}`;
  const ownHere = ownQueue && current?.producerId === producerId;
  const here = radioHere || ownHere;
  // 流せる曲。ニコニコにしか本家が無い曲もニコニコで流せるが、表紙の取れていない曲は流さない
  const playable = new Map(queue.map((q) => [q.songId, q]));

  // 共有されたリンク（?song=曲の id）で来たときの曲。ページは作り置きなので、住所の ?song= はサーバーでは読まずブラウザで読む
  // （サーバーで読むと開くたびに作り直しになり、DB を起こす）。開いただけでは流さない（ブラウザが押す操作の無い再生を止めるため）。
  // その曲を一覧で目立たせ、大きな再生ボタンをその曲からにする
  // この人の曲を流しているあいだは、住所に流している曲を入れる（?song=曲の id）。読み込み直したときや、
  // 住所をそのまま写して送ったときに、共有のリンクと同じくその曲から流せる。曲が変わるたびに履歴を増やさずに書き換える
  useEffect(() => {
    // ラジオで別の人の曲を流しているときは入れない（この人の画面の住所に、ほかの人の曲を指させない）
    if (!ownHere || !current) return;
    const url = new URL(window.location.href);
    // ほかの画面へ移る途中（住所がもうこの画面のものでない）は書き換えない
    if (url.pathname !== `/producers/${producerId}`) return;
    if (url.searchParams.get('song') === String(current.songId)) return;
    url.searchParams.set('song', String(current.songId));
    // 最初の引数は null にする（Next.js の資料のとおり）。今の履歴の中身（どの画面か）を写すと、画面を移る途中に
    // 前の画面の中身が新しい住所の履歴に紛れ込み、戻る操作が効かないことがあった
    window.history.replaceState(null, '', url);
  }, [ownHere, current, producerId]);

  const linked = useSyncExternalStore(noSubscribe, linkedSong, () => null);
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
    if (!here || !current || context !== 'pending') return;
    const at = queue.findIndex((q) => q.songId === current.songId);
    if (at < 0) return;
    adoptQueue(queue, at);
    document.getElementById(`song-${current.songId}`)?.scrollIntoView({ block: 'center' });
  }, [here, current, context, queue, adoptQueue]);

  const start = (songId?: number) =>
    playQueue(
      queue,
      songId
        ? Math.max(
            0,
            queue.findIndex((q) => q.songId === songId),
          )
        : 0,
    );

  const share = (
    <ShareButton producerId={producerId} songId={here ? current?.songId : linkedItem?.songId} />
  );

  return (
    // パソコンでは、一覧が長くても動画が隠れないよう、動画と再生ボタンの列ごと上に貼り付ける（sticky）。
    // 貼り付く高さは、スクロールする前の位置（上の段 68px＋余白 32px）と同じにする。ずれていると、スクロールの最初の分だけ動いてから止まった
    // スマホは画面が狭く、貼り付けると一覧が見づらくなるので、貼り付けずに縦に並べる
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
      <div className="contents lg:sticky lg:top-25 lg:block">
        <PlayerStage
          active={here}
          cover={linkedItem?.thumb ?? cover}
          label={linkedItem ? `「${linkedItem.title}」を再生` : 'このボカロPの曲を再生'}
          onPlay={() => start(linkedItem?.songId)}
        />
        <SwipeToLeave className="lg:mt-4">{heading}</SwipeToLeave>
        {/* 名前とボタンは一続きのものなので、ほかの部品のあいだ（24px）より詰める */}
        <StageControls extra={share}>
          <button
            type="button"
            onClick={() => (here ? toggle() : start(linkedItem?.songId))}
            className="flex shrink-0 items-center gap-2 rounded-full py-2 pr-5 pl-4 text-sm font-bold whitespace-nowrap bg-miku text-on-miku shadow-lg shadow-miku/30 transition-[filter,scale] duration-150 ease-out hover:brightness-110 active:scale-95"
          >
            <Icon name={here && playing ? 'pause' : 'play'} className="size-5" />
            {here && playing ? '一時停止' : '再生'}
          </button>
          {share}
          {/* スマホは下の帯にランダム・ループ・ラジオが入りきらないので、ここに置く */}
          <PlaybackMode className="md:hidden" radio />
        </StageControls>
      </div>

      <div className="min-w-0">
        <YearJump songs={songs} />
        {/*
          行の地の色は字の手前まで広げたいので、行の内側に余白（px-3）を取る。そのぶん並び全体を外へ出し（-mx-3）、
          番号の頭が題名の頭とそろうようにする
        */}
        <ol className="-mx-3">
          {songs.map((song, i) => {
            const active = here && current?.songId === song.id;
            const item = playable.get(song.id);
            return (
              <li
                key={song.id}
                id={`song-${song.id}`}
                className={`group flex items-center rounded-md pr-1 transition-colors duration-150 ${
                  active || linkedItem?.songId === song.id
                    ? 'bg-glass'
                    : item
                      ? 'hover:bg-foreground/8'
                      : ''
                }`}
              >
                <button
                  type="button"
                  disabled={!item}
                  {...NO_RESTORE}
                  title={item ? undefined : 'この曲は本家の動画の情報が足りず、再生できません'}
                  onClick={() => item && start(song.id)}
                  className="flex min-w-0 flex-1 items-center gap-4 px-3 py-2 text-left disabled:cursor-default disabled:text-muted/50"
                >
                  <span className="flex w-6 shrink-0 justify-end text-sm tabular-nums text-muted">
                    {active ? <Bars playing={playing} /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <Marquee active={active} className={active ? 'font-bold' : ''}>
                      {song.title}
                    </Marquee>
                    <span className="block truncate text-xs text-muted">
                      {song.vocalists.join('・')}
                      {song.year && ` ・ ${song.year}年`}
                    </span>
                  </span>
                </button>
                {item && <FavoriteButton song={item} />}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/** 住所は画面の中では変わらないので、見張らない */
const noSubscribe = () => () => {};

/** 住所の ?song= の曲の id。無ければ null */
function linkedSong(): number | null {
  const id = Number(new URLSearchParams(window.location.search).get('song'));
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * 共有のボタン。この人の曲を流しているときは、その曲つきのリンク（?song=）を共有する。開いた人の画面ではその曲から流せる。
 * スマホなど共有の窓（Web Share API）が出せるブラウザでは窓を出し、出せなければリンクを写す
 */
function ShareButton({ producerId, songId }: { producerId: number; songId?: number }) {
  // 共有の窓が出せないブラウザ（パソコンの多く）では、押すとリンクを写す。字は出さずアイコンだけにし、写したことはトーストで知らせる
  const canShare = useSyncExternalStore(
    noSubscribe,
    () => 'share' in navigator,
    () => true,
  );
  const what = songId ? 'この曲' : 'このボカロP';
  const label = canShare ? `${what}を共有` : `${what}のリンクをコピー`;
  const share = async () => {
    const url = new URL(`/producers/${producerId}`, window.location.origin);
    if (songId) url.searchParams.set('song', String(songId));
    const link = url.toString();
    if (canShare) {
      // 窓を閉じただけでも失敗が返るので、何もしない
      await navigator.share({ url: link }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(link);
    toast('リンクをコピーしました');
  };
  return (
    <button
      type="button"
      onClick={share}
      aria-label={label}
      title={label}
      className="grid size-10 shrink-0 place-items-center rounded-full text-muted transition-[color,scale] duration-150 ease-out hover:text-foreground active:scale-90"
    >
      <Icon name="share" className="size-5" />
    </button>
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
      const line = (bar.current?.getBoundingClientRect().bottom ?? 0) + 8;
      // ページの一番下まで来ているときは、最後のほうの年の最初の曲を札の行のすぐ下まで送れない。そのときは、
      // 画面に見えている年のうち一番古い年にする（一覧の最後の年を押したのに、一つ前の年が目立つのを避ける）
      const bottom =
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      let year = firsts[0][0];
      for (const [y, id] of firsts) {
        const top = document.getElementById(`song-${id}`)?.getBoundingClientRect().top;
        if (top !== undefined && top <= (bottom ? window.innerHeight - 40 : line)) year = y;
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
    // スマホは、スクロールすると動画の下に操作の帯（player-stage.tsx の StageControls。動画の下 12px・高さ 40px）が出るので、その下 8px に貼る
    // 地は、ほかの浮いた板（左のメニュー・再生の帯）と同じすりガラス。単色で塗ると上部の表紙の色の背景と合わなかった
    <div
      ref={bar}
      className="sticky top-[calc(56.25vw+60px)] z-10 mb-3 rounded-full border border-line/60 bg-glass p-1 shadow-lg shadow-black/5 backdrop-blur-lg backdrop-saturate-150 md:top-20 lg:top-25"
    >
      {/* 1行で横にスクロールする。スクロールバーは見せず、続きがある側の端だけをぼかす（ScrollRow） */}
      <ScrollRow label="年ごとに移動" className="gap-1">
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
              const below = el ? parseFloat(getComputedStyle(el).top) + el.offsetHeight + 4 : 0;
              if (row)
                window.scrollTo({
                  top: window.scrollY + row.getBoundingClientRect().top - below,
                  behavior: 'smooth',
                });
            }}
            className={`shrink-0 rounded-full px-3 py-1 font-tech text-xs font-black tracking-wider transition-[color,background-color,scale] duration-150 ease-out active:scale-95 ${
              active === year
                ? 'bg-miku text-on-miku'
                : 'text-muted hover:bg-foreground/8 hover:text-foreground'
            }`}
          >
            {year}
          </button>
        ))}
      </ScrollRow>
    </div>
  );
}
