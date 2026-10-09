import type { VdbSong } from './vocadb';

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
