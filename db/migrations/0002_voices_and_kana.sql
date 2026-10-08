-- 歌声をキャラごとにまとめるための、元の歌声。「初音ミク V4X (Dark)」なら「初音ミク」。
-- VocaDB の baseVoicebank を根までたどった先の id で、自分が根なら自分の id。取り込む前の行は null（自分が根として扱う）
alter table vocalist add column base_id integer;
create index vocalist_base on vocalist (base_id);

-- 曲名の頭の文字で引く索引の行（あ・か・さ…・abc・etc）。決め方は src/lib/kana.ts。取り込む前の行は null
alter table song add column kana_row text;
create index song_kana_row on song (kana_row);
