-- 歌声の英語の名前。英語の画面で日本語の名前の代わりに出す（VocaDB の lang=English の名前から「 (Unknown)」を外したもの）。
-- 入れるのは、キャラごとにまとめた元の歌声のうち日本語の名前のものだけ（取り込みの最後に、まだ無いものを VocaDB に聞く）。
-- 英字の名前（GUMI など）と、取り込む前の行は null
alter table vocalist add column name_en text;
