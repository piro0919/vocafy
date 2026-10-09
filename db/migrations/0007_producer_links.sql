-- ボカロPの本人の場所（X・YouTube・ニコニコ・公式サイト）。VocaDB の Official のリンクから、サービスごとに1本だけ選ぶ
-- （scripts/lib/pick.ts の linksOf）。{"x": "https://x.com/…", "youtube": …} の形で、無いサービスの鍵は持たない
alter table producer add column links jsonb not null default '{}';
