-- ニコニコの本家の動画の表紙。YouTube と違って動画の ID から住所を組み立てられない（新しい動画ほど末尾に番号が付く）ので、
-- VocaDB が持つ住所をそのまま残す。取り込む前の行と、ニコニコに本家が無い曲は null
alter table song add column niconico_thumb text;
