# SPEC 01 — MVP visual de Arcade Vault (todas las pantallas)

**Estado:** Aprobado
**Depende de:** ninguna spec previa (los estilos base ya están portados en `app/globals.css` y `app/layout.tsx` por el PR `01-styles`)
**Fecha:** 2026-10-08
**Objetivo:** Portar a Next.js (App Router, TypeScript) las 5 pantallas de `refereences/templates/` — Biblioteca, Detalle de juego, Reproductor, Login/Registro y Salón de la Fama — como MVP puramente visual, con datos mock y sin ningún juego real.

---

## Alcance

### Dentro
- Navegación global (`Nav` con menú móvil + footer) tomada de `nav.jsx` y `app.jsx`.
- Pantalla **Biblioteca** (`biblioteca.jsx`): hero, buscador, chips de categoría, grilla de tarjetas con efecto tilt, estado vacío.
- Pantalla **Detalle** (`detalle.jsx`): portada, tags, descripción, stats, CTA, ranking del juego.
- Pantalla **Reproductor** (`reproductor.jsx`): HUD, CRT con arena decorativa, pausa, modal de FIN DEL JUEGO con guardado de puntuación. La puntuación es **simulada** (incremento aleatorio con `setInterval`), igual que en la plantilla.
- Pantalla **Auth** (`auth.jsx`): pestañas iniciar sesión / crear cuenta, "jugar como invitado", botones sociales decorativos.
- Pantalla **Salón de la Fama** (`salon.jsx`): tabs por juego, podio, tabla, fila "tu mejor marca" si hay sesión.
- Rutas reales del App Router (sustituyen al hash-router de la plantilla).
- Datos mock tipados (`GAMES`, `CATS`, `seededScores`) portados de `data.jsx`.
- Sesión simulada en `localStorage` (`av_user`) y puntuaciones guardadas en `localStorage` (`av_scores`).
- Diseño: se respeta la plantilla. La implementación **usa obligatoriamente los skills `/frontend-design`** (diseño de interfaz y componentes visuales) **y `/ui-ux-pro-max`** (experiencia de usuario, flujos de navegación y microinteracciones), tal como exige CLAUDE.md.

### Fuera (explícito)
- **Ningún juego real** (ni Bloque Buster, ni Serpentina, etc.). La arena del reproductor es decorativa.
- Backend, base de datos, API routes, autenticación real (NextAuth, OAuth Google/GitHub). Los botones sociales no hacen nada.
- Validación real de credenciales, recuperación de contraseña, perfil de usuario.
- Ranking global real / multiusuario: el Salón y el Detalle usan datos generados.
- Sistema de créditos funcional: el contador `CRÉDITOS · 03` es estático.
- Tests automatizados (no hay runner configurado en el repo).
- Internacionalización: la UI es solo en español.

---

## Modelo de datos

Tipos nuevos en `lib/types.ts`:

```ts
type GameColor = "cyan" | "magenta" | "yellow" | "green";
type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

interface Game {
  id: string;            // slug, p.ej. "bloque-buster"
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;         // clase CSS, p.ej. "cover-bricks"
  color: GameColor;
  best: number;
  plays: string;         // ya formateado, p.ej. "12.4K"
}

interface ScoreRow { rank: number; name: string; score: number; date: string } // date "DD/MM/2026"
interface SessionUser { name: string }                // localStorage "av_user"
interface SavedScore { game: string; score: number; name: string; at: number } // localStorage "av_scores" (array)
```

Datos mock en `lib/data.ts`: `GAMES` (8 juegos de la plantilla), `CATS = ["TODOS", ...]`, `PLAYERS`, `seededScores(seed, count)` (determinista, mismo algoritmo que la plantilla).

Persistencia: solo `localStorage`, claves `av_user` y `av_scores`, sin versionado (MVP). Toda lectura se envuelve en `try/catch` y se hace en `useEffect` / hook cliente para evitar errores de hidratación.

---

## Archivos a crear / modificar

