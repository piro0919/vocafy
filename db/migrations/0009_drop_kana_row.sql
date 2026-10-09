-- あいうえお順の行。2026-10-10 に索引を外したので、列ごと消す（索引 song_kana_row も一緒に消える）
alter table song drop column kana_row;
