## Checklist de seguridad básico

  - [x] RLS: Row Level Security habilitado en ambas tablas: `games` y `scores`
  - [x] Minimum password length — mínimo 8 caracteres
  - [x] Leaked password protection — (el warning 4)
  - [x] Max signup rate — limitar signups por IP (anti-bot)
  - [x] Headers de seguridad en Next.js
  
  Ej:

```ts
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

// En la config de Next.js:
headers: async () => [
  { source: '/(.*)', headers: securityHeaders }
]
```

## Por el lado de Supabase:

- [x] TODO: vayan al panel de warnings y errores de Supabase

---

## Aplicado — 2026-10-15 (SPEC 15)

- **Migración `harden_security_definer_functions`** (vía MCP de Supabase):
  - `REVOKE EXECUTE` a `public/anon/authenticated` sobre `public.handle_new_user()` y `public.rls_auto_enable()`.
  - `GRANT EXECUTE` sobre `public.handle_new_user()` a `supabase_auth_admin` (el trigger `on_auth_user_created` sigue funcionando).
  - `search_path = public, pg_temp` fijado en ambas funciones.
  - Advisors `anon_security_definer_function_executable` y `authenticated_security_definer_function_executable` eliminados tras aplicar.
- **Headers de seguridad en `next.config.ts`** (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`) para `/(.*)`.
- **Protección de rutas en `lib/supabase/middleware.ts`**: `/update-password` requiere sesión y redirige a `/login?redirectTo=...`; `/login` y `/register` redirigen a `/` cuando hay sesión. El refresh de cookies de `@supabase/ssr` se mantiene en el mismo paso.
- **Dashboard de Supabase** (manual, Auth > Policies y Auth > Rate Limits):
  - Password policy: `Minimum length = 8`, `Required characters = Lowercase + Uppercase + Digits + Symbols`.
  - Rate limits: `Sign up = 10/h/IP`, `Sign in with password = 30/h/IP`, `Password recovery = 5/h/IP`.
  - `Leaked password protection`: pendiente de confirmar — el advisor `auth_leaked_password_protection` seguía activo al cerrar SPEC 15; revisar en una próxima pasada.

Verificación posterior pendiente (humo manual):
- Signup con contraseña débil (`123123123`) rechazado por la política estricta.
- Signup con contraseña correcta (`Cocacola8!`) aceptado.
- `curl -sI http://localhost:3000/` muestra los tres headers.
- 11 signups desde una IP en una hora devuelve `429`.

---

## Aplicado — 2026-10-15 (SPEC 16)

- **`mapAuthError` como embudo único** (`lib/auth/actions.ts`): fallback genérico (`"No se pudo completar la operación. Vuelve a intentarlo."`) y `console.error("[auth] unmapped", ...)` en servidor. `signInWithProvider` también enruta por `mapAuthError`.
- **`requestPasswordReset` anti-enumeración** (`lib/auth/actions.ts`): siempre devuelve `{ ok: true }` cuando el email es sintácticamente válido; el error real queda sólo en `console.error("[auth] reset", ...)`.
- **`safeReturnTo` con allowlist cerrada** (`lib/auth/return-to.ts`): nuevo `ALLOWED_RETURN_TO_PREFIXES` (`/`, `/games`, `/salon`, `/about`, `/update-password`, `/login`, `/register`). Match por prefijo exacto o seguido de `/`; rutas no listadas caen al fallback.
- **Rate limit propio por IP** (`lib/auth/rate-limit.ts` + `lib/auth/actions.ts`): sliding window en memoria con `checkRateLimit(bucket, limit, windowMs)` y `getClientIp()` sobre `x-forwarded-for`. Límites por IP: `signIn` 10/10min, `signUp` 5/h, `requestPasswordReset` 5/h, `signInWithProvider` 20/h.

Verificación posterior pendiente (humo manual):

- Forzar un error de Supabase → UI muestra el genérico y stderr contiene `[auth] unmapped`.
- `requestPasswordReset` con email no registrado → mismo mensaje neutral en UI; sin correo enviado.
- 11 `signIn` desde la misma IP en <10 min → el 11º devuelve el mensaje de rate limit sin pegarle a Supabase.
- `safeReturnTo("/admin")`, `safeReturnTo("/api/x")` → fallback `/`; `safeReturnTo("/games/snake")` → se mantiene.



| name                                               | title                                                 | level | facing   | categories   | description                                                                                                                                                                                                              | detail                                                                                                                                                                                                                               | remediation                                                                                                            | metadata                                                                                                 | cache_key                                                                  | observed_at              |
| -------------------------------------------------- | ----------------------------------------------------- | ----- | -------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------ |
| anon_security_definer_function_executable          | Public Can Execute SECURITY DEFINER Function          | WARN  | EXTERNAL | ["SECURITY"] | Detects `SECURITY DEFINER` functions that are callable without signing in. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if it is not meant to be public.       | Function `public.handle_new_user()` can be executed by the `anon` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/handle_new_user`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.          | https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable          | {"schema":"public","name":"handle_new_user","language":"plpgsql","arguments":"","security_definer":true} | anon_security_definer_function_executable_public_handle_new_user_          | 2026-10-15T17:41:12.069Z |
| anon_security_definer_function_executable          | Public Can Execute SECURITY DEFINER Function          | WARN  | EXTERNAL | ["SECURITY"] | Detects `SECURITY DEFINER` functions that are callable without signing in. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if it is not meant to be public.       | Function `public.rls_auto_enable()` can be executed by the `anon` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/rls_auto_enable`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.          | https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable          | {"schema":"public","name":"rls_auto_enable","language":"plpgsql","arguments":"","security_definer":true} | anon_security_definer_function_executable_public_rls_auto_enable_          | 2026-10-15T17:41:12.069Z |
| authenticated_security_definer_function_executable | Signed-In Users Can Execute SECURITY DEFINER Function | WARN  | EXTERNAL | ["SECURITY"] | Detects `SECURITY DEFINER` functions that are callable by signed-in users. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if signed-in users should not call it. | Function `public.handle_new_user()` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/handle_new_user`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional. | https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable | {"schema":"public","name":"handle_new_user","language":"plpgsql","arguments":"","security_definer":true} | authenticated_security_definer_function_executable_public_handle_new_user_ | 2026-10-15T17:41:12.069Z |
| authenticated_security_definer_function_executable | Signed-In Users Can Execute SECURITY DEFINER Function | WARN  | EXTERNAL | ["SECURITY"] | Detects `SECURITY DEFINER` functions that are callable by signed-in users. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if signed-in users should not call it. | Function `public.rls_auto_enable()` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/rls_auto_enable`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional. | https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable | {"schema":"public","name":"rls_auto_enable","language":"plpgsql","arguments":"","security_definer":true} | authenticated_security_definer_function_executable_public_rls_auto_enable_ | 2026-10-15T17:41:12.069Z |
| auth_leaked_password_protection                    | Leaked Password Protection Disabled                   | WARN  | EXTERNAL | ["SECURITY"] | Leaked password protection is currently disabled.                                                                                                                                                                        | Supabase Auth prevents the use of compromised passwords by checking against HaveIBeenPwned.org. Enable this feature to enhance security.                                                                                             | https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection               | {"entity":"Auth","type":"auth"}                                                                          | auth_leaked_password_protection                                            |                          |