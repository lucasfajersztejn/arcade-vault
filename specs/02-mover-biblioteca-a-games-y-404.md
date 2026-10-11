# SPEC 02 — Mover la biblioteca a /games, home provisional y página 404

**Estado:** Implementado
**Depende de:** SPEC 01 (existe en `specs/01-mvp-pantallas-visuales.md`, estado Implementado)
**Fecha:** 2026-10-08
**Objetivo:** Mover la Biblioteca y las rutas de juegos de `/` y `/juegos/*` a `/games` y `/games/*`, dejar en `/` una home provisional con un enlace a `/games`, y añadir una página 404 global con estilo arcade.

---

## Alcance

### Dentro
- Mover la Biblioteca: `/` → `/games`.
- Mover el Detalle: `/juegos/[id]` → `/games/[id]`.
- Mover el Reproductor: `/juegos/[id]/jugar` → `/games/[id]/jugar`.
- Actualizar todos los enlaces internos, la lógica de link activo del `Nav` y las redirecciones de `router.push` a las nuevas rutas.
- Nueva **home provisional** en `/`: pantalla simple con el estilo retro-neón existente (título/logo, una frase y botón "ENTRAR AL VAULT" → `/games`). Sin datos nuevos.
- Nueva **página 404 global** (`app/not-found.tsx`) con estilo arcade ("GAME OVER / 404", ilustración SVG o ASCII-art, efecto neón/glitch respetando `prefers-reduced-motion`, botones a `/` y `/games`). Sustituye al 404 por defecto en toda la app, incluido el caso `/games/no-existe` (el `notFound()` ya existente).
- Verificación visual con Playwright (ver criterios): capturas en `.playwright-screenshots/` y artefactos del MCP en `.playwright-mcp/`.
- Diseño: **usar SIEMPRE y obligatoriamente `/frontend-design` y `/ui-ux-pro-max`** (CLAUDE.md) en cualquier trabajo visual o de UX de esta spec: home provisional, página 404 y cualquier ajuste de estilos, componentes o navegación. No se escribe ni se modifica UI sin haberlos invocado antes.

### Fuera (explícito)
- **La home definitiva** (incluida la plantilla sin trackear `refereences/templates/home-about/`): spec propia posterior. La home de esta spec es provisional.
- Mover `/salon` y `/login`: **se quedan en la raíz** (son transversales, no pertenecen solo a juegos).
- Redirects de las URLs antiguas (`/juegos/*`): no se crean; darán 404.
- Cambios en datos, tipos, sesión, puntuaciones o lógica de los juegos.
- Un 404 específico para `/games/[id]` distinto del global.
- Tests automatizados (siguen sin runner configurado).
- Commitear las capturas de Playwright (ya ignoradas en `.gitignore`, salvo `.gitkeep`).

---

## Modelo de datos

No introduce datos nuevos. Se omite la sección.

---

## Archivos a crear / modificar

| Archivo | Acción |
|---|---|
| `app/games/page.tsx` | crear (mueve el contenido actual de `app/page.tsx`: Biblioteca) |
| `app/games/[id]/page.tsx` | mover desde `app/juegos/[id]/page.tsx` (con `git mv`); enlaces a `/games/...` |
| `app/games/[id]/jugar/page.tsx` | mover desde `app/juegos/[id]/jugar/page.tsx` (con `git mv`) |
| `app/juegos/` | eliminar (queda vacía) |
| `app/page.tsx` | reemplazar por la home provisional |
| `app/not-found.tsx` | crear: 404 global arcade |
| `components/nav.tsx` | modificar: "Biblioteca" → `/games` (activo en `/games*`); el logo apunta a `/`; `aria-label` del logo acorde |
| `components/game-card.tsx` | modificar: `href` a `/games/${id}` |
| `components/game-player.tsx` | modificar: enlaces a `/games/${id}` y "VOLVER AL VAULT" → `/games` |
| `components/hall-of-fame.tsx` | modificar: enlace `/` → `/games` |
| `components/auth-form.tsx` | modificar: `router.push("/")` → `/games` (login e invitado) |
| `app/globals.css` | solo clases nuevas para la home provisional y el 404 |
| `components/footer.tsx` | revisar enlaces (hoy no tiene `href` internos; solo tocar si aparece alguno) |

Mapeo de rutas resultante: home → `/`, biblioteca → `/games`, detalle → `/games/[id]`, player → `/games/[id]/jugar`, auth → `/login`, salón → `/salon`, 404 → cualquier ruta inexistente.

---

## Plan de implementación

Cada paso deja la app compilando (`npm run build`) y navegable.

