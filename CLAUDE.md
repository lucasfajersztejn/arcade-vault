# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: online platform to play games and compete for the highest score. Built spec-driven, based on `/spec` and `/spec-impl`. Follows best practices from https://github.com/Klerith/fernando-skills (installed via `npx skills@latest add Klerith/fernando-skills`). README is in Spanish.

Currently a fresh `create-next-app` scaffold: only `app/layout.tsx`, `app/page.tsx`, `app/globals.css`. No tests, no game code yet.

## Commands

- `npm run dev` — dev server (http://localhost:3000)
- `npm run build` / `npm run start` — production build / serve
- `npm run lint` — ESLint 9 (flat config in `eslint.config.mjs`)
- No test runner configured.

## Stack and gotchas

- Next.js 16.4, React 19.3, App Router (`app/`), TypeScript, Tailwind CSS v4 (`@import "tailwindcss"` in `app/globals.css`, theme tokens via `@theme inline`).
- This Next.js version has breaking changes from older versions. Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, `04-community`). Heed deprecation notices. (From `AGENTS.md`, which `next dev` re-adds if removed.)
- Path alias: `@/*` maps to repo root (e.g. `@/app/...`).
- Dark mode via `prefers-color-scheme` CSS variables `--background` / `--foreground`.
