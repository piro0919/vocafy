#!/bin/sh
# Vercel の Ignored Build Step（vercel.json の ignoreCommand）。exit 0 で配備を飛ばし、exit 1 で作る。
#
# 本番では、前の配備から増えたコミットがすべて Renovate の依存の更新なら配備しない（2026-11-19 に本人と決めた）。
# 配備のたびに作り置きのページが捨てられ、開かれるたびに DB を起こして Neon の無料の計算時間を食うため
# （11-15〜16 は Renovate のマージだけで8回配備していた）。飛ばした更新は、次に人が push したときか、
# 毎週の取り込みのあとの配備（.github/workflows/ingest.yml の Deploy Hook）で一緒に出る。
#
# Deploy Hook の配備にもこの判定が掛かり、Vercel からは push と見分けられない。そこで、先頭のコミットから
# RECENT 秒より後の配備は作る。push で始まった配備はマージの直後に走るので飛ばし、取り込みの Deploy Hook は
# 先頭が Renovate のマージの直後なら RECENT 秒まで待ってから呼ぶ（ingest.yml）。
# 確かめられないとき（前の配備のコミットが無い・浅い clone で見つからない）は作る。
RECENT=1800

[ "$VERCEL_ENV" = "production" ] || exit 1
[ -n "$VERCEL_GIT_PREVIOUS_SHA" ] || exit 1
authors=$(git log --format='%an' "$VERCEL_GIT_PREVIOUS_SHA..HEAD" 2>/dev/null) || exit 1
# 同じコミットの配備し直し
[ -n "$authors" ] || exit 1
if echo "$authors" | grep -qvx 'renovate\[bot\]'; then exit 1; fi
committed=$(git log -1 --format=%ct HEAD) || exit 1
[ $(($(date +%s) - committed)) -lt "$RECENT" ] || exit 1
echo "依存の更新だけなので、本番には配備しない"
exit 0
