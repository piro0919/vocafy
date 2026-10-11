import { beforeEach, describe, expect, it } from 'vitest';
import {
  mergeFavorites,
  readFavorites,
  reorderFavoriteSongs,
  setFavorite,
} from '@/lib/account-favorites';
import { addUser, query, seed } from './seed';

const USER = 'u1';
const OTHER = 'u2';

const songIds = async (user = USER) => (await readFavorites(user)).songs.map((s) => s.songId);
const producerIds = async (user = USER) => (await readFavorites(user)).producers.map((p) => p.id);

beforeEach(async () => {
  await seed({
    producers: [{ id: 1 }, { id: 2 }, { id: 3 }],
    songs: [1, 2, 3, 4, 5].map((id) => ({ id, publishedOn: '2020-01-01' })),
  });
  await addUser(USER);
  await addUser(OTHER);
});

describe('アカウントのお気に入り', () => {
  it('新しく足した曲は先頭に入る', async () => {
    await setFavorite(USER, 'song', 1, true);
    await setFavorite(USER, 'song', 2, true);
    await setFavorite(USER, 'song', 3, true);
    expect(await songIds()).toEqual([3, 2, 1]);
  });

  it('外すと消え、同じ曲を二度足しても1つ', async () => {
    await setFavorite(USER, 'song', 1, true);
    await setFavorite(USER, 'song', 1, true);
    await setFavorite(USER, 'song', 2, true);
    await setFavorite(USER, 'song', 2, false);
    expect(await songIds()).toEqual([1]);
  });

  it('人ごとに分かれる', async () => {
    await setFavorite(USER, 'song', 1, true);
    expect(await songIds(OTHER)).toEqual([]);
  });

  it('並べ直した順で出し、並べ直したあとに足した曲は先頭に入る', async () => {
    for (const id of [1, 2, 3]) await setFavorite(USER, 'song', id, true);
    await reorderFavoriteSongs(USER, [1, 3, 2]);
    expect(await songIds()).toEqual([1, 3, 2]);
    await setFavorite(USER, 'song', 4, true);
    expect(await songIds()).toEqual([4, 1, 3, 2]);
  });

  it('ブラウザに残っていた曲は、その順のまま、いまの先頭より前に足す。もうある曲はそのまま', async () => {
    await setFavorite(USER, 'song', 1, true);
    await mergeFavorites(USER, 'song', [3, 1, 2]);
    expect(await songIds()).toEqual([3, 2, 1]);
  });

  it('ボカロPは、足した順の新しいものが先', async () => {
    // アカウントにある分は、ログインして取り込むより前に入れたもの
    await setFavorite(USER, 'producer', 1, true);
    await query("update favorite_producer set added_at = now() - interval '1 day'");
    await mergeFavorites(USER, 'producer', [2, 3]);
    expect(await producerIds()).toEqual([2, 3, 1]);
  });

  it('台帳から消えた曲と人は出さない', async () => {
    await setFavorite(USER, 'song', 1, true);
    await setFavorite(USER, 'song', 99, true);
    await setFavorite(USER, 'producer', 99, true);
    expect(await songIds()).toEqual([1]);
    expect(await producerIds()).toEqual([]);
  });
});
