# SPEC 03 — Página Acerca de y formulario de contacto con Resend

**Estado:** Aprobado
**Depende de:** SPEC 01 (`specs/01-mvp-pantallas-visuales.md`, Implementado) y SPEC 02 (`specs/02-mover-biblioteca-a-games-y-404.md`, Implementado)
**Fecha:** 2026-10-11
**Objetivo:** Portar la pantalla "Acerca de" de `refereences/templates/home-about/about.jsx` a la ruta `/about`, idéntica a la plantilla, con un formulario de contacto que envía un correo real al equipo mediante Resend desde una Server Action.

---

## Alcance

### Dentro
- Nueva ruta **`/about`** que replica exactamente `about.jsx`: hero ("▸ ACERCA DE", título, misión), fila de 3 highlights con iconos SVG pixel (`HEART`, `BROWSER`, `PLANT`), divisor de píxeles animado, sección de contacto (intro, 3 tips con LED, formulario) y pantalla de éxito tipo terminal "VAULT-OS // TERMINAL" con "ENVIAR OTRO MENSAJE".
- Animación `.reveal` con `IntersectionObserver` (threshold 0.12), igual que la plantilla, respetando `prefers-reduced-motion`.
- Link **"Acerca de"** → `/about` en el Nav (escritorio y panel móvil), activo en `/about`.
- **Envío real de correo con Resend** desde una Server Action (`app/about/actions.ts`), usando `useActionState` en el cliente.
- Remitente `CONTACT_FROM_EMAIL` (por defecto `Arcade Vault <onboarding@resend.dev>`), destinatario `CONTACT_TO_EMAIL`, `replyTo` = correo del usuario.
- Correo con asunto `[Arcade Vault] Nuevo mensaje de <nombre>` y cuerpo en texto plano + HTML simple (nombre, correo, mensaje; HTML escapado).
- **Validación** compartida cliente/servidor sin dependencias: campos obligatorios con `trim`, email con regex simple, límites (nombre ≤ 60, email ≤ 254, mensaje 10–2000 caracteres).
- **Estados UX** extra sobre la plantilla: carga (botón deshabilitado con "TRANSMITIENDO…"), error de validación por campo + `shake`, y error de envío estilo terminal (`[ERR] …` en rojo) conservando lo escrito para reintentar.
- **Honeypot** anti-spam: campo oculto `website`; si llega relleno se devuelve éxito sin enviar.
- Variables de entorno en `.env` (ignorado) y `.env.template` commiteado con las claves vacías.
- Diseño: **usar SIEMPRE y obligatoriamente `/frontend-design` y `/ui-ux-pro-max`** (CLAUDE.md) antes de escribir o modificar cualquier UI de esta spec (página, formulario, estados, Nav).

### Fuera (explícito)
- **La home definitiva** (`home.jsx` de la misma plantilla) y el link "Inicio" del Nav: spec propia. `/` sigue siendo la home provisional de SPEC 02.
- Correo de confirmación al usuario que escribe (auto-reply).
- Dominio propio verificado en Resend (se habilita luego cambiando solo `CONTACT_FROM_EMAIL`).
- Rate limiting, CAPTCHA o almacenamiento de mensajes (BD, logs persistentes).
- Plantillas de correo con React Email.
- Route Handler / API pública (`/api/contact`).
- Tests automatizados (sigue sin runner).
- Cambios en datos de juegos, sesión (`av_user`) o puntuaciones (`av_scores`).

---

## Modelo de datos

Tipos en `lib/contact.ts` (módulo puro, importable desde cliente y servidor):

```ts
type ContactField = "name" | "email" | "msg";

interface ContactInput { name: string; email: string; msg: string }

type ContactState =
  | { status: "idle" }
  | { status: "invalid"; errors: Partial<Record<ContactField, string>>; values: ContactInput }
  | { status: "error"; message: string; values: ContactInput }   // fallo de Resend o config
  | { status: "sent"; name: string };

const CONTACT_LIMITS = { name: 60, email: 254, msgMin: 10, msgMax: 2000 } as const;

function validateContact(input: ContactInput): Partial<Record<ContactField, string>>;
```

Nombres de los campos del `FormData`: `name`, `email`, `msg`, `website` (honeypot).

Variables de entorno (solo servidor, nunca `NEXT_PUBLIC_`):

```bash
RESEND_API_KEY=
CONTACT_TO_EMAIL=          # el email de tu cuenta Resend mientras se use onboarding@resend.dev
CONTACT_FROM_EMAIL="Arcade Vault <onboarding@resend.dev>"
```

