<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Ignore routine debugging and unverified changes. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Keep a qualifying candidate through the reporting pass even if you resolve or work around it. A successful fix changes the report outcome; it does not erase the friction that qualified it.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `node node_modules/next/dist/bin/next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->

<!-- Bloque propio del proyecto. Fuera de los marcadores de `next dev`, que solo reescribe lo que hay entre BEGIN/END. -->

## Arcade Vault — contexto del proyecto

La guía completa está en `CLAUDE.md` (raíz). Resumen para agentes que solo leen este fichero:

- Plataforma web para jugar arcades retro y competir por la puntuación. README, specs, textos de UI y comentarios **en español**; el código y los mensajes de commit, en inglés.
- Trabajo dirigido por specs en `specs/NN-slug.md` (las del agente `game-jam`, en `specs/game-jam/<game-id>/`). Una rama `spec-NN-slug` y un PR por spec. Los commits los hace **el humano**: los agentes entregan el mensaje redactado, no ejecutan `git commit`.
- Cinco juegos jugables (`asteroids`, `caida`, `bloque-buster`, `snake`, `frogger`). Para añadir uno: `refereences/implemented-games.md` (mapa corto) y `.claude/skills/nuevo-juego/reference/contrato-motor.md` (contrato motor ↔ plataforma, obligatorio antes de escribir un motor).
- Datos en Supabase vía MCP (`apply_migration` / `execute_sql`); no hay carpeta de migraciones local. El catálogo solo cambia por migración.
- Un hook `PostToolUse` pasa Prettier y `eslint --fix` tras cada Write/Edit de `.ts/.tsx/.js/.css`. Si ESLint falla, el hook devuelve error: corrígelo antes de seguir. Ojo: ese `--fix` convierte en `const` una variable que todavía no se reasigna.
- No hay test runner. La verificación es `npm run lint`, `npm run build` y jugar la partida (Playwright disponible; capturas en `.playwright-screenshots/`).
