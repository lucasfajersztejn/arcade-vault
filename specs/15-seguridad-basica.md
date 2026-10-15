# SPEC 15 — Seguridad básica (RLS, Auth hardening, headers y advisors)

**Estado:** Implementado
**Depende de:** SPEC 04 (`specs/04-integracion-supabase.md`) por el cliente Supabase; SPEC 06 (`specs/06-leaderboard-y-tabla-games.md`) por las tablas `games`/`scores`; SPEC 14 (`specs/14-auth-y-cuentas-de-usuario.md`) por Supabase Auth, `profiles` y el trigger `on_auth_user_created`
**Fecha:** 2026-10-15
**Objetivo:** Aplicar el checklist de seguridad básico del proyecto (RLS verificado, políticas de contraseña y rate limit en Supabase Auth, headers de seguridad en Next.js y resolución de los dos advisors de `SECURITY DEFINER` expuestos públicamente) sin tocar mecánicas de juego ni el contrato motor ↔ plataforma.

---

## Por qué existe esta spec

El checklist (`refereences/references/security-checklist.md`) y los advisors de Supabase marcan huecos reales que SPEC 14 no cubrió:

- Las funciones `public.handle_new_user()` y `public.rls_auto_enable()` son `SECURITY DEFINER` y son invocables por `anon`/`authenticated` vía `/rest/v1/rpc/*`. Cualquiera con la `anon key` puede llamarlas desde el navegador. `handle_new_user` solo está pensada como trigger `on_auth_user_created`; `rls_auto_enable` es utilitaria del dueño del proyecto.
- Supabase Auth tiene `Leaked password protection` desactivado y la política de contraseña por defecto (sin complejidad).
- No hay rate limit explícito sobre signups: con la `anon key` pública un bot puede crear cuentas en bucle.
- Next.js no envía headers de seguridad básicos (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).
- SPEC 06 y SPEC 14 ya habilitaron RLS en `games` y `scores`, pero no existe un paso que lo deje verificado y auditado dentro de una spec.

Esta spec cierra todos esos puntos a la vez porque son maniobras cortas y relacionadas; separarlas no aporta claridad.

---

## Alcance

**Dentro:**

- **Verificación de RLS en `games` y `scores`.** Un paso consulta `pg_class.relrowsecurity` y `pg_policies` para ambas tablas y deja constancia del estado. Si por alguna razón RLS no estuviera activo en una de ellas, la migración lo activa (`alter table ... enable row level security`).
- **Hardening de `handle_new_user` y `rls_auto_enable`.** Mantener `SECURITY DEFINER` (el trigger de perfiles necesita permisos elevados) pero quitar el `EXECUTE` a los roles expuestos por PostgREST:
  - `revoke all on function public.handle_new_user() from public, anon, authenticated;`
  - `revoke all on function public.rls_auto_enable() from public, anon, authenticated;`
  - `grant execute on function public.handle_new_user() to supabase_auth_admin;` (el rol que dispara el trigger).
  - `alter function public.handle_new_user() set search_path = public, pg_temp;` (buena práctica contra `search_path` hijacking al mantener `SECURITY DEFINER`).
  - `alter function public.rls_auto_enable() set search_path = public, pg_temp;` idem.
- **Política de contraseñas en Supabase Auth** (dashboard, Auth > Policies):
  - Mínimo 8 caracteres.
  - Requisitos de complejidad: `lowercase + uppercase + digits + symbols` (la opción más estricta disponible en Supabase).
  - `Leaked password protection` activado (chequeo contra HaveIBeenPwned).
- **Rate limits en Supabase Auth** (dashboard, Auth > Rate Limits): bajar los límites por hora de `sign up` y `token refresh` a valores razonables de MVP para limitar abuso por IP. Valores propuestos: `sign up` = 10/hora/IP, `sign in with password` = 30/hora/IP, `password recovery` = 5/hora/IP, dejando el resto en default. Documentados en la spec como pasos manuales con checkboxes.
- **Headers de seguridad en `next.config.ts`.** Función `async headers()` que aplica a `/(.*)`:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- **Documentación de operación**: una sección breve en `refereences/references/security-checklist.md` que anota qué quedó aplicado y cómo verificarlo (fecha + commit). No se mueve el archivo ni se renombra.
- Protección de rrutas con Proxy Next.js: información sobre proxy aquí: https://nextjs.org/docs/app/getting-started/proxy
  ejemplo:
  proxy.ts
  import { NextResponse } from 'next/server'
  import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export function proxy(request: NextRequest) {
return NextResponse.redirect(new URL('/home', request.url))
}

// Alternatively, you can use a default export:
// export default function proxy(request: NextRequest) { ... }

export const config = {
matcher: '/about/:path*',
}

**Fuera (otra spec):**

