---
name: sentry
description: Vocafy の Sentry に上がった課題を棚卸しする。未解決の課題を API で読み、原因ごとに振り分けて短く報告し、本人が選んだものを直す。「Sentry 見て」「Sentry の棚卸し」「エラー来てる？」と言われたときに使う。
---

# Sentry の棚卸し

集めて振り分けて報告するまでを1回で行う。直すのは報告のあと、本人が選んだものだけ。

## 1. 集める

Playwright（`mcp__playwright-login__*`）で `https://kk-web.sentry.io/issues/?project=4512250988003328` を開き、
ページの中から fetch で API を読む。鍵は要らない（ログインの Cookie で通る）。

- 課題の一覧: `/api/0/organizations/kk-web/issues/?project=4512250988003328&statsPeriod=14d&query=is:unresolved&limit=50`
  - 使う欄は id・shortId・count・firstSeen・lastSeen・substatus
  - title は `t.captureMessage` のように縮めた関数名になることがあり、当てにならない。中身は次の events の message で読む
- 課題ごとの出来事: `/api/0/organizations/kk-web/issues/{id}/events/?full=true&limit=5`
  - message（`Playback failed: blocked` など）
  - tags の playback・service・url・browser・os・device・apple
  - entries の breadcrumbs の末尾8件。category が player のものが、直前のプレイヤーの知らせ（load・swap・playing・paused・blocked・error）
  - entries の exception の stacktrace は、押したのに鳴らなかった件では Sentry の読み込み役の中を指すだけなので読まない

返事は大きいので、evaluate の中で上の欄だけに絞ってから返す。

## 2. 振り分ける

課題ごとに、次のどれかに分ける。

- **こちらのバグ**: コードを直せば止まるもの
- **端末の仕様**: iOS の自動再生の制限など、CLAUDE.md の「分かっている問題」に書いてある振る舞い。新しい形なら「分かっている問題」に足す候補にする
- **外のせい**: YouTube の埋め込みの中・拡張機能・ネットワークなど、こちらのコードではないもの
- **原因不明**: 記録だけでは決められないもの。何が分かれば決まるかを1行で書く

振り分けるときに見ること:

- **本人の端末の試しか。** 本人の iPhone は iOS 18.7 の Mobile Safari、Android は Pixel 9a（Chrome。UA の縮小で Android 10・device K と出る）。開発中に実機で試した記録が多く混ざる。本人の端末の記録でも、直した版のあとに起きていればバグとして扱う
- **直した版より前か後か。** 出来事の時刻と、`vercel ls vocafy --scope kkweb --environment production` の配備の時刻を比べる。直した版の配備より前の出来事だけなら、直し済みとして閉じる候補にする
- breadcrumbs の流れを、`src/components/player/watch.ts`・`use-engines.ts`・`niconico-pool.ts` の知らせを出す所と突き合わせる

## 3. 報告

課題ごとに1行。分類・shortId・中身・件数・端末・見立て。最後に、直す候補を上から並べる。
新しい課題が無ければ「新しい課題なし」の1行で終える。

## 4. 直す（本人が選んだものだけ）

1. 記録から再現の手順を立てる。iPhone・Android の実機のつなぎ方は CLAUDE.md の「分かっている問題」にある
2. 回帰テストを書き、直す前の形で落ちることを確かめる
3. 直してテストを通し、`/verify` を通してコミットする。本文に shortId（`VOCAFY-4`）を書く

## 5. Sentry の状態を変える

- 直したもの: 直した版が配備されたあとに Resolved にする（`PUT /api/0/organizations/kk-web/issues/{id}/` に `{"status":"resolved"}`）。配備前に閉じると、配備前の出来事で開き直される
- 外のせい: Ignored にする（`{"status":"ignored"}`）
- 端末の仕様・原因不明: そのまま残す
- 状態を変えるのは本人が報告を見たあと。報告の前に閉じない

リリース（版）を付けていないので、「次の版で解決」と再発の知らせは使えない。
