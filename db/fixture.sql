-- CI と E2E テストで使う、小さな台帳。本物の取り込み（scripts/ingest.ts）は VocaDB を叩くので、CI では使わない。
-- 1人のボカロPに、YouTube で流せる曲を9曲と、ニコニコにしか本家が無い曲（ニコニコで流す）を1曲。
-- 10曲にしているのは、ボカロPの画面が検索に載る下限（site.ts の MIN_INDEXED_SONGS）に届かせ、Lighthouse の SEO の採点を
-- noindex で落とさないため（2026-11-26）。足した6曲は、E2E が見る年（2009・2010・2016・2024）を避けて選んだ
insert into producer (id, name, picture, complete) values
  (45, 'DECO＊27', null, true),
  (9999, '合作の相手', null, false);
insert into vocalist (id, name, kind) values
  (1, '初音ミク', 'Vocaloid'),
  (3, 'グミ', 'Vocaloid');
insert into song (id, name, published_on, rating_score, youtube_id, niconico_id, seed, niconico_thumb) values
  (112085, 'ゴーストルール', '2016-01-08', 1613, 'KushW6zvazM', 'sm27965309', true, null),
  (1381, 'モザイクロール', '2010-07-15', 1602, 'DnLFVUi3oOU', 'sm11398357', true, null),
  (668055, 'モニタリング', '2024-11-22', 1346, 'kbNdx0yqbZE', 'sm44317852', false, null),
  (8478, '罪と罰', '2009-09-07', 577, null, 'sm8166339', false, 'https://nicovideo.cdn.nimg.jp/thumbnails/8166339/8166339'),
  (222749, '乙女解剖', '2019-01-18', 1002, '7zwCIz-Ohn4', 'sm34470195', false, null),
  (164074, 'ヒバナ', '2017-08-04', 956, 'hxSg2Ioz3LM', 'sm31685272', false, null),
  (500519, 'ラビットホール', '2023-05-19', 955, 'eSW2LVbPThw', 'sm42224358', false, null),
  (321205, 'ヴァンパイア', '2021-03-09', 899, 'e1xCOsgWG0M', 'sm38387707', false, null),
  (48029, 'ストリーミングハート', '2014-03-21', 839, '9DD6JvY06Ok', 'sm23144598', false, null),
  (14480, '39', '2012-07-27', 799, 'ecU_uJRzhfk', 'so18274463', false, null);
insert into song_producer (song_id, producer_id) values
  (112085, 45), (1381, 45), (668055, 45), (8478, 45), (668055, 9999),
  (222749, 45), (164074, 45), (500519, 45), (321205, 45), (48029, 45), (14480, 45);
insert into song_vocalist (song_id, vocalist_id) values
  (112085, 1), (1381, 3), (668055, 1), (8478, 1),
  (222749, 1), (164074, 1), (500519, 1), (321205, 1), (48029, 1), (14480, 1);