Sin persistencia: no se guarda nada entre sesiones.

---

## Archivos a crear / modificar

| Archivo | Acción |
|---|---|
| `package.json` / `package-lock.json` | añadir dependencia `resend` (única nueva) |
| `lib/contact.ts` | crear: tipos, `CONTACT_LIMITS`, `validateContact` |
| `app/about/actions.ts` | crear: `"use server"`, `sendContactMessage(prev: ContactState, formData: FormData): Promise<ContactState>` (honeypot → validación → env vars → `resend.emails.send`) |
| `app/about/page.tsx` | crear: server component con `metadata`, hero, highlights, divisor y sección de contacto |
| `components/highlight-icon.tsx` | crear: `HighlightIcon` (SVG pixel `HEART` / `BROWSER` / `PLANT`) |
| `components/reveal-observer.tsx` | crear: client, aplica `.in` a los `.reveal` con `IntersectionObserver` |
| `components/contact-form.tsx` | crear: client, `useActionState`, estados idle / carga / invalid / error / sent, terminal de éxito, "ENVIAR OTRO MENSAJE" (remonta el form con `key`) |
| `components/nav.tsx` | modificar: añadir `{ href: "/about", label: "Acerca de", match: p => p.startsWith("/about") }` a `LINKS` |
| `app/globals.css` | portar desde `refereences/templates/home-about/styles.css` (≈ líneas 1072–1200) las clases `.about*`, `.highlight*`, `.hl-*`, `.about-divider`/`.div-*`, `.contact-*`, `.tip*`, `.terminal-success`/`.term-*`, `.reveal`, `@keyframes shake`; más las nuevas de error (`.field-error`, `.term-error`) |
| `.env.template` | crear: las 3 claves |
| `.gitignore` | añadir `!.env.template` |

---

## Plan de implementación

Cada paso deja la app compilando (`npm run build`) y navegable.

1. **Leer la documentación de Next 16.4** en `node_modules/next/dist/docs/` sobre Server Actions / Server Functions, `useActionState`, formularios y variables de entorno (regla de CLAUDE.md), teniendo en cuenta `cacheComponents: true` de `next.config.ts`.
2. **Invocar `/frontend-design` y `/ui-ux-pro-max`** antes de tocar UI, y volver a aplicarlos en los pasos 4, 5, 6 y 7. Mantener la plantilla exacta; solo se añaden los estados de carga y error.
3. **Dependencia y config:** `npm install resend`; crear `.env.template`; añadir `!.env.template` a `.gitignore`.
4. **Página estática `/about`:** portar CSS a `globals.css`, crear `HighlightIcon`, `RevealObserver` y `app/about/page.tsx` con hero, highlights, divisor e intro de contacto. El formulario aún sin acción (solo visual).
5. **Nav:** añadir "Acerca de" a `LINKS`; comprobar activo en `/about` y ninguno de más en otras rutas.
6. **Validación y Server Action:** `lib/contact.ts` y `app/about/actions.ts`. Si falta `RESEND_API_KEY` o `CONTACT_TO_EMAIL`, devolver `{ status: "error" }` (y `console.error` en servidor), sin lanzar excepción.
7. **`ContactForm` cableado:** `useActionState(sendContactMessage, { status: "idle" })`, `pending` → "TRANSMITIENDO…", errores por campo con `aria-invalid` / `aria-describedby`, `shake` en `invalid`, línea `[ERR]` en `error`, terminal con `GRACIAS, <NOMBRE>.` en `sent`; "ENVIAR OTRO MENSAJE" vuelve a un formulario vacío. Validación también en cliente antes de enviar.
8. **Verificación con Playwright** (MCP `mcp__playwright__*`): `/about` en escritorio y ≤ 768 px; enviar vacío, email inválido, sin API key y con API key real. Capturas en `.playwright-screenshots/`, artefactos en `.playwright-mcp/`.
9. **Pulido:** `npm run lint`, `npm run build`, recorrido de los criterios de aceptación.

