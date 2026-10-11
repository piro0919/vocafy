-- 英語の画面に出す名前（2026-10-12）。
-- song.name_en: VocaDB の English の名前。曲名と同じなら null。英語の画面では、片仮名と英字だけの曲名はこれを、
--   漢字やかなを含む曲名はローマ字（song.romaji）を主に出す（src/lib/english-name.ts）
-- song.original_id: 出し直しの版（リミックス・別の版）の元の曲。名前の無い版に、元の曲の英語の名前とローマ字を借りる
-- producer.name_en: VocaDB の English の名前、無ければ Romaji の名前。日本語の字を含む名前の人だけ取り込みの最後に聞いて入れる。
--   どちらも無い人は日本語の名前をそのまま入れる（毎回聞き直さないため）
alter table song add column name_en text;
alter table song add column original_id integer;
alter table producer add column name_en text;
