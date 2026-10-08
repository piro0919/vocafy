-- 曲の台帳。どれも VocaDB から取り込む（scripts/ingest.ts）。id は VocaDB の id をそのまま使う

-- ボカロP。曲の作者のうち、VocaDB で Producer の役割が付いた人
create table producer (
  id integer primary key,
  name text not null,
  -- VocaDB の画像。無い人は null
  picture text,
  -- その人の曲をすべて取り込んだか。false は合作の相手として名前だけ入った人で、一覧には出さない
  complete boolean not null default false
);

-- 歌声。初音ミクなどの VOCALOID に限らず、CeVIO・Synthesizer V・UTAU なども含む
create table vocalist (
  id integer primary key,
  name text not null,
  -- VocaDB の artistType（Vocaloid・CeVIO・SynthesizerV・UTAU など）
  kind text not null
);

-- 曲。本家の動画が YouTube かニコニコのどちらかにある曲だけを入れる
create table song (
  id integer primary key,
  name text not null,
  published_on date,
  -- VocaDB の評価点とお気に入りの数。種の選び方と、一覧の並びに使う
  rating_score integer not null default 0,
  favorited_times integer not null default 0,
  -- 本家の動画。YouTube を先に使い、無いときだけニコニコで流す
  youtube_id text,
  niconico_id text,
  -- 種として入ったか（false はボカロPの全曲として後から付いてきた曲）
  seed boolean not null default false,
  imported_at timestamptz not null default now(),
  check (youtube_id is not null or niconico_id is not null)
);

create table song_producer (
  song_id integer not null references song (id) on delete cascade,
  producer_id integer not null references producer (id) on delete cascade,
  primary key (song_id, producer_id)
);
create index song_producer_producer on song_producer (producer_id);

create table song_vocalist (
  song_id integer not null references song (id) on delete cascade,
  vocalist_id integer not null references vocalist (id) on delete cascade,
  -- 補助（コーラスなど）として入っている歌声
  support boolean not null default false,
  primary key (song_id, vocalist_id)
);
create index song_vocalist_vocalist on song_vocalist (vocalist_id);

create index song_rating on song (rating_score desc);
