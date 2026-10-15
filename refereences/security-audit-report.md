# security-auditor — reporte

Memoria acumulativa del agente de auditoría. **Solo lectura sobre el sistema**: aquí no se registran fixes, solo hallazgos y recomendaciones para el humano. Una entrada por pase. Última entrada arriba.

## 2026-10-15

**Resumen:** 0 CRÍTICO, 0 ALTO, 2 MEDIO, 1 BAJO. Primer pase del agente — no hay hallazgos previos para comparar.

**Advisors Supabase (security):**

- `auth_leaked_password_protection` — WARN — entidad Auth (HaveIBeenPwned check desactivado en el dashboard).

**Advisors Supabase (performance):**

- `auth_rls_initplan` — WARN — `public.profiles` (policy «users can update their own profile») y `public.scores` (policy «authenticated users insert their own scores»). `auth.uid()` re-evaluado por fila.
- `unused_index` — INFO — `scores_user_id_idx` nunca usado (índice creado por SPEC 14).

**Estado de los 12 checks:**

- [1] Advisors security — ❌ (1 WARN pendiente: `auth_leaked_password_protection`).
- [2] Advisors performance — ❌ (2 WARN, 1 INFO).
- [3] RLS por tabla pública — ✅ (`games`, `profiles`, `scores` con `relrowsecurity=true`). Vistas `game_stats` y `leaderboard` son views (no aplica RLS directa; `security_invoker` por defecto conforme a SPEC 15).
- [4] Policies `scores` — ✅ INSERT con `with_check = ((auth.uid() = user_id) AND (user_id IS NOT NULL))`; SELECT público `{anon,authenticated}`; sin UPDATE/DELETE.
- [5] Policies `profiles` — ✅ SELECT público `{public}`; UPDATE con `auth.uid() = user_id`; INSERT lo cubre el trigger `on_auth_user_created` (SECURITY DEFINER), sin policy pública (correcto según SPEC 14).
- [6] Policies `games` — ✅ Solo `games_select_public` SELECT con `qual=true` para `{anon,authenticated}`.
- [7] SECURITY DEFINER expuestas — ✅ `public.handle_new_user()` tiene `proacl = {postgres, service_role, supabase_auth_admin}` (anon/authenticated revocados) y `search_path=public, pg_temp`. `public.rls_auto_enable()` idem con `{postgres, service_role}`. Hardening de SPEC 15 aplicado y advisors cleared.
- [8] Headers `next.config.ts` — ✅ Los tres headers del checklist (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`) sobre `/(.*)`.
- [9] Protección de rutas — ✅ Next.js 16 renombró `middleware.ts` a `proxy.ts`: existe `proxy.ts` en la raíz delegando a `lib/supabase/middleware.ts::updateSession`, que protege `/update-password` (redirige a `/login?redirectTo=…`) y manda a `/` a los usuarios con sesión que visitan `/login` o `/register`. Matcher excluye estáticos.
- [10] `.env` fuera de git — ✅ `git ls-files .env` vacío; `.gitignore` incluye `.env*` con whitelist `!.env.template`.
- [11] `service_role` en cliente — ✅ `grep -r "service_role|SERVICE_ROLE"` en `**/*.{ts,tsx,js,jsx}` sin resultados (solo aparece como comentario documental en `.env.template`: «Nunca pongas aquí la clave service_role»).
- [12] `.env.template` sincronizado — ✅ Variables consumidas en código (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `lib/supabase/env.ts`; `NEXT_PUBLIC_SITE_URL` en `lib/auth/actions.ts`; `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` en `app/about/actions.ts`) todas presentes. También incluye `SUPABASE_DB_PASSWORD` (uso operativo, no leído por código).

### Hallazgos

#### H-1 — [MEDIO] Leaked password protection sigue desactivado

- **Bloque:** advisors / Supabase Auth (dashboard).
- **Evidencia:** `mcp__supabase__get_advisors({type:"security"})` devuelve `auth_leaked_password_protection` WARN con detalle «Leaked password protection is currently disabled». SPEC 15 lo marca como pendiente al cerrar («el advisor seguía activo»).
- **Impacto:** usuarios pueden registrar contraseñas filtradas en brechas públicas (HaveIBeenPwned). Reduce resistencia al credential stuffing. No es una vulnerabilidad explotable directa, pero debilita la postura de auth.
- **Recomendación:** acción manual en el dashboard de Supabase (fuera del alcance del MCP y del agente). Auth → Policies → _Leaked password protection_ → ON. Re-ejecutar advisors para confirmar que desaparece.
- **Procedencia:** nuevo (primer pase).

#### H-2 — [MEDIO] Policies RLS re-evalúan `auth.uid()` por fila

- **Bloque:** performance / RLS policies.
- **Evidencia:**
  ```
  pg_policies:
  profiles."users can update their own profile" → qual: (auth.uid() = user_id)
  scores."authenticated users insert their own scores" → with_check: ((auth.uid() = user_id) AND (user_id IS NOT NULL))
  ```
  Advisor `auth_rls_initplan` WARN para ambas.
- **Impacto:** rendimiento subóptimo a escala; cada fila evaluada re-llama `auth.uid()`. En INSERT uno-a-uno es irrelevante, pero bulk-selects filtrados por `profiles` lo notarían. Documental; no es vulnerabilidad.
- **Recomendación (no ejecutar):**
  ```sql
  drop policy "users can update their own profile" on public.profiles;
  create policy "users can update their own profile"
    on public.profiles for update
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

  drop policy "authenticated users insert their own scores" on public.scores;
  create policy "authenticated users insert their own scores"
    on public.scores for insert
    with check (((select auth.uid()) = user_id) and user_id is not null);
  ```
- **Procedencia:** nuevo.

#### H-3 — [BAJO] Índice `scores_user_id_idx` sin uso registrado

- **Bloque:** performance / housekeeping.
- **Evidencia:** advisor `unused_index` INFO sobre `scores_user_id_idx`.
- **Impacto:** nulo en seguridad; coste mínimo en escrituras y almacenamiento. Normal: el índice se creó en SPEC 14 y aún no hay queries filtradas por `user_id` ejecutadas en producción.
- **Recomendación:** mantener de momento. Es un índice legítimo para joins futuros (`leaderboard`, página `/perfil` pendiente). Si en 30 días sigue sin uso y SPEC de `/perfil` no entra, considerar `drop index public.scores_user_id_idx;`.
- **Procedencia:** nuevo.

### Hallazgos resueltos desde el pase anterior

N/A — primer pase.

### Pendientes humanos (dashboard Supabase o acción fuera del agente)

- **Leaked password protection** — toggle ON en Auth → Policies (H-1).
- **Rate limits de Auth** — confirmar en dashboard que los valores de SPEC 15 (`Sign up = 10/h/IP`, `Sign in with password = 30/h/IP`, `Password recovery = 5/h/IP`) están efectivamente aplicados. El agente no puede verificarlos vía MCP.
- **Política de complejidad de contraseñas** — SPEC 15 pide `Lowercase + Uppercase + Digits + Symbols`; confirmar en el dashboard.
- **Humo manual** de criterios de aceptación SPEC 15 todavía marcados como pendientes (signup con password débil → 400; 11 signups/h → 429; `curl -sI` muestra los 3 headers; `supabase.rpc('handle_new_user')` desde navegador → `permission denied`).

### Decisiones del auditor

- `middleware.ts` no existe en la raíz pero sí `proxy.ts` que delega a `lib/supabase/middleware.ts`. Next.js 16 renombró el convenio; se trata como equivalente funcional. No se marca hallazgo (SPEC 15 explícitamente contempla «Protección de rutas con Proxy Next.js» y el patrón de proxy.ts).
- Las vistas `game_stats` y `leaderboard` no tienen RLS directa. SPEC 15 declara fuera de alcance auditarlas (`security_invoker` por defecto, solo lectura, sin datos sensibles). Se respeta la decisión; no se marca hallazgo.
- La policy `profiles.UPDATE` tiene `roles = {public}` en lugar de `{authenticated}`. Es inofensivo porque la cláusula `auth.uid() = user_id` filtra la identidad (anon tiene `auth.uid()=null` → nunca igual a `user_id`). No se marca hallazgo (buena práctica, no fallo).
- CSP, HSTS, Permissions-Policy, CAPTCHA, logs de auditoría y rotación de la `anon key` quedan fuera de alcance SPEC 15 por decisión explícita de la spec. No se mencionan como hallazgos.
- Advisor `auth_leaked_password_protection` ya documentado como pendiente en SPEC 15 y en el checklist; se mantiene como hallazgo activo porque el advisor sigue devolviéndose.

---