1. **Leer la documentación de Next 16.4** en `node_modules/next/dist/docs/` sobre `not-found.tsx`, `notFound()` y estructura de rutas (regla de CLAUDE.md).
2. **Invocar `/frontend-design` y `/ui-ux-pro-max`** antes de escribir la home provisional y el 404, y **volver a aplicarlos siempre** que un paso posterior toque UI (pasos 4, 5, 6 y 8: Nav, home, 404, ajustes de estilos); mantener la identidad retro-neón.
3. **Mover rutas:** `git mv` de `app/juegos/[id]` → `app/games/[id]`; crear `app/games/page.tsx` con el contenido actual de `app/page.tsx`.
4. **Actualizar enlaces** en `nav`, `game-card`, `game-player`, `hall-of-fame` y `auth-form` (tabla de arriba). Comprobar con `grep` que no queda ningún `"/juegos` ni `href="/"` que debería ser `/games`.
5. **Home provisional** en `app/page.tsx`: pantalla simple con CTA "ENTRAR AL VAULT" → `/games`. Link activo del Nav: sin pestaña activa en `/`.
6. **Página 404** en `app/not-found.tsx` + estilos en `app/globals.css`.
7. **Verificación visual con Playwright** (MCP `mcp__playwright__*`): recorrer `/`, `/games`, `/games/caida`, `/games/caida/jugar`, `/salon`, `/login`, `/games/no-existe` y `/ruta-cualquiera`, en escritorio y a ≤ 768 px. Guardar las capturas en `.playwright-screenshots/` (no en la raíz ni en otra carpeta) y dejar los artefactos del MCP en `.playwright-mcp/`.
8. **Pulido y verificación:** `npm run lint`, `npm run build`, recorrido de los criterios de aceptación; actualizar el mapeo de rutas obsoleto en `specs/01-mvp-pantallas-visuales.md` con una nota que remita a esta spec.

---

## Criterios de aceptación

- [x] `npm run lint` y `npm run build` terminan sin errores.
- [x] `/` muestra la home provisional con un botón que lleva a `/games`; ya no muestra la Biblioteca.
- [x] `/games` muestra hero, buscador, 5 chips y las 8 tarjetas (comportamiento idéntico al de la antigua `/`).
- [x] Pulsar una tarjeta o su botón JUGAR navega a `/games/<id>`; "JUGAR AHORA" lleva a `/games/<id>/jugar`.
- [x] "VOLVER AL VAULT" (detalle, reproductor y salón) lleva a `/games`; "SALIR" del reproductor lleva a `/games/<id>`.
- [x] Tras iniciar sesión o "JUGAR COMO INVITADO" en `/login` se redirige a `/games`.
- [ ] El link "Biblioteca" del Nav apunta a `/games` y está activo en `/games` y `/games/*`; "Salón de la Fama" activo en `/salon`; "Iniciar Sesión" activo en `/login`; ninguno activo en `/`. El logo lleva a `/`. *(Pendiente: "Iniciar Sesión" no tiene estado activo en el Nav de escritorio, solo en el panel móvil; el comportamiento viene de la spec 01 y se deja para una spec posterior. El resto del criterio se verificó.)*
- [x] `grep -r "/juegos" app components lib` no devuelve resultados.
- [x] `/juegos/caida` y `/juegos/caida/jugar` muestran el 404 (sin redirects).
- [x] `/games/no-existe` y una ruta inexistente cualquiera (p. ej. `/xyz`) muestran la nueva página 404 arcade con botones a `/` y `/games` operables con teclado (foco visible).
- [x] La animación del 404 se desactiva con `prefers-reduced-motion: reduce`.
- [x] La home y el 404 no tienen scroll horizontal a ancho ≤ 768 px y se ven correctamente en escritorio y móvil.
- [x] Se invocaron `/frontend-design` y `/ui-ux-pro-max` para la home provisional, el 404 y cualquier otro cambio de UI de esta spec, y sus recomendaciones quedaron aplicadas (o descartadas con motivo anotado).
- [x] Las capturas de Playwright están en `.playwright-screenshots/` y los artefactos del MCP en `.playwright-mcp/`; no hay capturas sueltas en otras carpetas y `git status` no las muestra (ignoradas).
- [x] La sesión (`av_user`) y las puntuaciones (`av_scores`) siguen funcionando tras el cambio de rutas.

---

## Decisiones tomadas y descartadas

- **Se mueven solo biblioteca + juegos** (`/games`, `/games/[id]`, `/games/[id]/jugar`). `/salon` y `/login` se quedan en la raíz. *Descartado:* mover todo bajo `/games` (login anidado sin sentido) y mover solo la biblioteca (mezclaría `/games` y `/juegos`).
- **Sin redirects de `/juegos/*`:** el proyecto no tiene usuarios ni enlaces externos. *Descartado:* `redirects()` en `next.config.ts` (código extra sin beneficio real hoy).
- **Home provisional mínima con CTA** a `/games`. *Descartado:* portar `home-about` (merece spec propia) y redirigir `/` a `/games` (no deja home visible).
- **404 como `app/not-found.tsx` global** con estilo arcade, en vez de uno por ruta. *Descartado:* imagen externa (requeriría que el usuario la aporte) y doble 404 (innecesario ahora).
- **Idioma de la ruta:** `/games` (en inglés) según lo pedido, aunque la UI sea en español.
- **Post-login redirige a `/games`**, no a la home provisional, para mantener el flujo actual (entrar y ver la biblioteca).
- **Logo del Nav → `/`** (la home), porque `/` deja de ser la biblioteca.
- **Capturas de Playwright** en `.playwright-screenshots/` y MCP en `.playwright-mcp/`, ambas ya en `.gitignore`.

---

## Riesgos identificados

- **Enlaces olvidados** a `/` o `/juegos`: mitigación con `grep` en el paso 4 y recorrido con Playwright en el paso 7.
- **404 con Cache Components:** según la spec 01, `notFound()` en `/games/no-existe` responde HTTP 200 aunque muestre la pantalla 404. Se mantiene aceptado; el criterio es "se muestra el 404".
- **Link activo del Nav:** la lógica `p === "/" || startsWith("/juegos")` debe reescribirse; sin cuidado, `startsWith("/")` activaría Biblioteca en todas las rutas.
- **Historial de git:** usar `git mv` para conservar el historial de los archivos movidos.
