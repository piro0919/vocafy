-- 曲名のローマ字。VocaDB の Romaji の名前で、漢字やかなの曲名をローマ字でも探せるようにする（検索の索引に入れる）。
-- ローマ字の名前が無い曲と、取り込む前の行は null
alter table song add column romaji text;
