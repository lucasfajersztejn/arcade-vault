# SPEC 16 — Hardening de Auth: fuga de errores, enumeración y rate limit propio

**Estado:** Aprobado
**Depende de:** SPEC 14 (`specs/14-auth-y-cuentas-de-usuario.md`) por Supabase Auth, `profiles` y las Server Actions de `lib/auth/actions.ts`; SPEC 15 (`specs/15-seguridad-basica.md`) por la base de seguridad (RLS, headers, rate limits de Supabase a nivel dashboard)
**Fecha:** 2026-10-15
**Objetivo:** Cerrar los huecos detectados en la revisión manual del plugin `security-guidance` sobre `lib/auth/*` y `components/login-form.tsx`: dejar de filtrar texto crudo de errores del backend al cliente, impedir enumeración de usuarios vía el reset de contraseña, endurecer `safeReturnTo` ante rutas internas no previstas y añadir un rate limit propio por IP sobre las Server Actions sensibles — sin tocar la mecánica de los juegos ni el contrato motor ↔ plataforma.

---

## Por qué existe esta spec

La revisión del plugin Security-Guidance sobre el código de auth encontró cinco puntos reales que SPEC 14 y SPEC 15 no cubren:

- `mapAuthError` (`lib/auth/actions.ts:106-121`) cae a `return message` cuando no reconoce el error de Supabase. El texto crudo del backend llega al cliente (p. ej. detalles de SMTP, errores internos de PostgREST). Filtra información útil para un atacante y es ruido para el usuario.
- `signInWithProvider` (`lib/auth/actions.ts:101-104`) devuelve `error?.message` sin pasar por `mapAuthError`. Mismo problema con el error raw de OAuth.
- `requestPasswordReset` (`lib/auth/actions.ts:72-84`) declara en comentario que no filtra la base, pero sí devuelve `{ ok: false, error }` cuando Supabase falla — un atacante puede distinguir «email existe» (lento, 200 OK) de «no existe» (error específico). Enumeración trivial.
- `safeReturnTo` (`lib/auth/return-to.ts`) es correcto pero permisivo: acepta cualquier path interno. Si en el futuro se añaden rutas administrativas o sub-apps (`/admin`, `/_debug`, `/api/...`), un atacante podría usarlas como destino tras login y encadenarlas con un XSS/CSRF futuro.
- Las Server Actions `signIn`, `signUp`, `requestPasswordReset` y `signInWithProvider` dependen sólo del rate limit de Supabase (SPEC 15, dashboard). Supabase cuenta por IP a nivel de su endpoint; un atacante que apunte directamente a nuestras Server Actions todavía puede hacer brute-force contra `/login` sin pegarle a Supabase hasta superar nuestra validación local. Un rate limit propio por IP cierra el loop y además nos deja observar el abuso en nuestros logs.

Las cinco maniobras son cortas, viven en los mismos tres ficheros (`lib/auth/actions.ts`, `lib/auth/return-to.ts`, nuevo `lib/auth/rate-limit.ts`) y se verifican con los mismos smoke tests; agruparlas en una spec evita cuatro PR ruido.

---

## Alcance

**Dentro:**