- Content-Security-Policy (CSP) con allowlist de scripts/estilos. Requiere auditar Supabase, Resend y cualquier analytics; va en spec aparte.
- `Permissions-Policy` y `Strict-Transport-Security`. Se pueden añadir luego sin cambios de lógica.
- CAPTCHA (hCaptcha/Turnstile) en registro/reset de contraseña.
- Rotación de la `anon key` o auditoría de llaves.
- Logs de auditoría o detección de abuso (requiere infraestructura).
- Revisión de RLS en vistas (`leaderboard`, `game_stats`): se asume el comportamiento `security_invoker` por defecto.
- Políticas de retención de datos o GDPR.

---

## Modelo de datos

Esta spec no introduce nuevas tablas, columnas ni vistas. Toca permisos (`GRANT`/`REVOKE`) y propiedades (`search_path`) de funciones existentes, además de verificar RLS ya configurado.

Resumen de los cambios SQL (se aplican en una sola migración `harden_security_definer_functions`):

```sql
-- Verificación (no destructiva): sólo lee y aborta si falta RLS.
do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.games'::regclass) then
    raise exception 'RLS no está habilitado en public.games';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.scores'::regclass) then
    raise exception 'RLS no está habilitado en public.scores';
  end if;
end $$;

-- Hardening de SECURITY DEFINER.
revoke all on function public.handle_new_user()  from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

grant execute on function public.handle_new_user() to supabase_auth_admin;

alter function public.handle_new_user()  set search_path = public, pg_temp;
alter function public.rls_auto_enable() set search_path = public, pg_temp;
```

El trigger `on_auth_user_created` sigue funcionando porque se ejecuta como el `owner` de la función (postgres), no como el llamador.

---

## Plan de implementación

Cada paso deja el sistema en estado funcional y es commitable por sí mismo.

1. **Auditoría previa (sin cambios).** Ejecutar vía MCP `mcp__supabase__execute_sql`:
   - `select relname, relrowsecurity from pg_class where oid in ('public.games'::regclass, 'public.scores'::regclass);`
   - `select proname, prosecdef, proacl from pg_proc where proname in ('handle_new_user','rls_auto_enable') and pronamespace = 'public'::regnamespace;`
   - `mcp__supabase__get_advisors({ type: "security" })` para dejar snapshot del estado antes de tocar nada.
   - Resultado se transcribe en el commit message del paso 2.

2. **Migración `harden_security_definer_functions`.** Aplicar vía `mcp__supabase__apply_migration` el SQL de la sección «Modelo de datos». Verificar en los advisors que `anon_security_definer_function_executable` y `authenticated_security_definer_function_executable` para ambas funciones desaparecen. Smoke test manual: registrarse con un email nuevo desde `/register` y comprobar que el perfil se crea (el trigger sigue vivo).

3. **Headers de seguridad en Next.js.** Editar `next.config.ts` para añadir:

   ```ts
   headers: async () => [
     {
       source: "/(.*)",
       headers: [
         { key: "X-Content-Type-Options", value: "nosniff" },
         { key: "X-Frame-Options", value: "DENY" },
         { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
       ],
     },
   ],
   ```

   Verificar con `curl -sI http://localhost:3000/ | rg -i 'x-content|x-frame|referrer'` tras `npm run dev`.

4. **Protección de rutas con Proxy Next.js**

5. **Configuración manual en el dashboard de Supabase** (Auth > Policies y Auth > Rate Limits):
   - Password policy: `Minimum length = 8`, `Required characters = Lowercase, Uppercase, Digits, Symbols`, `Leaked password protection = ON`.
   - Rate limits: `Sign up = 10/h/IP`, `Sign in with password = 30/h/IP`, `Password recovery = 5/h/IP`.
   - Guardar y verificar con `mcp__supabase__get_advisors({ type: "security" })` que `auth_leaked_password_protection` desaparece.

6. **Registro de la operación.** Añadir al final de `refereences/references/security-checklist.md` una sección «Aplicado» con fecha (2026-10-15), hash de commit de la migración y hash de commit del cambio de `next.config.ts`. Marcar los checkboxes del principio del archivo.

---

## Criterios de aceptación

