import type { ProducerLinks } from '../../src/lib/catalog';
import type { VdbSong, VdbWebLink } from './vocadb';
import type { Source } from './dead';

/**
 * VocaDB の曲から、Vocafy に入れる部分を選び出す。DB にも VocaDB にも触らないので、テストから確かめられる
 */

/**
 * 合成音声として扱う、VocaDB の artistType。人の歌い手（OtherVocalist）や、歌声の欄に誤って入った
 * イラスト・作詞の人を拾わないよう、除く側ではなく許す側を名指しする。
 * VocaDB に新しい種類が増えたら、ここに足さない限りその歌声は入らない
 */
const SYNTH = new Set([
  'Vocaloid',
  'UTAU',
  'CeVIO',
  'SynthesizerV',
  'NEUTRINO',
  'VoiSona',
  'VOICEVOX',
  'Voiceroid',
  'ACEVirtualSinger',
  'AIVOICE',
  'NewType',
  'OtherVoiceSynthesizer',
]);

/**
 * 種の線（評価点・伝説入り・再生数）に掛からないが、本人の好みで全曲を入れるボカロP。VocaDB の番号。
 * サイトの選び方に好みが入る唯一の入り口なので、増やしすぎない
 */
export const EXTRA_PRODUCERS = [
  2954, // ずきお
  886, // kk2
  578, // AIR田F（VocaDB では AIR田）
  1049, // 磯P
  926, // 夏空P（VocaDB では成田旬）。本人が動画をすべて消しているので、下の YOUTUBE_STANDINS で補う
  317, // におP
  707, // tysP
  105759, // hissno
  332, // アヒル軍曹P
  7614, // 背脂部
  448, // ミク詐欺P
];

/**
 * 本家の動画が消えた曲に、手で当てる YouTube の動画。VocaDB の曲の番号 → 動画の ID。
 * 夏空Pの曲の動画を担当した piro（@piro0919）が上げ直したもの。VocaDB に本家の動画が残っている曲には当てない。
 * 転載を使わない決まりの例外なので、作り手の側が上げた動画に限る
 */
const YOUTUBE_STANDINS = new Map([
  [100515, 'IwvJUQzBjwE'], // 胡蝶のミメシス
  [9756, 'WAHyA3aDvAQ'], // ONE NIGHT PIECE
  [108999, 'DSJEITsGv4Q'], // オオカミ少女
  [35076, 'cs9eHyhmHks'], // ショットガン・ペインティング
  [7326, 'jH5XCof23sI'], // ローレライの衣
  [154680, 'EqAXhEwMNuY'], // Marriage Fraud
  [103770, 'CpwGKX2gNQo'], // 虹色スペクトル
]);

/**
 * 入れる曲の種類。オリジナル曲と、その出し直し（リマスター・リミックス・PV 版）。出し直しは VocaDB では元の曲と別の項目で、
 * よく聴かれているのが出し直しの版のことがある（磯Pの「袖触れ合うも他生の縁」のリメイク、cosMo@暴走Pの「初音ミクの消失 -DEAD END-」）。
 * 元の曲を差し替えず、別の1曲として並べる。表紙と投稿日が違うので見分けられる。カバーや人が歌った曲は入れない。
 * 出し直しの版は本人のものだけ（isOwnVersion）。
 * 種の線（評価点・YouTube の再生数）はオリジナル曲だけで選ぶ（scripts/lib/vocadb.ts）
 */
export const SONG_TYPES = ['Original', 'Remaster', 'Remix', 'MusicPV'];

const has = (categories: string, name: string) =>
  categories.split(',').some((c) => c.trim() === name);

/**
 * VocaDB で作者に誤って入っている人。「曲の番号:ボカロPの番号」。曲そのものは、ほかの作者の画面に残す
 */
const WRONG_CREDITS = new Set([
  // 寝坊（雪乃トケルらの合作）。動画の題名の参加者に成田旬（夏空P）がいない
  '949313:926',
]);

/**
 * 作者とみなす役割（2026-10-12 に本人と決めた）。作曲・作詞をした人だけを作者にし、編曲・調声・ミックスだけで載った人は
 * 入れない。入れていたころは、DECO＊27 の「Sprite Girl」が編曲の emon(Tes.) の画面に、調声の仕事が多いびびの画面に
 * 他人の曲が 250 曲中 249 曲並んでいた（DB の 29,260 曲のうち 2,121 曲に、作曲も作詞もしていない作者が付いていた）
 */
const AUTHOR_ROLES = ['Default', 'Composer', 'Lyricist'];

/** 作者の候補（Producer の役割が付いた人）。VocaDB に登録の無い人・補助の人・誤って入っている人は除く */
function creditedOf(song: VdbSong) {
  return (song.artists ?? []).filter(
    (a) =>
      a.artist &&
      has(a.categories, 'Producer') &&
      !a.isSupport &&
      !WRONG_CREDITS.has(`${song.id}:${a.artist.id}`),
  );
}

