-- 再生中に「流せない」と分かった動画。プレイヤーの知らせを受けた API（src/app/api/unplayable/route.ts）が、
-- サーバーから YouTube の oEmbed やニコニコの動画の情報に問い合わせ直し、本当に流せないと確かめたものだけを書く。
-- 取り込み（scripts/ingest.ts）もこの表を見て、ここにある動画を使わない（取り込みの手元の確かめの結果は30日残るので、
-- それだけだと外した曲が次の取り込みで戻ってしまう）
create table unplayable (
  service text not null check (service in ('youtube', 'niconico')),
  video_id text not null,
  checked_at timestamptz not null default now(),
  primary key (service, video_id)
);