- [x] `mcp__supabase__get_advisors({ type: "security" })` no devuelve `anon_security_definer_function_executable` ni `authenticated_security_definer_function_executable` para `public.handle_new_user` ni `public.rls_auto_enable`.
- [ ] `mcp__supabase__get_advisors({ type: "security" })` no devuelve `auth_leaked_password_protection`. _(Pendiente: toggle del dashboard no quedó aplicado al cerrar SPEC 15.)_
- [ ] Un usuario nuevo puede registrarse desde `/register` y su fila en `public.profiles` queda creada (el trigger sigue funcionando pese al `REVOKE`). _(Humo manual pendiente.)_
- [ ] Un cliente autenticado que llame `supabase.rpc('handle_new_user')` desde el navegador recibe `permission denied` (verificado con una llamada manual desde devtools). _(Humo manual pendiente.)_
- [x] `select relrowsecurity from pg_class where oid = 'public.games'::regclass` devuelve `true`; idem para `public.scores`.
- [ ] Supabase Auth rechaza una contraseña de 7 caracteres y una de 8 caracteres sin símbolo/mayúscula/dígito. _(Humo manual pendiente.)_
- [ ] Supabase Auth rechaza la contraseña `Password1!` si figura en HaveIBeenPwned (prueba de humo del leaked password protection). _(Depende del toggle de leaked password protection.)_
- [ ] `curl -sI http://localhost:3000/` incluye `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` y `Referrer-Policy: strict-origin-when-cross-origin`. _(Humo manual tras `npm run dev`.)_
- [ ] Intentar superar el rate limit de signup desde una IP (11 intentos en una hora) devuelve `429` desde Supabase. _(Humo manual pendiente.)_
- [x] `refereences/references/security-checklist.md` tiene marcados los cinco bullets de la sección «Checklist de seguridad básico» y una sección «Aplicado» con fecha 2026-10-15.

---

## Decisiones

- **Sí:** mantener `SECURITY DEFINER` en `handle_new_user` y aislarlo con `REVOKE EXECUTE` + `search_path`. El trigger necesita elevación para insertar en `profiles`; cambiar a `SECURITY INVOKER` rompería SPEC 14.
- **No:** mover ambas funciones a un schema privado (`private`). Es más limpio pero obliga a recrear el trigger `on_auth_user_created` apuntando al nuevo schema, con riesgo de regresión. `REVOKE` + `search_path` resuelve el advisor con menor riesgo.
- **No:** eliminar `rls_auto_enable`. Puede ser útil operativamente; con `REVOKE` deja de estar expuesta vía PostgREST.
- **Sí:** política de contraseña estricta (minúsculas + mayúsculas + dígitos + símbolos). El checklist solo pide 8 caracteres y leaked protection, pero el usuario optó por el set completo.
- **Sí:** rate limit vía dashboard de Supabase. Suficiente para el MVP, cero código, reversible desde el panel.
- **No:** añadir CAPTCHA al registro. Introduce dependencia y UI nueva; va en spec aparte si el abuso aparece.
- **Sí:** solo los tres headers del checklist en `next.config.ts`. Permissions-Policy, HSTS y CSP quedan fuera por evitar romper Supabase/Resend y por tener su propio proceso de auditoría.
- **Sí:** declarar los headers en `next.config.ts` y no en `proxy.ts`. Los headers son estáticos para toda ruta; mezclar con la lógica Supabase del proxy complica el archivo.
- **Sí:** documentar los cambios de dashboard como pasos manuales con checkboxes verificables. El MCP de Supabase no cubre esos settings y el Management API queda fuera del alcance habitual.
- **No:** auditar `leaderboard` y `game_stats` como vistas con `security_invoker`. Son `SELECT` públicos sin datos sensibles; va en otra spec si fuese necesario.

---

## Riesgos

| Riesgo                                                                                              | Mitigación                                                                                                                                              |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `REVOKE` en `handle_new_user` rompe el trigger `on_auth_user_created`.                              | El trigger ejecuta la función como su `owner`; `REVOKE` sobre `anon/authenticated` no afecta a ese contexto. Verificado en paso 2 (registro de prueba). |
| Política de contraseña demasiado estricta corta registros reales.                                   | El criterio de aceptación verifica un rechazo y una aceptación concretos. Si bloquea de más, el valor es reversible en segundos desde el dashboard.     |
| Headers rompen un embed/iframe futuro (`X-Frame-Options: DENY`).                                    | Hoy no hay embeds planeados. Si en el futuro se necesita, se cambia a `SAMEORIGIN` o se migra a CSP `frame-ancestors`.                                  |
| Un rate limit demasiado bajo impide tests de QA desde la misma IP.                                  | Los valores (10/h signup, 30/h signin) son holgados para QA manual. Si molestan, se suben desde el dashboard sin redeploy.                              |
| Cambio de `search_path` en una función invocada por el trigger de auth podría afectar su ejecución. | Se usa `public, pg_temp`, que es el valor habitual recomendado por Supabase para funciones `SECURITY DEFINER`. Smoke test en paso 2.                    |

---

## Lo que **no** entra en esta spec

- Content-Security-Policy con allowlist de scripts, estilos y conexiones.
- `Permissions-Policy` y `Strict-Transport-Security`.
- CAPTCHA en registro o reset de contraseña.
- Logs de auditoría, detección de abuso automatizada o alertas.
- Rotación de la `anon key` y revisión de llaves públicas.
- Internacionalización o personalización de los emails de Supabase Auth.
- Políticas de retención de datos y borrado de cuentas.

Cada uno de esos, si aterriza, va en su propia spec.
