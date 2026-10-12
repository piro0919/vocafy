/**
 * 取り込みで、流せない動画を曲の流す先から外す処理（scripts/ingest.ts）。DB にも外の窓口にも触らないので、テストから確かめられる
 */

/** 曲の流す先。YouTube を先に使い、無いときだけニコニコで流す */
export type Source = {
  youtubeId: string | null;
  /** YouTube の動画が、配信の音源から自動で作られた静止画の動画（Topic）か */
  youtubeTopic: boolean;
  niconicoId: string | null;
  niconicoThumb: string | null;
};

/** 流せない動画を外した流す先。YouTube もニコニコも外れたら、その曲は入れない（dropped） */
export function withoutDead(
  found: Source,
  dead: { youtube: ReadonlySet<string>; niconico: ReadonlySet<string> },
): Source {
  return {
    ...found,
    youtubeId: found.youtubeId && dead.youtube.has(found.youtubeId) ? null : found.youtubeId,
    niconicoId: found.niconicoId && dead.niconico.has(found.niconicoId) ? null : found.niconicoId,
  };
}

/** YouTube とニコニコのどちらでも流せなくなった曲か */
export function isDropped(found: Source): boolean {
  return !found.youtubeId && !found.niconicoId;
}

/**
 * 流せないとみなした動画が多すぎて、書かずに止めるときの文。止めなければ null。
 * 数えるのは、この取り込みで外の窓口に確かめ直して流せないと分かった本数だけにする。再生中の知らせで記録した動画
 * （unplayable の表）は増える一方なので、足して数えると、いずれ毎週の取り込みが止まり続ける
 */
export function tooManyDead(
  checked: { youtube: number; niconico: number },
  limit: { youtube: number; niconico: number },
): string | null {
  if (checked.niconico > limit.niconico) {
    return `ニコニコで流せない動画が ${limit.niconico} 本を超えたので書きません。data/raw/niconico/embed.json を確かめてください`;
  }
  if (checked.youtube > limit.youtube) {
    return `YouTube で流せない動画が ${limit.youtube} 本を超えたので書きません。data/raw/youtube/oembed.json を確かめてください`;
  }
  return null;
}
