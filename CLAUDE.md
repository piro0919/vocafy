@AGENTS.md

# Vocafy

ボカロ曲（合成音声の曲）を、ボカロPごとに聴ける音楽プレイヤー風のサイト。Janify（`~/Repository/janify`）のボーカロイド版。公開先は <https://vocafy.kkweb.io/> 。
2026-10-08 に壁打ちで合意し、同じセッションで公開まで進めた。

## 現在地（2026-10-08）

- Janify を複製して始めた。画面の形は Janify に縛られない（アルバムの概念が無い）
- 画面は、トップ（人気曲・ボカロP）・ボカロP（一覧と詳細）・設定・利用規約・プライバシーポリシー。プレイヤーは全ページ共通
- 本番と手元の DB に、評価点の上位 200 曲を種にして取り込んだ。ボカロP 110 人・5415 曲（YouTube で流せる 4292・ニコニコだけ 1123）・歌声 415
- 2026-10-08 に公開した。GitHub は piro0919/vocafy（公開）の main、Vercel は kk-web チームの vocafy
  - DB は Vercel の Neon 連携で作った vocafy-db（無料プラン・iad1）。DATABASE_URL などは連携が Vercel に入れている
  - 本番の DB への取り込みは手元から流す。`vercel env pull <ファイル> --environment production` で接続先を取り、DATABASE_URL_UNPOOLED を DATABASE_URL として `pnpm migrate` と `pnpm ingest` を走らせる
  - `vercel project add` で作ったプロジェクトは framework が空で、ビルドは通るのに全ページが 404 になった。API で framework を nextjs にして直した
  - vocafy.kkweb.io の CNAME と `_vercel` の TXT は、Janify の `.env.local` の CLOUDFLARE_API_TOKEN で API から足した

## 残りの作業（上から順に）

1. 本人に画面を触ってもらい、直したい点を聞く
2. アイコンと OG 画像を Vocafy 用に作り直す。いまは Janify のもの（`src/app/icon.png` など）が入っている。差し色も Janify の薄紫のまま
3. ニコニコの補欠の再生。埋め込みプレイヤーは postMessage で操作できるが、公式の資料が無い（非公式の解説: <https://zenn.dev/xpadev/articles/8f742c8f8ce3d0> 、2022年時点）。曲の終わりを知らせる合図が記事に無く、再生状態の数値から読む必要がある。まず実物で終わりを検知できるか試す
4. 種の線を足す。ニコニコの伝説入り（100万再生以上）と、YouTube の再生数。YouTube の再生数は VocaDB が持つ動画の ID から videos.list で引ける（50本で1単位）。ニコニコの再生数は公式の検索 API がいまも使えるか未確認
5. 歌声ライブラリの画面、年代、検索、お気に入り
6. 押した曲から関連曲を流し続ける再生。VocaDB の `/api/songs/{id}/related` が「同じ作者」「好きな人が好きな曲」「タグが近い曲」を12曲ずつ返す

## 決めたこと

- 並べ方は「ボカロP → 曲」。アルバムは使わない。ボカロ曲は1曲ずつ投稿されたものが本体で、アルバムは後からまとめた盤なので
- 対象は合成音声全般。VOCALOID の製品に限らず、CeVIO・Synthesizer V・UTAU なども入れる。最近の曲を拾うため
  - 合成音声かどうかは VocaDB の artistType を許す側で名指しする（`scripts/lib/pick.ts` の SYNTH）。除く側で書くと、歌声の欄に誤って入ったイラストや作詞の人が混ざった
- 歌声ライブラリでも探せるようにする。データは最初から持つ（後から全曲を調べ直さないため）
- 再生は YouTube が基本。YouTube に本家が無い曲だけニコニコで流す（ニコニコは補欠）
- 流すのは本家の動画だけ。転載は使わない。ボカロは作者自身が投稿する文化で、本家が無い曲は作者が消したか上げていない曲が多いため
- 収録は、種の曲からボカロPを拾い、その人の全曲を入れる。合作の相手は名前だけ入れ、その人の全曲までは取りに行かない（`producer.complete` が false。一覧に出さない）
- 種は、ニコニコの伝説入り・YouTube の再生数・VocaDB の評価点のどれか一つを満たす曲。最初の周回は評価点だけ
- 線は段階的に下げる。下げる前に `pnpm ingest --dry` で増える曲数を数える。ボカロPが1人増えるとその人の全曲がついてくるので、曲数は種の数に比例しない
- 打ち出しは新旧のバランスを取る。「ニコニコ発のボカロ」には寄せない
- データの正本は VocaDB。Notion は使わない。数万曲になりうる規模で、Notion の API では取り込みに時間がかかりすぎるため
- DB は Postgres（本番は Neon、手元は `compose.yaml`）。サイトは実行時に DB を読み、ページは1時間キャッシュする（ISR）。ボカロPの画面はビルドのときには作らず、最初に開かれたときに作る
  - トップとボカロPの一覧はビルドのときに作るので、ビルドに DATABASE_URL が要る。CI は Postgres を立てて `db/fixture.sql` を入れる
- 最初の公開は最小（トップ・ボカロPの一覧と詳細・再生）から回す
- 名前は Vocafy。同名の英単語学習アプリ（vocafy.net）があるが、分野が離れていて公開先もサブドメインなので、このまま使う

## Janify から引き継いだもの

プレイヤー（`src/components/player/`）、詳細画面の動画の置き場所（`player-stage.tsx`）、テーマ、スワイプで戻る、キーボード操作は Janify のまま。YouTube の規約まわり（200×200 以上で常に見せる、上に何も重ねない）の考え方も同じ。経緯は Janify の CLAUDE.md にある。

Janify で直したことは、手で移す。共通部分の切り出しは、両方の形が落ち着いてから考える。
