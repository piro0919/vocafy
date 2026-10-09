# Vocafy

> Listen to Vocaloid and other synthesized-voice songs, producer by producer.

## ✨ Features

- 🎤 Browse producers (ボカロP) and play their songs, newest first
- 📅 A home page that stays flat: songs posted on today's date in past years, a daily random mix, voices, years and a kana index — no rankings
- 🎙 Browse by voice (Hatsune Miku, Kasane Teto, KAFU, …) with character art, or by year and by kana
- 🔎 Search songs and producers, including romaji titles
- ❤️ Favorite songs and producers; sign in with Google to keep them across devices (optional)
- 📻 Radio: keep playing related songs from the one you picked
- 🎬 One player for the whole site, so playback continues while you browse
- 📲 A full-screen player view on phones; pull the title down to shrink the player to a corner
- ⌨️ Keyboard shortcuts (space, arrows, M, S, R), listed on the settings page
- 🌗 Dark and light themes, plus a character color for the whole site

## 🛠 Tech Stack

- Next.js (App Router, ISR) + React + TypeScript
- Better Auth (Google sign-in)
- Tailwind CSS
- PostgreSQL (Neon in production)
- YouTube IFrame Player API, with the niconico embed as a fallback
- Vercel

## 🚀 Development

```bash
pnpm install
pnpm db:up               # local Postgres on port 5434 (compose.yaml)
pnpm migrate             # apply db/migrations/
pnpm ingest --seeds 1600 # import songs from VocaDB (the current line)
pnpm dev -p 3100         # Google sign-in redirects to port 3100
```

`.env.local`:

| name                                       | value                                                    |
| ------------------------------------------ | -------------------------------------------------------- |
| `DATABASE_URL`                             | `postgres://vocafy:vocafy@localhost:5434/vocafy` locally |
| `YOUTUBE_API_KEY`                          | YouTube Data API v3, for view counts when ingesting      |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`    | sign-in (`http://localhost:3100` locally)                |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth client                                      |

Only `DATABASE_URL` is required to run the site. Without the sign-in keys, the site works signed out; `pnpm ingest --no-youtube` skips the YouTube key.

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm knip
pnpm test       # Vitest
pnpm test:e2e   # Playwright, on a production build, at desktop and mobile widths
```

## 🎵 Playback

All audio is embedded; the site stores no audio or video files. Only the producer's own upload is played, never reprints. YouTube comes first; songs whose original upload is only on niconico play through the niconico embed. Uploads that turn out to be unplayable are reported by the player, checked again on the server, and switched or removed.

## 🕸 Data

Song, producer and voice data come from [VocaDB](https://vocadb.net/). `pnpm ingest` picks seed songs — the top rated on VocaDB, niconico's million-view songs, and YouTube uploads with a million views — then imports every song by the seeds' producers. Credits marked as support (tuning, arranging) do not count as producers. Run it with `--dry` first to count how many songs a larger seed would add.

How the scope was decided and why things are the way they are: see [CLAUDE.md](CLAUDE.md) (in Japanese).