- **`mapAuthError` como única salida de errores de auth al cliente.** Reescribir el fallback a un mensaje genérico (`"No se pudo completar la operación. Vuelve a intentarlo."`) y loguear el `message` original con `console.error("[auth]", message)` para que quede en los logs de servidor sin cruzar al cliente. Enrutar `signInWithProvider` por `mapAuthError` también.
- **Reset de contraseña sin enumeración.** `requestPasswordReset` siempre devuelve `{ ok: true }` cuando el email es sintácticamente válido, incluso si Supabase devuelve error. El error real se loguea en servidor (`console.error`), pero el cliente nunca lo ve. Mensaje de UI al usuario: _"Si tu correo está registrado, te enviaremos un enlace en breve."_
- **`safeReturnTo` con allowlist por prefijo.** Pasar de «cualquier path que empiece por `/`» a allowlist explícito: `/`, `/games`, `/salon`, `/about`, `/update-password`, `/login`, `/register`. Match por prefijo exacto o seguido de `/` o `?`. Cualquier otra cosa cae al `fallback`. Mantener el bloqueo de `//`, `/\`, protocolos. La lista vive como constante exportada `ALLOWED_RETURN_TO_PREFIXES` para que `/register` y futuros flujos la reutilicen.
- **Rate limit propio por IP sobre Server Actions.** Nuevo módulo `lib/auth/rate-limit.ts` con un limiter en memoria (sliding window básico: `Map<ip, number[]>` con purga perezosa). Decora las cuatro Server Actions:
  - `signIn`: 10 intentos / 10 min / IP.
  - `signUp`: 5 intentos / hora / IP.
  - `requestPasswordReset`: 5 intentos / hora / IP.
  - `signInWithProvider`: 20 intentos / hora / IP (más alto; es sólo un redirect).

  La IP se lee de `headers().get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"`. Si está `"unknown"`, el limiter cuenta sobre un bucket global `"unknown"` (y por tanto limita a todos los que no mandan `x-forwarded-for` juntos — aceptable para MVP tras un proxy que siempre lo manda). Al superar el límite, la action devuelve `{ ok: false, error: "Demasiados intentos. Espera un momento y vuelve a probar." }` sin llamar a Supabase.

- **Log mínimo.** `console.error("[auth]", ...)` en cada rama de error. No se añade un sink externo; se asume que Vercel/host captura stderr.
- **Tests manuales** documentados abajo (no hay runner).

**Fuera (otra spec):**

- CAPTCHA (hCaptcha/Turnstile) en registro y reset de contraseña.
- Rate limit distribuido (Upstash Ratelimit, Redis, etc.). El in-memory de esta spec sirve mientras el deploy sea mono-instancia; migrar a Upstash es cambio aislado detrás de la misma interfaz `checkRateLimit(key, limit, windowMs)`.
- Content-Security-Policy / `Permissions-Policy` / HSTS (continuación natural de SPEC 15).
- Auditoría de logs y alertas de abuso.
- Validar más estrictamente `display_name` (ya cubre SPEC 14 con la regex).
- Confirmación de email obligatoria antes de `signIn` (ya es default de Supabase; no se toca).
- Rotación de la `anon key`.

---

## Modelo de datos

Esta spec no toca la base de datos. No hay migraciones. Toda la lógica vive en `lib/auth/*` y `components/*` (sólo mensajes de UI).

---

## Plan de implementación

Cada paso deja el sistema en estado funcional y es commitable por sí mismo.

1. **`mapAuthError` como embudo único.**
   - En `lib/auth/actions.ts`, cambiar el `return message` final por `console.error("[auth] unmapped", message); return "No se pudo completar la operación. Vuelve a intentarlo.";`.
   - En `signInWithProvider`, cambiar la rama de error a `{ ok: false, error: mapAuthError(error?.message ?? "") }` y loguear el original.
   - Smoke test: forzar un error de Supabase (apagar la URL en `.env.local` momentáneamente) y verificar que la UI muestra el genérico y que `npm run dev` imprime el `[auth]` en consola.

2. **Reset de contraseña sin enumeración.**
   - En `requestPasswordReset`, tras validar el email, llamar `supabase.auth.resetPasswordForEmail(...)` y, pase lo que pase, devolver `{ ok: true }`. Si hay error, `console.error("[auth] reset", error.message)`.
   - En el componente `ResetPasswordForm` (asumiendo que existe tras SPEC 14), cambiar el texto de éxito al mensaje neutral de la sección «Alcance».
   - Smoke test: pedir reset con un email que no existe → UI muestra el mensaje neutral; con uno que sí existe → mismo mensaje y el correo llega.

