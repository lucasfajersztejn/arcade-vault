# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: online platform to play retro arcade games and compete for the highest score. Built spec-driven with `/spec` and `/spec-impl` (specs in `specs/NN-slug.md`, one branch `spec-NN-slug` + PR per spec; `/spec-impl` creates the branch automatically, see `specs/.spec-config.yml`). Follows best practices from https://github.com/Klerith/fernando-skills (installed via `npx skills@latest add Klerith/fernando-skills`). README, specs, UI copy and code comments are in Spanish.

Specs 01–10 are implemented: visual MVP, `/games` library + 404, About + contact form (Resend), Supabase integration, `games`/`scores` tables with real leaderboard, and four real games (Asteroids, Caída/Tetris, Bloque Buster/Arkanoid, Snake). No test runner.

## Skills y Comandos

- Usa siempre /frontend-design para diseñar la interfaz de usuario y componentes visuales.
- Usa siempre /ui-ux-pro-max para diseñar la experiencia de usuario, flujos de navegación y microinteracciones.
- Para añadir un juego real (desde `refereences/started-games` o desde cero) usa `/nuevo-juego` (`.claude/skills/nuevo-juego/`): genera la spec en `specs/` (estado Borrador) y se implementa con `/spec-impl`. Su carpeta `reference/` contiene el contrato motor ↔ plataforma, la integración (BD, portada, `GamePlayer`) y los criterios de aceptación estándar.
- Para decidir **qué** juego añadir, usa el agente `game-planner` (`.claude/agents/game-planner.md`): analiza el catálogo real y el encaje con el contrato motor ↔ plataforma, y devuelve una recomendación principal con ficha lista para pegar en `/nuevo-juego` más dos alternativas. Mantiene su memoria de sugerencias (incluidos los descartes y su motivo) en `refereences/game-suggestions-todo.md`, el único fichero de `refereences/` que se escribe; commitéalo antes de `/spec-impl`. No escribe código ni specs.
- Hook `PostToolUse` (`.claude/hooks/format-lint.mjs`): tras cada Write/Edit elimina líneas en blanco y espacios finales en `.ts/.tsx/.js/.css` (Markdown no), y pasa Prettier y `eslint --fix`. Si ESLint falla, el hook devuelve error: corrígelo antes de seguir.
- MCP de Supabase (`.mcp.json`): migraciones con `apply_migration`, consultas con `execute_sql`, y `generate_typescript_types` para regenerar `lib/supabase/database.types.ts` tras cambiar el esquema. No hay carpeta de migraciones local.
- Verificación visual con Playwright: capturas en `.playwright-screenshots/`, artefactos del MCP en `.playwright-mcp/`.

## Architecture

- **Routes** (`app/`): `/` home, `/games` library, `/games/[id]` detail + leaderboard, `/games/[id]/jugar` player, `/salon` Hall of Fame, `/about` (contact Server Action in `app/about/actions.ts`, validation in `lib/contact.ts`, sends via Resend), `/login`. Pages wrap data-reading components in `<Suspense>`; `app/games/error.tsx` and `app/salon/error.tsx` show an error state with retry (never fake data on failure), (see `refereences\implemented-games.md`) when you need to check which games are implemented and how to implement new ones.
- **Data** (Supabase, RLS on): table `games` (catalog; `cat` ∈ `ARCADE|PUZZLE|SHOOTER|VERSUS`, `color` ∈ `cyan|magenta|yellow|green`, `cover` = CSS class defined in `app/globals.css`, e.g. `cover-snake`; new games use `cover-<id>`, `sort_order`), table `scores` (anonymous INSERT only, no UPDATE/DELETE), views `game_stats` (plays/best) and `leaderboard` (best score per player+game). The catalog only changes via migrations.
- **Data layer**: `lib/db/games.ts` (`getGames`, `getGame`) and `lib/db/scores.ts` (`getLeaderboard`, `getPlayerBest`, `submitScore`) take a typed Supabase client and throw on error. Clients: `lib/supabase/server.ts` (Server Components/Actions, one per request) and `lib/supabase/client.ts` (browser; used by `GamePlayer` to save scores). Env read via `lib/supabase/env.ts`.
- **Session**: no real auth yet. `lib/session.tsx` stores the player name in `localStorage["av_user"]` (spoofable; real auth is a future spec).
- **Game engines**: each game lives in `lib/games/<id>/` (`constants`, `types`, `entities`, `engine`, optional `utils`/`sprites`/`levels`) plus `components/<id>-canvas.tsx` exporting `<Id>Canvas` and `<Id>Controls`. `lib/games/registry.ts` maps `game.id` → `{ Canvas, Controls, hasLives, ariaLabel }` and defines `EngineHandle` (`pause/resume/restart/end`) and `EngineCanvasProps` (`onScore/onLives/onLevel/onGameOver/onPause`). `components/game-player.tsx` renders the platform HUD, pause/game-over modal and score submission for any registered engine; a catalog game without an engine shows «JUEGO NO DISPONIBLE». Game assets go in `public/games/<id>/`. Original sources to port live in `refereences/started-games/` (and `refereences/source-assets/`); `refereences/templates/` holds the original UI mockups.
- **Shared types/data**: `lib/types.ts` (`Game`, `ScoreRow`, `PlayerBest`, `SessionUser`), `lib/data.ts` (library category filters), `lib/format.ts`.

## Stack and gotchas

- Next.js 16.4, React 19.3, App Router (`app/`), TypeScript, Tailwind CSS v4 (`@import "tailwindcss"` in `app/globals.css`, theme tokens via `@theme inline`; compiled through `@tailwindcss/turbopack`). Most styling is custom CSS classes in `app/globals.css` (neon/CRT arcade theme).
- `next.config.ts` enables `cacheComponents: true` and `partialPrefetching: true`: dynamic data (cookies, Supabase reads) must sit inside `<Suspense>`.
- This Next.js version has breaking changes from older versions. Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, `04-community`). Heed deprecation notices. (From `AGENTS.md`, which `next dev` re-adds if removed; commit it if it changes.)
- Path alias: `@/*` maps to repo root (e.g. `@/lib/...`).
- Env vars (see `.env.template`, never commit `.env`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (never the service_role key), `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`, `SUPABASE_DB_PASSWORD`.
- Commands: `npm run dev`, `npm run build`, `npm run lint`.