/**
 * 曲の作者（Producer の役割が付いた人のうち、作曲・作詞をした人。AUTHOR_ROLES）。編曲だけで載った人も、本家の動画を
 * 自分で上げていれば作者にする（uploader。markUploaders）。作曲・作詞の人が1人も載っていない曲
 * （ぬゆりとバルーンの「ミザン」は2人とも編曲・調声）は、曲が消えないよう Producer の人を全員作者にする。
 * VocaDB に登録の無い人と、補助（isSupport）の人は入れない。
 * 補助は調声や編曲を手伝った人で、拾うとその人の全曲がついてくる。ギガの「ガッチュー！」の調声に載った
 * 「Unknown producer(s)」から作者不明の 1321 曲が、ほかの人の曲の調声からずきお・かごめPなど 15 人の曲が入っていた
 */
export function producersOf(song: VdbSong) {
  const credited = creditedOf(song);
  const authors = credited.filter(
    (a) => a.uploader || AUTHOR_ROLES.some((r) => has(a.effectiveRoles ?? 'Default', r)),
  );
  return (authors.length > 0 ? authors : credited).flatMap((a) => (a.artist ? [a.artist] : []));
}

/**
 * 編曲だけで載っていて、作者から外れている人か（2026-10-12 に本人と決めた）。そうなら、本家の動画を上げた人を確かめ
 * （scripts/lib/uploaders.ts）、本人なら作者に戻す。ずきおの「制空権」は作曲・作詞がアキバヲタPで、ずきおは編曲だけだが、
 * 動画はずきおが上げている。emon(Tes.) が編曲した DECO＊27 の曲は DECO＊27 が上げているので戻らない。
 * 調声・ミックスだけの人は、本家の動画を上げていても戻さない（びびの調声の曲など、自分の曲として出す形がほぼ無い）
 */
export function arrangedOnly(song: VdbSong, producerId: number): boolean {
  const credit = creditedOf(song).find((a) => a.artist?.id === producerId);
  return (
    credit !== undefined &&
    !credit.uploader &&
    has(credit.effectiveRoles ?? 'Default', 'Arranger') &&
    !producersOf(song).some((p) => p.id === producerId)
  );
}

/** 本家の動画を上げたと確かめた人（producerIds）に uploader の印を付けた曲。元の曲は書き換えない */
export function markUploaders(song: VdbSong, producerIds: Set<number>): VdbSong {
  return {
    ...song,
    artists: song.artists?.map((a) =>
      a.artist && producerIds.has(a.artist.id) ? { ...a, uploader: true } : a,
    ),
  };
}

/** 本家の動画（YouTube とニコニコ。Topic も含む）。だれが上げたかを確かめるのに使う */
type Video = { service: 'youtube' | 'niconico'; id: string };

export function originalVideos(song: VdbSong): Video[] {
  return (song.pvs ?? []).flatMap((pv): Video[] => {
    if (pv.pvType !== 'Original') return [];
    if (pv.service === 'Youtube') return [{ service: 'youtube', id: pv.pvId }];
    if (pv.service === 'NicoNicoDouga') return [{ service: 'niconico', id: pv.pvId }];
    return [];
  });
}

/**
 * ボカロPのアカウント。VocaDB のリンクのうち、YouTube のチャンネルとニコニコのユーザー。動画を上げた人と照らし合わせるので、
 * linksOf と違って Official 以外・閉じたもの・サブも使う（昔のアカウントから上げた動画もある）。
 * YouTube の /channel/ はそのまま番号、/@ と /user/ と /c/ は名前で、Data API で番号に引き直す
 */
export type Accounts = {
  youtube: string[];
  youtubeNames: string[];
  niconico: string[];
};

