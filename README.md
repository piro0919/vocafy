# Vocafy

> Listen to Vocaloid and other synthesized-voice songs, producer by producer.

## ✨ Features

- 🎤 Browse producers (ボカロP) and play their songs, best rated first
- 🔥 A popular songs shelf that mixes producers instead of filling up with one
- 🎬 One player for the whole site, so playback continues while you browse
- 📲 A full-screen player view on phones; pull the title down to shrink the player to a corner
- ⌨️ Keyboard shortcuts (space, arrows, M, S, R), listed on the settings page
- 🌗 Dark and light themes

## 🛠 Tech Stack

- Next.js (App Router, ISR) + React + TypeScript
- Tailwind CSS
- PostgreSQL (Neon in production)
- YouTube IFrame Player API
- Vercel

## 🚀 Development

```bash
pnpm install
pnpm db:up               # local Postgres on port 5434 (compose.yaml)
pnpm migrate             # apply db/migrations/
pnpm ingest --seeds 200  # import songs from VocaDB
pnpm dev
```

`.env.local` needs one value:

| name           | value                                                    |
| -------------- | -------------------------------------------------------- |
| `DATABASE_URL` | `postgres://vocafy:vocafy@localhost:5434/vocafy` locally |

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm knip
pnpm test       # Vitest
pnpm test:e2e   # Playwright, on a production build, at desktop and mobile widths
```

## 🎵 Playback

All audio is embedded from YouTube; the site stores no audio or video files. Only the producer's own upload is played. Songs whose original upload exists only on niconico are listed but cannot be played yet.

## 🕸 Data

Song, producer and voice data come from [VocaDB](https://vocadb.net/). `pnpm ingest` takes the top rated songs as seeds, then imports every song by their producers. Run it with `--dry` first to count how many songs a larger seed would add.

How the scope was decided and why things are the way they are: see [CLAUDE.md](CLAUDE.md) (in Japanese).
