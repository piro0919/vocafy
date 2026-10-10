import { cdnCache } from '@/lib/cache-control';

/** 説明文を CDN に置く日数。書き換えられることがまれなので長めにする */
const CACHE_DAYS = 14;

const AGENT = { 'User-Agent': 'Vocafy (https://vocafy.kkweb.io)' };

/**
 * 動画の説明文。YouTube は Data API の snippet（1本で1単位）、ニコニコは getthumbinfo の description。
 * DB には残さず、流すたびにその場で聞く（YouTube の API のデータを長く持たないため）。
 * 取れなければ空の文字列を返す。鍵（YOUTUBE_API_KEY）が無い環境でも空を返し、画面には何も出ない。
 * CDN に14日置き、古くなってからも裏で取り直すあいだ14日まで古い方を返す（説明文はめったに変わらないため。2026-10-11）。
 * 合わせて28日にしているのは、YouTube の開発者向けポリシーが API のデータを持つのを30日までとしているため
 */
export async function GET(_req: Request, ctx: RouteContext<'/api/description/[service]/[id]'>) {
  const { service, id } = await ctx.params;
  const text = service === 'youtube' ? await youtube(id) : await niconico(id);
  return Response.json(
    { text },
    { headers: { 'Cache-Control': cdnCache(CACHE_DAYS, CACHE_DAYS) } },
  );
}

async function youtube(id: string) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return '';
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(id)}&key=${key}`,
  );
  if (!res.ok) return '';
  const data = (await res.json()) as { items?: { snippet: { description: string } }[] };
  return data.items?.[0]?.snippet.description ?? '';
}

/**
 * ニコニコは埋め込みのページの data-props（HTML の文字参照で包んだ JSON）の description から取る。改行が <br> で入っている。
 * getthumbinfo の description は改行が取り除かれた1行の文で、画面で読みにくかった（2026-10-11）。
 * 埋め込みのページが取れないとき（センシティブ扱いの動画は 403）は、getthumbinfo の1行の文に戻る
 */
async function niconico(id: string) {
  const fromEmbed = await embedDescription(id);
  if (fromEmbed !== null) return fromEmbed;
  const res = await fetch(`https://ext.nicovideo.jp/api/getthumbinfo/${encodeURIComponent(id)}`, {
    headers: AGENT,
  });
  if (!res.ok) return '';
  const raw = (await res.text()).match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? '';
  return fromHtml(decode(raw));
}

async function embedDescription(id: string): Promise<string | null> {
  try {
    const res = await fetch(`https://embed.nicovideo.jp/watch/${encodeURIComponent(id)}`, {
      headers: AGENT,
    });
    if (!res.ok) return null;
    const props = (await res.text()).match(/data-props="([^"]*)"/)?.[1];
    if (!props) return null;
    const { description } = JSON.parse(decode(props)) as { description?: unknown };
    return typeof description === 'string' ? fromHtml(description) : null;
  } catch {
    return null;
  }
}

/** 説明文の HTML を文にする。改行（<br>）だけ残してタグを外し、文字参照を戻す */
function fromHtml(html: string) {
  return decode(html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).trim();
}

function decode(s: string) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&');
}
