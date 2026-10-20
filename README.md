# Arcade Vault

A retro arcade platform where players sign in, play classic
games in the browser and compete on per-game high score boards.

**Live:** https://arcade-vault-woad.vercel.app

## About this project

Arcade Vault is the final project of the DevTalles course
"Claude Code: Guía completa para desarrolladores de software".

It was built with Claude Code following a spec-driven workflow:
my role was writing the specs, reviewing each iteration and making
the product and design decisions. I did not hand-write the game
implementations. I am including it here because it is the most
complete thing I have shipped in 2026 and because knowing how to
direct these tools is part of the job now — not as a sample of my
own code. For that, see [CinePop](https://github.com/lucasfajersztejn/cinepop).

## Stack

- Next.js
- Tailwind CSS
- Supabase (database and authentication)

## Features

- Sign in with Google or GitHub via OAuth
- Five playable browser games: Arkanoid, Tetris, Asteroids,
  Snake and Frogger
- Search by title and filtering by category (arcade, puzzle, shooter)
- Per-user high scores
- Transactional email
- Retro visual design across the whole app

## Running locally

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm run start   # serve the production build
npm run lint    # ESLint 9
```

Requires a `.env.local` file with your Supabase project URL and
anon key.