---

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/about` muestra hero, misión, los 3 highlights con sus iconos, el divisor de 24 píxeles, la intro de contacto con 3 tips y el formulario, con los mismos textos y estilos que `about.jsx`.
- [ ] El Nav (escritorio y móvil) tiene "Acerca de" → `/about`, activo solo en `/about`.
- [ ] Enviar con algún campo vacío no llama al servidor, muestra el error junto al campo y aplica el `shake`.
- [ ] Un email inválido (`abc`) o un mensaje de menos de 10 caracteres muestra error de campo; la Server Action rechaza lo mismo si se salta la validación del cliente.
- [ ] Durante el envío el botón está deshabilitado y muestra "TRANSMITIENDO…".
- [ ] Con `.env` válido, un envío correcto muestra la terminal con "MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, <NOMBRE>." y el correo llega a `CONTACT_TO_EMAIL` con asunto `[Arcade Vault] Nuevo mensaje de <nombre>` y `Reply-To` = correo del usuario.
- [ ] Sin `RESEND_API_KEY`, el envío muestra la línea `[ERR]`, conserva lo escrito y la página no se rompe.
- [ ] Con el campo `website` relleno, se muestra éxito y no se envía ningún correo.
- [ ] "ENVIAR OTRO MENSAJE" vuelve al formulario vacío.
- [ ] Un mensaje con `<script>` llega escapado en el HTML del correo.
- [ ] `RESEND_API_KEY` no aparece en el bundle del cliente (`grep -r RESEND_API_KEY .next/static` sin resultados).
- [ ] `.env.template` está commiteado; `.env` no aparece en `git status`.
- [ ] Los `.reveal` aparecen al hacer scroll y sin animación con `prefers-reduced-motion: reduce`.
- [ ] Sin scroll horizontal a ≤ 768 px; el grid de contacto pasa a una columna a ≤ 900 px.
- [ ] Campos y botones operables con teclado (foco visible) y con `label` asociado.
- [ ] Se invocaron `/frontend-design` y `/ui-ux-pro-max` y sus recomendaciones quedaron aplicadas (o descartadas con motivo anotado).
- [ ] Capturas de Playwright en `.playwright-screenshots/` y artefactos en `.playwright-mcp/`, ignorados por git.

---

## Decisiones tomadas y descartadas

- **Ruta `/about`** (inglés, como `/games`). *Descartado:* `/acerca`.
- **Solo se añade "Acerca de" al Nav.** *Descartado:* añadir "Inicio" ahora; llega con la spec de la home definitiva.
- **Server Action + `useActionState`.** Sin endpoint público y la API key no sale del servidor. *Descartado:* Route Handler `/api/contact`.
- **`onboarding@resend.dev` → `CONTACT_TO_EMAIL`, `replyTo` del usuario.** Funciona sin dominio verificado. *Descartado:* dominio propio por ahora.
- **Sin auto-reply al usuario:** Resend en modo onboarding no permite enviar a terceros, y la terminal ya confirma.
- **Validación manual compartida** en `lib/contact.ts`. *Descartado:* Zod (dependencia extra para 3 campos).
- **Honeypot como único anti-spam.** *Descartado:* rate limit en memoria (no fiable en serverless) y CAPTCHA.
- **Correo en texto plano + HTML escapado.** *Descartado:* React Email.
- **Estados de carga y error añadidos** a la plantilla, en estilo terminal, para no ocultar fallos reales de envío.
- **`.env.template` commiteado** con `!.env.template` en `.gitignore`. *Descartado:* documentarlo solo en el README.
- **Verificación con envío real** usando la API key del usuario, más el caso sin key.

---

## Riesgos identificados

| Riesgo | Mitigación |
|---|---|
| Resend en modo onboarding rechaza destinatarios distintos al email de la cuenta | `CONTACT_TO_EMAIL` debe ser el email de la cuenta Resend; documentado en `.env.template`. |
| Falta de env vars en producción/local | La acción devuelve `{ status: "error" }` con `[ERR]` en vez de lanzar; `console.error` en servidor. |
| Fuga de la API key al cliente | Solo se lee en `app/about/actions.ts` (`"use server"`); criterio con `grep` sobre `.next/static`. |
| Inyección HTML en el correo | Escapar `& < > " '` en el cuerpo HTML; el texto plano va tal cual. |
| `cacheComponents` y Server Actions | Paso 1: leer la doc local; la página es estática y la acción solo se ejecuta en submit. |
| CSS de la plantilla choca con clases existentes (`.field`, `.btn`, `.kicker`) | Portar solo las clases nuevas y reutilizar las existentes; revisar visualmente `/login` tras el cambio. |
| Abuso del formulario (spam masivo) | Honeypot ahora; rate limit en spec futura si aparece el problema. |

---

## Lo que **no** entra en esta spec

- Home definitiva y link "Inicio" en el Nav.
- Auto-reply al usuario y dominio propio en Resend.
- Rate limiting, CAPTCHA o guardado de mensajes.
- React Email.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
