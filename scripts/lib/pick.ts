import type { ProducerLinks } from '../../src/lib/catalog';
import type { VdbSong, VdbWebLink } from './vocadb';

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

const has = (categories: string, name: string) =>
  categories.split(',').some((c) => c.trim() === name);

/**
 * 曲の作者（Producer の役割が付いた人）。VocaDB に登録の無い人と、補助（isSupport）の人は入れない。
 * 補助は調声や編曲を手伝った人で、拾うとその人の全曲がついてくる。ギガの「ガッチュー！」の調声に載った
 * 「Unknown producer(s)」から作者不明の 1321 曲が、ほかの人の曲の調声からずきお・かごめPなど 15 人の曲が入っていた
 */
export function producersOf(song: VdbSong) {
  return (song.artists ?? []).flatMap((a) =>
    a.artist && has(a.categories, 'Producer') && !a.isSupport ? [a.artist] : [],
  );
}

/** 曲の歌声のうち、合成音声のもの */
export function vocalistsOf(song: VdbSong) {
  return (song.artists ?? []).flatMap((a) =>
    a.artist && has(a.categories, 'Vocalist') && SYNTH.has(a.artist.artistType)
      ? [{ ...a.artist, support: a.isSupport }]
      : [],
  );
}

/**
 * 流せる本家の動画。YouTube を先に、無ければニコニコ。転載（Reprint）は使わない。
 * ニコニコの表紙は動画の ID から組み立てられないので、VocaDB の持つ住所も拾う。
 * 本家の動画が1本も無い曲は null
 */
export function sourcesOf(song: VdbSong): {
  youtubeId: string | null;
  niconicoId: string | null;
  niconicoThumb: string | null;
} | null {
  const original = (service: string) =>
    song.pvs?.find((pv) => pv.service === service && pv.pvType === 'Original' && !pv.disabled);
  const youtubeId = original('Youtube')?.pvId ?? null;
  const niconico = original('NicoNicoDouga');
  const niconicoId = niconico?.pvId ?? null;
  return youtubeId || niconicoId
    ? { youtubeId, niconicoId, niconicoThumb: niconico?.thumbUrl ?? null }
    : null;
}

/** Vocafy に入れられる曲か。オリジナル曲で、作者と合成音声の歌声があり、本家の動画がある */
export function isEligible(song: VdbSong): boolean {
  return (
    song.songType === 'Original' &&
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
