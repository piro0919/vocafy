-- お気に入りの曲を手で並べ替えられるようにする。並びは position の小さいものが先。
-- 新しく足した曲は先頭に入れる（いまある最小の position より1つ小さくする）。
-- これまでの並び（足した順の新しいものが先）を、そのまま position にする
alter table favorite_song add column position integer;

update favorite_song f
set position = t.ord
from (
  select user_id, song_id, row_number() over (partition by user_id order by added_at desc) as ord
  from favorite_song
) t
where f.user_id = t.user_id and f.song_id = t.song_id;

alter table favorite_song alter column position set not null;