3. **`safeReturnTo` con allowlist explícita.**
   - Reescribir `lib/auth/return-to.ts` exportando `ALLOWED_RETURN_TO_PREFIXES = ["/", "/games", "/salon", "/about", "/update-password", "/login", "/register"] as const`.
   - La función admite el valor si: (a) empieza por `/`, (b) no empieza por `//` ni `/\`, y (c) el pathname (parte antes de `?` o `#`) es igual a un prefijo exacto o el prefijo seguido de `/`.
   - Smoke test: `safeReturnTo("/games")` → `/games`, `safeReturnTo("/games/snake")` → `/games/snake`, `safeReturnTo("/admin")` → `/` (fallback), `safeReturnTo("//evil.com")` → `/`, `safeReturnTo("/\\evil")` → `/`.

4. **Rate limiter en memoria.**
   - Crear `lib/auth/rate-limit.ts` con la interfaz:

     ```ts
     export type RateLimitResult =
       { ok: true } | { ok: false; retryAfterMs: number };
     export function checkRateLimit(
       bucket: string,
       limit: number,
       windowMs: number,
     ): RateLimitResult;
     ```

   - Implementación con `Map<string, number[]>` global al módulo. Al entrar, filtra timestamps más viejos que `now - windowMs`, cuenta, decide, pushea el nuevo. Purga perezosa cuando el array queda vacío.
   - Nuevo helper `getClientIp()` que lee `x-forwarded-for` desde `headers()` (de `next/headers`) y devuelve la primera IP; fallback `"unknown"`.

5. **Enganchar el rate limit a las cuatro actions.**
   - Al principio de cada Server Action: `const ip = await getClientIp(); const rl = checkRateLimit(\`${name}:${ip}\`, LIMIT, WINDOW_MS); if (!rl.ok) return { ok: false, error: "Demasiados intentos. Espera un momento y vuelve a probar." };`.
   - Constantes centralizadas al principio del archivo (`RATE_SIGNIN`, `RATE_SIGNUP`, `RATE_RESET`, `RATE_OAUTH`).
   - Smoke test: desde devtools, disparar 11 `signIn` seguidos con credenciales inválidas → el 11º devuelve el mensaje de rate limit; esperar la ventana → vuelve a funcionar.

6. **Verificación final y nota en checklist.**
   - Añadir una línea a `refereences/references/security-checklist.md` bajo «Aplicado» con fecha y hash de commit por cada paso.
   - Revisar que `npm run lint` y `npm run build` pasan.

---

## Criterios de aceptación

- [ ] Forzar un error de Supabase durante `signIn` muestra en la UI _"No se pudo completar la operación. Vuelve a intentarlo."_ y el stderr del servidor contiene `[auth] unmapped <mensaje real>`.
- [ ] `signInWithProvider` con un provider mal configurado muestra el mismo genérico en UI y loguea el error real.
- [ ] `requestPasswordReset` devuelve el mismo mensaje neutral en UI tanto para un email registrado como para uno no registrado; el correo real sólo llega al registrado.
- [ ] `safeReturnTo("/admin")`, `safeReturnTo("/api/x")`, `safeReturnTo("/_next/...")` devuelven el `fallback`. `safeReturnTo("/games")` y `safeReturnTo("/games/snake")` devuelven el valor sin cambios. (Verificable con un script de un solo archivo o en la consola del navegador si se expone temporalmente.)
- [ ] Realizar 11 intentos de `signIn` desde la misma IP en < 10 min devuelve _"Demasiados intentos..."_ en el 11º sin llegar a tocar Supabase (verificar en el panel de Supabase que el contador de requests no sube en el intento bloqueado).
- [ ] 6 intentos de `requestPasswordReset` desde la misma IP en < 1 h devuelven el mensaje de rate limit en el 6º.
- [ ] `npm run lint` y `npm run build` pasan sin warnings nuevos.
- [ ] Entrada «Aplicado — SPEC 16» añadida al final de `refereences/references/security-checklist.md` con fecha y hashes de commit.