| Archivo | Acción | Tipo |
|---|---|---|
| `lib/types.ts`, `lib/data.ts` | crear | datos |
| `lib/session.tsx` | crear: `SessionProvider` + hook `useSession` (user, login, signOut) | client |
| `lib/scores.ts` | crear: `saveScore`, `getScores` sobre `localStorage` | client |
| `components/nav.tsx` | crear (menú móvil con estado) | client |
| `components/footer.tsx` | crear | server |
| `components/game-card.tsx` | crear (tilt con ref) | client |
| `components/library.tsx` | crear (búsqueda + chips) | client |
| `components/leaderboard.tsx` | crear (lista del Detalle) | server |
| `components/game-player.tsx` | crear | client |
| `components/auth-form.tsx` | crear | client |
| `components/hall-of-fame.tsx` | crear | client |
| `app/layout.tsx` | modificar: añadir `SessionProvider`, `Nav`, `<main className="av-main">`, `Footer` | — |
| `app/page.tsx` | reemplazar scaffold por Biblioteca | server |
| `app/juegos/[id]/page.tsx` | crear: Detalle (`notFound()` si el id no existe) | server |
| `app/juegos/[id]/jugar/page.tsx` | crear: Reproductor | server → client |
| `app/login/page.tsx` | crear: Auth | server → client |
| `app/salon/page.tsx` | crear: Salón de la Fama | server → client |
| `app/globals.css` | solo ajustes puntuales si falta alguna clase de la plantilla | — |

Mapeo de rutas: `biblioteca` → `/`, `detalle` → `/juegos/[id]`, `player` → `/juegos/[id]/jugar`, `auth` → `/login`, `salon` → `/salon`. La navegación usa `next/link` / `useRouter`, no hash.

---

## Plan de implementación

Cada paso deja la app compilando (`npm run build`) y navegable.

1. **Leer la documentación de Next 16.4** en `node_modules/next/dist/docs/` (App Router: layouts, `params` asíncronos, Link, `notFound`, client components) antes de escribir código (regla de CLAUDE.md).
   - **Invocar `/frontend-design` y `/ui-ux-pro-max`** antes de escribir cualquier componente visual (pasos 4 a 9) y aplicar sus lineamientos: `/frontend-design` para la composición visual y los componentes; `/ui-ux-pro-max` para flujos de navegación, estados (vacío, carga, error), accesibilidad, foco, `prefers-reduced-motion` y microinteracciones (tilt, hover, transiciones). Los ajustes que propongan deben mantener la identidad retro-neón de la plantilla.
2. **Datos y tipos:** crear `lib/types.ts` y `lib/data.ts` portando `GAMES`, `CATS`, `seededScores` desde `data.jsx`.
3. **Sesión simulada:** `lib/session.tsx` (`SessionProvider`, `useSession`) y `lib/scores.ts`, con lectura segura de `localStorage`.
4. **Shell global:** `Nav`, `Footer`, y cableado en `app/layout.tsx`. Enlaces activos según `usePathname()` (Biblioteca activa también en `/juegos/*`). Menú móvil con backdrop.
5. **Biblioteca (`/`):** `GameCard` con tilt, `Library` con filtro por texto y categoría, estado "NO HAY RESULTADOS".
6. **Detalle (`/juegos/[id]`):** página con `generateStaticParams` sobre `GAMES`, `Leaderboard` con `seededScores(id.length * 17 + 3, 10)`, CTA a `/juegos/[id]/jugar` y volver a `/`.
7. **Auth (`/login`):** `AuthForm` con pestañas, login simulado (`onLogin` guarda `{ name }` en mayúsculas, máx. 10 caracteres, "PLAYER1" por defecto), invitado, redirección a `/`.
8. **Reproductor (`/juegos/[id]/jugar`):** HUD, arena decorativa, pausa, FIN, modal con guardado en `av_scores`, "JUGAR DE NUEVO", "VOLVER AL VAULT", "SALIR" → detalle.
9. **Salón de la Fama (`/salon`):** tabs por juego, podio, tabla, fila del usuario; combinar `seededScores` con las puntuaciones reales guardadas en `av_scores` para ese juego (si el usuario tiene alguna, se muestra su mejor marca real en lugar de la inventada).
10. **Pulido y verificación:** revisar responsive (móvil/escritorio), `npm run lint`, `npm run build`, recorrido manual completo de los criterios de aceptación.