/** 住所の中の %xx を戻す。壊れた書き方はそのまま */
function decoded(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function accountsOf(links: VdbWebLink[]): Accounts {
  const accounts: Accounts = { youtube: [], youtubeNames: [], niconico: [] };
  for (const { url } of links) {
    const channel = /youtube\.com\/channel\/(UC[\w-]+)/.exec(url);
    const named = /youtube\.com\/(@|user\/|c\/)([^/?#]+)/.exec(url);
    const user = /nicovideo\.jp\/user\/(\d+)/.exec(url);
    if (channel) accounts.youtube.push(channel[1]);
    else if (named) accounts.youtubeNames.push(`${named[1]}${decoded(named[2])}`);
    else if (user) accounts.niconico.push(user[1]);
  }
  return accounts;
}

/** 曲の歌声のうち、合成音声のもの */
export function vocalistsOf(song: VdbSong) {
  return (song.artists ?? []).flatMap((a) =>
    a.artist && has(a.categories, 'Vocalist') && SYNTH.has(a.artist.artistType)
      ? [{ ...a.artist, support: a.isSupport }]
      : [],
  );
}

/** YouTube が配信の音源から自動で作った動画か（「〇〇 - Topic」のチャンネル）。絵はジャケットの静止画 */
const isTopic = (pv: { author?: string }) => / - Topic$/.test(pv.author ?? '');

/**
 * 流せる本家の動画。YouTube を先に、無ければニコニコ。転載（Reprint）は使わない。
 * YouTube の本家が何本かあるときは、Topic でない動画（MV）を先に選ぶ。Topic しか無い曲は youtubeTopic を立て、
 * 設定でニコニコの PV を選んだ人にはニコニコで流す（src/components/player/pv-choice.ts）。
 * YouTube に本家が無い曲は、手で当てた動画（YOUTUBE_STANDINS）があればそれを使う。
 * ニコニコの表紙は動画の ID から組み立てられないので、VocaDB の持つ住所も拾う。
 * 本家の動画が1本も無い曲は null
 */
export function sourcesOf(song: VdbSong): Source | null {
  const originals = (service: string) =>
    (song.pvs ?? []).filter(
      (pv) => pv.service === service && pv.pvType === 'Original' && !pv.disabled,
    );
  const youtubes = originals('Youtube');
  const youtube = youtubes.find((pv) => !isTopic(pv)) ?? youtubes[0];
  const youtubeId = youtube?.pvId ?? YOUTUBE_STANDINS.get(song.id) ?? null;
  const niconico = originals('NicoNicoDouga')[0];
  const niconicoId = niconico?.pvId ?? null;
  return youtubeId || niconicoId
    ? {
        youtubeId,
        youtubeTopic: youtube !== undefined && isTopic(youtube),
        niconicoId,
        niconicoThumb: niconico?.thumbUrl ?? null,
      }
    : null;
}

/** VocaDB の、作者の分からない曲をまとめる入れ物（Unknown producer(s)） */
export const UNKNOWN_PRODUCER = 23966;

/**
 * 出し直しの版のうち入れないもの。曲名で見分ける（2026-10-10 に本人の版 3807 曲の曲名と照らして決めた）。
 * 単語の live や reverb で引くと、Prayer Will Live や Clean Tears の Reverberations のような曲名まで外れた
 */
const NOT_A_VERSION = [
  // 元の曲を速く・遅くしただけ
  /sped ?up|speed ?up|slowed/i,
  // フル版がある
  /\bshort\b|ショート|tv ?size/i,
  // 歌が無い
  /\binst(rumental)?\b|off ?vocal|karaoke|カラオケ/i,
  // ライブ。マジカルミライの映像のように、上げているのがボカロP本人でないことが多い
  /live ?(ver|mix|edit|arrange|recording|session|remix)|[(\[（【~\-–] ?(acoustic )?live\b|\d{4} live\b|\blive[)\]）】~\-]|」 ?live|ライブ(バージョン|ver)|[（(]ライブ[）)]|実演盤/i,
];

/**
 * 本人の出し直しか。オリジナル曲は常に true。出し直しの版は、元の曲（originalVersionId）が分かり、作者が全員元の曲の作者であるもの。
 * 他人のリミックスやアレンジ（2026-10-10 に数えて 1279 曲）と、元の曲が分からない版（888 曲）は入れない。
 * 本人の版でも、sped up・短い版・インスト・ライブ（NOT_A_VERSION）と、作者不明の入れ物の版は入れない。
 * アコギのアレンジや 8bit 版のような、別の聴きどころのある版は入れる。ownersOf は元の曲の作者の番号で、分からなければ undefined
 */
export function isOwnVersion(
  song: VdbSong,
  ownersOf: (originalId: number) => Set<number> | undefined,
): boolean {
  if (song.songType === 'Original') return true;
  if (NOT_A_VERSION.some((re) => re.test(song.name))) return false;
  if (producersOf(song).some((p) => p.id === UNKNOWN_PRODUCER)) return false;
  const owners =
    song.originalVersionId === undefined ? undefined : ownersOf(song.originalVersionId);
  return owners !== undefined && producersOf(song).every((p) => owners.has(p.id));
}

/** その曲の本家の動画（YouTube とニコニコ） */
function videosOf(song: VdbSong): string[] {
  const found = sourcesOf(song);
  return [found?.youtubeId, found?.niconicoId].filter((v) => v !== null && v !== undefined);
}

/** 出し直しの版の動画。DB のほかの曲がもう使っているかを引くのに使う（dropSharedVideos の taken） */
export function versionVideos(songs: VdbSong[]): string[] {
  return songs.filter((s) => s.songType !== 'Original').flatMap(videosOf);
}

/**
 * 同じ動画は1曲にだけ使う。オリジナル曲を先に、出し直しの版は古いものから動画を取り、もう取られた動画を使う出し直しの版を外す。
 * 出し直しの版が元の曲と同じ動画で登録されていることがある（quiz と quiz (エルゴスム ver.)）。
 * taken は DB のほかの曲がもう使っている動画（新しく出た曲を足すだけのときは、元の曲が今回集めた曲に無いため）
 */
export function dropSharedVideos(songs: VdbSong[], taken: Set<string>): VdbSong[] {
  const used = new Set(taken);
  const order = [...songs].sort(
    (a, b) =>
      Number(a.songType !== 'Original') - Number(b.songType !== 'Original') ||
      (a.publishDate ?? '').localeCompare(b.publishDate ?? ''),
  );
  const dropped = new Set<number>();
  for (const s of order) {
    const videos = videosOf(s);
    if (s.songType !== 'Original' && videos.some((v) => used.has(v))) {
      dropped.add(s.id);
      continue;
    }
    for (const v of videos) used.add(v);
  }
  return songs.filter((s) => !dropped.has(s.id));
}

/** Vocafy に入れられる曲か。オリジナル曲かその出し直しで、作者と合成音声の歌声があり、本家の動画がある */
export function isEligible(song: VdbSong): boolean {
  return (
    SONG_TYPES.includes(song.songType) &&
    producersOf(song).length > 0 &&
    vocalistsOf(song).length > 0 &&
    sourcesOf(song) !== null
  );
}

/** 公式サイトとして拾わない場所。SNS や投稿サイトのページが Website の名前で入っていることがある */
const NOT_WEBSITE =
  /(^|\.)(twitter\.com|x\.com|youtube\.com|youtu\.be|nicovideo\.jp|instagram\.com|tiktok\.com|facebook\.com|piapro\.jp|pixiv\.net|soundcloud\.com)$/;

/**
 * ボカロPの本人の場所を、VocaDB の Official のリンクからサービスごとに1本だけ選ぶ。閉じたリンクは使わない。
 * 同じサービスに何本もあるとき（YouTube が自動で作ったチャンネル、サブのアカウント、昔のマイリストなど）は、
 * 説明が素のもの（「YouTube Channel」「NND Account」）を先に使う
 */
export function linksOf(links: VdbWebLink[]): ProducerLinks {
  const official = links.flatMap((l) => {
    if (l.category !== 'Official' || l.disabled) return [];
    try {
      const url = new URL(/^https?:\/\//.test(l.url) ? l.url : `https://${l.url}`);
      return [{ url, description: l.description.trim() }];
    } catch {
      return [];
    }
  });
  const host = (u: URL) => u.hostname.replace(/^www\./, '');
  const side = (d: string) => /auto-generated|youtube music|topic|sub|2nd|alt|old|game|旧/i.test(d);
  const first = (
    match: (u: URL, d: string) => boolean,
    rank: (u: URL, d: string) => number = () => 0,
  ) =>
    official
      .filter(({ url, description }) => match(url, description) && !side(description))
      .sort((a, b) => rank(a.url, a.description) - rank(b.url, b.description))[0]?.url;

  const x = first(
    (u) => /^(twitter|x)\.com$/.test(host(u)) && /^\/\w+\/?$/.test(u.pathname),
    (_, d) => (/^(twitter|x)$/i.test(d) ? 0 : 1),
  );
  const youtube = first(
    (u) => host(u) === 'youtube.com' && /^\/(@|channel\/|user\/|c\/)/.test(u.pathname),
    (_, d) => (d === 'YouTube Channel' ? 0 : 1),
  );
  const niconico = first(
    (u) =>
      (host(u) === 'nicovideo.jp' && /^\/(user|mylist)\//.test(u.pathname)) ||
      host(u) === 'ch.nicovideo.jp',
    (u) => (u.pathname.startsWith('/mylist/') ? 1 : 0),
  );
  const website = first(
    (u, d) =>
      /^(official )?(web ?site|homepage|home page|official site)\b/i.test(d) &&
      !NOT_WEBSITE.test(host(u)),
  );

  const result: ProducerLinks = {};
  if (x) result.x = `https://x.com${x.pathname.replace(/\/$/, '')}`;
  // YouTube は ?si= などの追跡の印を落とす。/videos のような後ろの区切りも落としてチャンネルの頭にする
  if (youtube)
    result.youtube = `https://www.youtube.com${youtube.pathname.match(/^\/(@[^/]+|channel\/[^/]+|user\/[^/]+|c\/[^/]+)/)![0]}`;
  if (niconico)
    result.niconico = `https://${niconico.hostname}${niconico.pathname}`.replace(
      /^http:/,
      'https:',
    );
  if (website) result.website = website.href;
  return result;
}