---

## Decisiones

- **Sí:** rate limit en memoria. Suficiente para MVP mono-instancia; cero dependencias externas; la interfaz queda preparada para cambiar la implementación por Upstash sin tocar las actions.
- **No:** rate limit por `user_id`. En `signIn`/`signUp` no hay usuario autenticado todavía; por email abriría un vector de bloqueo dirigido (atacante satura `victima@x.com` para que no pueda entrar). Por IP es el default razonable.
- **Sí:** fallback genérico en `mapAuthError`. El coste UX es mínimo (los errores reconocidos siguen cubiertos) y evita filtrar detalle de infraestructura.
- **Sí:** `requestPasswordReset` siempre devuelve `ok` cuando el email es válido. Es el patrón estándar anti-enumeración; el usuario no pierde información útil (si existe, le llega el correo).
- **Sí:** `safeReturnTo` con allowlist cerrada. Es un salto chico de permisivo a estricto y protege de rutas futuras no previstas. Añadir una ruta nueva al allowlist es trivial.
- **No:** CAPTCHA en registro. Alta fricción UX, dependencia nueva, y los rate limits + leaked password protection de SPEC 15 cubren el abuso realista del MVP.
- **No:** usar un header distinto de `x-forwarded-for` (Cloudflare `cf-connecting-ip`, Vercel `x-real-ip`, etc.). Vercel ya normaliza a `x-forwarded-for`; si el deploy cambia, se adapta `getClientIp()`.
- **Sí:** loguear a `console.error` sin sink externo. Vercel captura stderr; añadir un servicio de logging es alcance aparte.

---

## Riesgos

| Riesgo                                                                                                                | Mitigación                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rate limit en memoria no sirve si el deploy pasa a multi-instancia / serverless con cold starts frecuentes.           | La interfaz `checkRateLimit` queda aislada en `lib/auth/rate-limit.ts`. Cambiar la implementación a Upstash es un solo fichero, sin tocar las actions. Documentar en el README del módulo.                                              |
| El fallback «unknown» para IP agrupa a todos los que no envían `x-forwarded-for`, bloqueando legítimos.               | Vercel y la mayoría de hosts siempre envían ese header. En local, el header suele no estar, pero el riesgo es de self-DOS en dev, no en prod. Si molesta, se puede bypassear el limiter cuando `process.env.NODE_ENV !== "production"`. |
| Allowlist de `safeReturnTo` corta flujos legítimos a rutas no listadas (p. ej. una ruta nueva añadida por otra spec). | La lista está centralizada y exportada; añadir una ruta nueva es una línea. Los criterios de aceptación verifican el fallback explícito, lo que fuerza a documentar la adición.                                                         |
| Mensaje neutral de reset de contraseña confunde al usuario (no sabe si funcionó).                                     | El copy es explícito («si tu correo está registrado, te enviaremos un enlace») y es el estándar de la industria (GitHub, Google, etc.).                                                                                                 |
| Rate limit bloquea tests manuales de QA desde la misma IP.                                                            | Los valores son holgados para QA (10 signins / 10 min). Si molestan, se tocan las constantes al principio de `actions.ts` o se bypassea en dev.                                                                                         |
| El `console.error` filtra el `message` original a los logs si éstos son públicos.                                     | Los logs de Vercel son privados por defecto. No se loguea el email ni la contraseña; sólo el mensaje de Supabase, que no contiene PII sensible más allá del contexto del error.                                                         |

---

## Lo que **no** entra en esta spec

- CAPTCHA en registro o reset.
- Rate limit distribuido (Upstash/Redis).
- CSP, HSTS, Permissions-Policy.
- Logs estructurados a un sink externo (Datadog, Logtail, etc.).
- Alertas automáticas de abuso.
- Bloqueo temporal de cuenta tras N intentos fallidos (lockout por `user_id`).
- Internacionalización de mensajes de error.

Cada uno, si aterriza, en su propia spec.
