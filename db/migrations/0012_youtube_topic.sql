-- YouTube の動画が、配信の音源から YouTube が自動で作った静止画の動画（「〇〇 - Topic」のチャンネル）か（2026-10-12）。
-- 立っていてニコニコに本家があれば、設定でニコニコの PV を選んだ人にはニコニコで流す（src/components/player/pv-choice.ts）
alter table song add column youtube_topic boolean not null default false;