---

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/` muestra hero, buscador, 5 chips (TODOS + 4 categorías) y las 8 tarjetas de juego.
- [ ] Buscar "xyz" en la Biblioteca muestra "NO HAY RESULTADOS"; borrar el texto restaura las 8 tarjetas.
- [ ] El chip PUZZLE muestra solo CAÍDA; el chip TODOS vuelve a mostrar las 8.
- [ ] Pulsar una tarjeta o su botón JUGAR navega a `/juegos/<id>`.
- [ ] `/juegos/caida` muestra título, descripción, stats, 10 filas de ranking con #01–#03 destacados; `/juegos/no-existe` devuelve 404.
- [ ] "JUGAR AHORA" lleva a `/juegos/<id>/jugar`; "VOLVER AL VAULT" lleva a `/`.
- [ ] En el reproductor la puntuación aumenta sola; PAUSA la detiene y muestra "EN PAUSA"; REANUDAR la retoma.
- [ ] FIN abre el modal con la puntuación final; GUARDAR PUNTUACIÓN muestra "PUNTUACIÓN GUARDADA_" y añade una entrada a `localStorage["av_scores"]`.
- [ ] JUGAR DE NUEVO reinicia puntuación, vidas y nivel; SALIR lleva al detalle del juego.
- [ ] `/login`: las pestañas alternan entre INICIAR SESIÓN y CREAR CUENTA (esta añade el campo de correo); enviar el formulario guarda `av_user`, redirige a `/` y el Nav muestra el nombre en lugar de "Iniciar Sesión".
- [ ] "JUGAR COMO INVITADO" redirige a `/` sin sesión; cerrar sesión elimina `av_user`.
- [ ] Recargar la página con sesión iniciada mantiene el nombre en el Nav sin errores de hidratación en consola.
- [ ] `/salon` muestra podio (02 · 01 · 03), tabla de 12 filas y tabs por cada uno de los 8 juegos; cambiar de tab cambia los datos.
- [ ] Con sesión iniciada aparece "TU MEJOR MARCA EN <JUEGO>"; sin sesión no aparece.
- [ ] Se invocaron `/frontend-design` y `/ui-ux-pro-max` durante la implementación y sus recomendaciones quedaron aplicadas (o descartadas con motivo anotado en el PR).
- [ ] Los elementos interactivos son operables con teclado (foco visible) y las animaciones respetan `prefers-reduced-motion`.
- [ ] A ancho ≤ 768 px aparece el botón hamburguesa y el panel móvil abre/cierra con su backdrop; no hay scroll horizontal.
- [ ] El link activo del Nav es el correcto en `/`, `/juegos/*`, `/salon` y `/login`.

---

## Decisiones tomadas y descartadas

- **Rutas reales del App Router** (`/`, `/juegos/[id]`, …) en lugar del hash-router con estado de la plantilla. Es idiomático en Next, permite enlaces compartibles y 404 reales. *Descartado:* SPA de un solo client component (más fiel al prototipo, pero desaprovecha el framework).
- **Reproductor completo pero simulado** (HUD, pausa, modal, guardado). Sirve para validar el flujo de punta a punta. *Descartado:* placeholder estático (no prueba el flujo de guardado) y dejarlo fuera (rompe el CTA del Detalle).
- **Auth simulada en `localStorage`**, igual que la plantilla. *Descartado:* auth real (NextAuth/BD): abre una spec propia de backend.
- **Datos mock en código + `localStorage` para puntuaciones guardadas.** Permite ver reflejadas en el Salón las partidas del usuario sin backend. *Descartado:* solo mock estático (el guardado no tendría efecto visible).
- **Server components por defecto**; `"use client"` solo donde hay estado, refs o `localStorage` (Nav, Library, GameCard, GamePlayer, AuthForm, HallOfFame, SessionProvider).
- **Estilos:** se reutiliza `app/globals.css` ya portado de `styles.css`, con las clases `av-*` de la plantilla; no se migra a utilidades Tailwind en este MVP.
- **Estructura de carpetas** (`lib/`, `components/` en la raíz, alias `@/*`) propuesta por esta spec; ajustable en la revisión.

---

## Riesgos identificados

- **Hidratación:** leer `localStorage` en el primer render provoca mismatch servidor/cliente. Mitigación: leer en `useEffect` y renderizar el estado "sin sesión" hasta montar.
- **API de Next 16.4:** `params` asíncronos y otras diferencias con versiones previas. Mitigación: paso 1 del plan (leer la documentación local).
- **Ajuste del layout:** `app/layout.tsx` envuelve `children` en `#root` con `height: 100%`; añadir Nav/footer puede romper la altura o el scroll. Mitigación: verificar visualmente en el paso 4.
- **Clases CSS faltantes:** si `globals.css` no cubre algún componente de la plantilla, habrá que copiarlas desde `refereences/templates/styles.css`.
- **Puntuación aleatoria en el reproductor:** `Math.random` en render causa mismatch; solo se usa dentro de efectos/handlers.
