-- CI と E2E テストで使う、小さな台帳。本物の取り込み（scripts/ingest.ts）は VocaDB を叩くので、CI では使わない。
-- 1人のボカロPに、YouTube で流せる曲を3曲と、ニコニコにしか本家が無い曲を1曲
insert into producer (id, name, picture, complete) values
  (45, 'DECO＊27', null, true),
  (9999, '合作の相手', null, false);
insert into vocalist (id, name, kind) values
  (1, '初音ミク', 'Vocaloid'),
  (3, 'グミ', 'Vocaloid');
insert into song (id, name, published_on, rating_score, youtube_id, niconico_id, seed) values
  (112085, 'ゴーストルール', '2016-01-08', 1613, 'KushW6zvazM', 'sm27965309', true),
  (1381, 'モザイクロール', '2010-07-15', 1602, 'DnLFVUi3oOU', 'sm11398357', true),
  (668055, 'モニタリング', '2024-11-22', 1346, 'kbNdx0yqbZE', 'sm44317852', false),
  (8478, '罪と罰', '2009-09-07', 577, null, 'sm8166339', false);
insert into song_producer (song_id, producer_id) values
  (112085, 45), (1381, 45), (668055, 45), (8478, 45), (668055, 9999);
insert into song_vocalist (song_id, vocalist_id) values
  (112085, 1), (1381, 3), (668055, 1), (8478, 1);
