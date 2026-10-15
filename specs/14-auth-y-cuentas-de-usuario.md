# SPEC 14 — Autenticación y cuentas de usuario

**Estado:** Implementado
**Depende de:** SPEC 04 (`specs/04-integracion-supabase.md`) por el cliente Supabase y las variables de entorno; SPEC 06 (`specs/06-leaderboard-y-tabla-games.md`) por la tabla `scores` y el leaderboard
**Fecha:** 2026-10-15
**Objetivo:** Reemplazar el `av_user` de `localStorage` por una autenticación real con Supabase Auth (email + password con verificación obligatoria, más OAuth de Google y GitHub) y vincular cada score nuevo al usuario autenticado.

---

## Por qué existe esta spec

Hoy la "sesión" del jugador vive en `localStorage["av_user"]` (`lib/session.tsx`) y es un string arbitrario que cualquiera puede falsificar desde DevTools. La tabla `scores` admite INSERT anónimo con `player_name` libre, de modo que el leaderboard no tiene ninguna garantía de identidad. CLAUDE.md ya documenta el hueco: _"saving a score inserts into `scores` but does not write `av_user` [...]. It affects all five games and needs its own spec"_.

Esta spec cierra ese hueco: añade cuentas reales con Supabase Auth, perfil propio (`display_name`), un flujo de registro/login/reset con verificación de email, y endurece la política RLS de `scores` para que todo registro nuevo exija un usuario autenticado. No toca la mecánica de ningún juego ni cambia el contrato motor ↔ plataforma. Mantiene explícitamente los scores anónimos previos visibles en el leaderboard (son datos históricos del MVP).

---

## Alcance

**Dentro:**

- **Supabase Auth con email + password** usando `@supabase/ssr`. Verificación de email obligatoria antes del primer login. Se confía en los rate-limits por defecto de Supabase para `signUp`/`signIn`/`resetPassword`.
- **OAuth con Google y GitHub** (ya configurados en el dashboard de Supabase). Botones en `/login` y `/register` que llaman a `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: ${SITE_URL}/auth/callback?next=<returnTo> } })`. Nueva ruta `app/auth/callback/route.ts` que intercambia el `code` por sesión (`supabase.auth.exchangeCodeForSession`) y redirige a `next` (whitelist a rutas internas). Los usuarios OAuth no pasan por verificación de email (Supabase marca su email como verificado). El `display_name` se asigna en el trigger con `coalesce(raw_user_meta_data->>'display_name', raw_user_meta_data->>'user_name', raw_user_meta_data->>'name', 'JUGADOR-<n>')` para cubrir el formato de GitHub (`user_name`) y Google (`name`); si el valor derivado choca con la unicidad o la regex, el trigger lo normaliza (slugify a `[A-Za-z0-9_-]`) y le añade un sufijo numérico corto.
- **Tabla `profiles`** nueva con `user_id uuid PK` ref `auth.users(id)` on delete cascade, `display_name text unique not null` (3–20 chars, regex), `created_at timestamptz default now()`. RLS: todos pueden `SELECT`; solo el propio usuario puede `UPDATE display_name`. INSERT lo hace un trigger `on_auth_user_created` que lee el `display_name` desde `raw_user_meta_data`.
- **Columna `scores.user_id uuid NULL`** ref `auth.users(id)` on delete set null. Política RLS reemplazada: INSERT solo si `auth.uid() = user_id AND user_id IS NOT NULL`. `UPDATE`/`DELETE` siguen prohibidos. `SELECT` sigue público. Los scores históricos conservan `user_id NULL` y su `player_name` original.
- **Vista `leaderboard`** reescrita para hacer `LEFT JOIN profiles` y exponer `display_name` cuando el score tiene `user_id`, y seguir mostrando `player_name` cuando no. `game_stats` no cambia.
- **Rutas nuevas**: `/register`, `/reset-password`, `/update-password`. Rediseño de la `/login` actual (de MVP visual) a formulario funcional. Enlaces cruzados entre las tres primeras.
- **Middleware** (`middleware.ts` en la raíz) que llama a `supabase.auth.getUser()` para refrescar cookies en cada request y propagar la sesión a Server Components.
- **Cliente Supabase SSR**: `lib/supabase/server.ts` ya usa `@supabase/ssr`; se añade `lib/supabase/middleware.ts` con la variante para el middleware. `lib/supabase/client.ts` sigue siendo el cliente browser.
- **`lib/auth/actions.ts`** nuevo con Server Actions `signUp`, `signIn`, `signOut`, `requestPasswordReset`, `updatePassword`. Validación por Zod (o helper equivalente ya usado en `lib/contact.ts`), errores devueltos como `{ ok: false, error: string }` renderizados en el form.
- **`lib/auth/user.ts`** nuevo con `getCurrentUser()` (Server, lee `supabase.auth.getUser()` + join a `profiles`) y hook `useUser()` (Client, suscripción a `supabase.auth.onAuthStateChange`).
- **Navbar**: muestra `display_name` + botón "Cerrar sesión" si hay sesión; "Entrar" / "Registrarse" si no.
- **`GamePlayer` (`components/game-player.tsx`)**: antes de llamar a `submitScore`, si no hay sesión muestra un paso extra en el modal de game over con CTA a `/login?returnTo=/games/<id>/jugar`. Si hay sesión, el score se envía con `user_id = user.id` y sin `player_name` (o `player_name = display_name` por redundancia, ver decisiones). No se cambia nada más del HUD ni del contrato de motor.
- **Deprecación de `lib/session.tsx`**: se elimina el `SessionProvider` del árbol y el import de `av_user`. En el primer arranque autenticado, un efecto hace `localStorage.removeItem("av_user")`. Si queda código llamando a `useSession()`, se migra a `useUser()`.
- **Variable de entorno nueva**: `NEXT_PUBLIC_SITE_URL` (p. ej. `http://localhost:3000` en dev) para construir los `emailRedirectTo` de confirmación y reset. Documentada en `.env.template`.
- **Emails de Supabase**: se mantienen los templates por defecto; se configura el `Site URL` y las `Redirect URLs` en el dashboard. No se usa Resend para auth (sigue siendo solo para el contacto público).

**Fuera (otra spec):**

- Magic links (login por enlace sin password).
- Otros proveedores OAuth (Twitter/X, Discord, Apple, etc.).
- Página `/perfil` para ver/editar `display_name`, cambiar email, borrar cuenta.
- Reenvío manual del email de verificación desde la UI.
- CAPTCHA (hCaptcha/Turnstile) en registro/reset.
- Migrar los scores anónimos históricos a cuentas (asociarlos por `player_name`): queda explícitamente descartado.
- Políticas de contraseña más allá del mínimo de Supabase (8 chars).
- Internacionalización de los emails de Supabase.
- Rotación de `display_name` con historial.
- Tests automatizados (sigue sin test runner en el repo).

---

## Modelo de datos

Dos cambios de esquema aplicados vía `apply_migration`:

**Migración `add_profiles_table`**

```sql
create table public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text not null unique,
  created_at   timestamptz not null default now(),
  constraint display_name_shape check (
    char_length(display_name) between 3 and 20
    and display_name ~ '^[A-Za-z0-9_-]+$'
  )
);

alter table public.profiles enable row level security;

create policy "profiles are readable by anyone"
  on public.profiles for select
  using (true);

create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_name text;
  candidate text;
  suffix    int := 0;
begin
  -- Prioridad: display_name explícito (email+password) > user_name (GitHub) > name (Google) > fallback.
  base_name := coalesce(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'name',
    'JUGADOR'
  );
  -- Normalizar al alfabeto permitido y recortar a 20 chars.
  base_name := substring(regexp_replace(base_name, '[^A-Za-z0-9_-]', '_', 'g') from 1 for 20);
  if char_length(base_name) < 3 then
    base_name := 'JUGADOR';
  end if;
  candidate := base_name;
  while exists (select 1 from public.profiles where display_name = candidate) loop
    suffix := suffix + 1;
    candidate := substring(base_name from 1 for 20 - char_length(suffix::text) - 1) || '-' || suffix::text;
  end loop;
  insert into public.profiles (user_id, display_name) values (new.id, candidate);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

**Migración `link_scores_to_users`**

```sql
alter table public.scores
  add column user_id uuid references auth.users(id) on delete set null;

create index scores_user_id_idx on public.scores(user_id);

drop policy if exists "anyone can insert scores" on public.scores;

create policy "authenticated users insert their own scores"
  on public.scores for insert
  with check (auth.uid() = user_id and user_id is not null);

-- Vista leaderboard reescrita (ver sección 'Implementación', paso 2).
```

Tras ambas migraciones: regenerar `lib/supabase/database.types.ts` con `generate_typescript_types` y actualizar `lib/types.ts` solo si cambian los tipos consumidos (`PlayerBest`, `ScoreRow`).

Resumen de los tipos nuevos en TS (declarados en `lib/types.ts`):

```ts
export interface Profile {
  user_id: string;
  display_name: string;
  created_at: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  profile: Profile;
}
```

---

## Plan de implementación

Cada paso deja la rama compilable (`npm run build`) y el resto del catálogo intacto.

1. **Dependencias y entorno.** Confirmar que `@supabase/ssr` ya está instalado (lo usa `lib/supabase/server.ts`). Añadir `NEXT_PUBLIC_SITE_URL` a `.env.template` y al `.env` local. Verificar en el dashboard de Supabase: `Site URL = http://localhost:3000`, redirect URLs `http://localhost:3000/**` (debe incluir `/auth/callback`), "Email confirmations" activo, y los proveedores Google y GitHub habilitados con sus Client ID/Secret (ya configurados por el usuario; esta spec no vuelve a tocar sus claves).
2. **Migraciones (DB).** Aplicar `add_profiles_table` y `link_scores_to_users` con `apply_migration`. Reescribir la vista `leaderboard` para que el `name` surja de `coalesce(p.display_name, s.player_name, 'JUGADOR')` sin cambiar su columna de salida. Regenerar `lib/supabase/database.types.ts`.
3. **Middleware SSR.** Crear `lib/supabase/middleware.ts` (helper `updateSession`) y `middleware.ts` en la raíz con el matcher recomendado (`/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)`). Verificar que `/` sigue cargando como invitado.
4. **Server/Client helpers de usuario.** Crear `lib/auth/user.ts` con `getCurrentUser()` server-side (lee `auth.getUser()` + `profiles` por `user_id`) y un hook cliente `useUser()` basado en `onAuthStateChange`. Smoke: imprimir `null` en consola desde un Server Component invitado.
5. **Server Actions de auth.** Crear `lib/auth/actions.ts` con `signUp({ email, password, displayName })`, `signIn({ email, password })`, `signOut()`, `requestPasswordReset({ email })`, `updatePassword({ password })`, `signInWithProvider({ provider: 'google' | 'github', returnTo? })` (envuelve `signInWithOAuth` del cliente — en la práctica el click vive en el componente cliente del botón, pero la Server Action valida el `returnTo` y arma la URL `redirectTo`). Validar email, password (≥8), y `displayName` (regex `/^[A-Za-z0-9_-]{3,20}$/`). Devolver `{ ok, error? }`.
   5b. **Ruta de callback OAuth.** Crear `app/auth/callback/route.ts` (Route Handler GET) que lea `?code` + `?next`, llame a `supabase.auth.exchangeCodeForSession(code)` y redirija a `next` (whitelist a rutas internas; en error vuelve a `/login?error=oauth`).
6. **Pantalla `/register`.** Crear `app/register/page.tsx` con form (email, password, displayName) **y** dos botones "Continuar con Google" / "Continuar con GitHub" sobre el divisor "— o —". Al enviar el form, llama a `signUp` con `options.data.display_name` y `emailRedirectTo = ${SITE_URL}/login?verified=1`. Mensaje de éxito: "Revisa tu correo para confirmar la cuenta". Enlaces a `/login` y `/reset-password`.
7. **Pantalla `/login` rediseñada.** Reescribir `app/login/page.tsx`: form email+password **y** los mismos dos botones OAuth, lectura opcional de `?returnTo` para redirigir post-login (whitelist a rutas internas; se propaga a `redirectTo` de OAuth como `?next=`), enlaces a `/register` y `/reset-password`. Mostrar aviso si `?verified=1`. Mensajes específicos si Supabase devuelve "Email not confirmed" o si llega `?error=oauth`.
8. **Pantallas `/reset-password` y `/update-password`.** `/reset-password`: form con email → `requestPasswordReset`. `/update-password`: solo accesible con sesión temporal del link de recuperación; form con password nuevo → `updatePassword` y redirect a `/`.
9. **Navbar con sesión.** Modificar la navbar existente para leer `getCurrentUser()` en Server Component y mostrar `<DISPLAY_NAME> · Cerrar sesión` (form con `signOut`) o los dos CTAs `Entrar / Registrarse`. Mantener el estilo arcade.
10. **`GamePlayer` + submit de scores.** En `components/game-player.tsx`, al abrir el modal de game over: si `useUser()` devuelve `null`, mostrar en lugar del botón "Guardar score" el CTA `Entrar para guardar` que enlaza a `/login?returnTo=<ruta-actual>`. Si hay usuario, `submitScore` incluye `user_id = user.id` y `player_name = user.profile.display_name` (redundante pero deja los datos autoconsistentes incluso si alguna vista los lee).
11. **Deprecar `lib/session.tsx`.** Reemplazar todas las referencias a `useSession()` por `useUser()`. Eliminar `<SessionProvider>` del árbol (`app/layout.tsx`). Añadir, en el provider raíz nuevo o en un efecto único, `localStorage.removeItem("av_user")`. Borrar el archivo `lib/session.tsx` y la constante `USER_KEY`. Actualizar `lib/types.ts` si `SessionUser` ya no se usa.
12. **Verificación end-to-end manual con Playwright.** Flujos: (a) registro email+password → aparece mensaje de confirmación, email llega, al confirmar redirige a `/login?verified=1`; (b) login correcto email+password → navbar muestra display_name; (c) login con Google → tras el round-trip aparece el usuario con `display_name` derivado del `name` de Google; (d) login con GitHub → aparece con `display_name` derivado del `user_name`; (e) jugar y guardar score → aparece en `/salon` y `/games/[id]`; (f) intento de guardar score sin sesión → modal con CTA a login y `returnTo`; (g) reset password completo; (h) logout → navbar vuelve a CTAs de invitado. Capturas en `.playwright-screenshots/spec14-auth-*.png`.

---

## Criterios de aceptación

- [ ] En Supabase existen la tabla `profiles` con sus 3 políticas RLS y el trigger `on_auth_user_created`, y `scores` tiene `user_id` nullable con la nueva política que exige `auth.uid() = user_id`.
- [ ] Entrar con Google y con GitHub desde `/login` abre el flujo OAuth, vuelve por `/auth/callback` y deja al usuario autenticado con un `display_name` legible (derivado de `name`/`user_name` o normalizado + sufijo numérico si choca con la unicidad).
- [ ] Los botones OAuth están presentes en `/login` y `/register`, y respetan `?returnTo` propagándolo como `?next=` por el callback.
- [ ] Un intento de `insert` en `scores` sin sesión devuelve error RLS; con sesión y `user_id` propio inserta.
- [ ] La vista `leaderboard` muestra `display_name` para scores con `user_id` y `player_name` para los históricos sin `user_id`.
- [ ] `/register` valida: email con formato, password ≥8, `display_name` entre 3 y 20 chars `[A-Za-z0-9_-]`. Un `display_name` duplicado devuelve error visible en el form.
- [ ] Tras `signUp`, el usuario no puede entrar hasta clicar el enlace del email; `/login` muestra el error "Email not confirmed" con mensaje legible si lo intenta.
- [ ] `/login` con `?returnTo=/games/snake/jugar` redirige a esa ruta tras entrar, y rechaza `returnTo` que apunte fuera del sitio.
- [ ] `/reset-password` manda el email y `/update-password` cambia la contraseña y redirige a `/`.
- [ ] Con sesión activa, la navbar muestra el `display_name` y un botón `Cerrar sesión` que termina la sesión y vuelve el estado a invitado.
- [ ] Jugar sin sesión funciona (se puede llegar a game over), pero el modal muestra `Entrar para guardar` en lugar del submit; con sesión, el score se guarda y aparece en `/salon`.
- [ ] `localStorage["av_user"]` ya no se crea ni se lee; `lib/session.tsx` ha sido eliminado y nada en el repo importa `useSession`.
- [ ] `middleware.ts` existe y las cookies de sesión se refrescan: cerrar y volver a abrir pestaña mantiene al usuario autenticado.
- [ ] `npm run lint` y `npm run build` pasan sin warnings nuevos de TypeScript ni ESLint.
- [ ] Capturas Playwright de los 6 flujos manuales están en `.playwright-screenshots/spec14-auth-*.png`.

---

## Decisiones tomadas y descartadas

- **Sí:** Supabase Auth con email + password. Ya hay cliente integrado, no suma dependencias y resuelve registro/login/reset/verify con una sola librería.
- **Sí:** OAuth con Google y GitHub en esta spec. El usuario ya configuró ambos proveedores en el dashboard de Supabase, así que el coste real es solo UI + ruta de callback + lógica de `display_name` tolerante al formato de cada proveedor. Entra ahora en lugar de aplazarse.
- **No:** otros proveedores OAuth (Twitter/X, Discord, Apple…) y magic links. Cada proveedor nuevo requiere claves y testing propios; magic links además es un flujo paralelo con su propia UX. Van en otra spec si se piden.
- **Sí:** jugar es libre, solo guardar score exige login. Preserva la experiencia arcade actual y no obliga al visitante casual a crear cuenta.
- **No:** login obligatorio para entrar al sitio o para `/games/[id]/jugar`. Fricción desproporcionada para el valor que aporta hoy.
- **Sí:** email verification obligatorio desde el primer login. Estándar y evita cuentas basura con Supabase ya configurado para enviar emails.
- **Sí:** tabla `profiles` separada en lugar de `user_metadata`. Permite JOIN limpio desde `scores`/`leaderboard`, unicidad real de `display_name` y RLS granular.
- **Sí:** `scores.user_id` nullable y scores anónimos previos se conservan como están. Cero riesgo de perder histórico; el leaderboard sigue mostrándolos con `player_name`.
- **No:** asociar scores históricos a cuentas nuevas por coincidencia de `player_name`. Spoofable; no vale la pena el riesgo de reclamos cruzados.
- **No:** borrar los scores anónimos. Opción destructiva sin motivo.
- **Sí:** `GamePlayer` sigue escribiendo `player_name = display_name` junto a `user_id` al guardar. Redundante pero deja el registro autoconsistente y facilita queries sin JOIN. En invitado no se guarda nada.
- **Sí:** `@supabase/ssr` con cookies + middleware. Patrón oficial en Next.js 16 App Router; sin él, Server Components no verían la sesión y la navbar SSR quedaría inconsistente.
- **No:** auth propia con JWT y tabla `users` a mano. Mucho más trabajo y superficie de ataque; el valor es nulo cuando ya pagamos Supabase.
- **Sí:** rate-limit de Supabase por defecto. Suficiente para MVP; CAPTCHA entra como refuerzo si vemos abuso real.
- **No:** página `/perfil` para editar `display_name`, cambiar email o borrar cuenta. Alcance extra; su propia spec.
- **Sí:** eliminar `lib/session.tsx` y limpiar `av_user`. Una sola fuente de verdad evita bugs sutiles en los que la UI muestra un nombre distinto al que viaja al servidor.

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                              | Mitigación                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El trigger `on_auth_user_created` falla (p. ej. `display_name` duplicado por carrera entre dos registros simultáneos con el mismo nombre) y deja un usuario en `auth.users` sin fila en `profiles`. | El trigger valida unicidad; si falla, el `signUp` devuelve error y el usuario queda sin confirmar. En paso 5 se añade un `try/catch` que al detectar `profiles` ausente para un usuario autenticado hace `signOut` y muestra "Reintenta el registro". |
| Config incorrecta de `Site URL` / `Redirect URLs` en Supabase hace que el link del email apunte a `localhost` desde producción (o viceversa).                                                       | `NEXT_PUBLIC_SITE_URL` se pasa explícito en cada `emailRedirectTo`. Documentar en `.env.template` que debe coincidir con el dashboard.                                                                                                                |
| `supabase.auth.getUser()` en cada request del middleware añade latencia perceptible.                                                                                                                | Es el patrón oficial; coste < 50 ms con caché HTTP. Si se nota, mover el matcher a excluir rutas estáticas (ya se hace).                                                                                                                              |
| Un `returnTo` malicioso tras login abre un open redirect.                                                                                                                                           | Whitelist: solo rutas internas que empiezan por `/` y no por `//` ni por `http`.                                                                                                                                                                      |
| Emails de Supabase caen en spam.                                                                                                                                                                    | Documentar en el README/CLAUDE.md que si falla la entrega, hay que configurar SMTP propio (Resend) en el dashboard; no bloquea esta spec.                                                                                                             |
| Un `display_name` derivado del proveedor OAuth entra en conflicto con otro existente o contiene chars prohibidos.                                                                                   | El trigger `handle_new_user` normaliza (regex a `[A-Za-z0-9_-]`) y añade sufijo `-N` incremental hasta encontrar un valor único. El usuario podrá cambiarlo cuando llegue la spec de `/perfil`.                                                       |
| El `code` del callback OAuth se usa dos veces (recarga de la pestaña, back del navegador).                                                                                                          | `exchangeCodeForSession` falla la segunda vez; el handler captura el error y redirige a `/login?error=oauth`, dejando al usuario reintentar sin estado corrupto.                                                                                      |
| Partidas en curso al cerrar sesión intentan guardar score con token expirado.                                                                                                                       | `submitScore` relee `useUser()` justo antes de insertar; si volvió a `null`, cae al mismo CTA de "Entrar para guardar".                                                                                                                               |

---

## Lo que **no** está en esta spec

- Magic links y proveedores OAuth distintos de Google/GitHub.
- Página `/perfil`, cambio de email, borrado de cuenta.
- Reenvío manual del email de verificación.
- CAPTCHA en formularios.
- Migración de scores anónimos a cuentas.
- Políticas de contraseña avanzadas (longitud > 8, complejidad, rotación).
- Internacionalización de los emails de Supabase.
- Tests automatizados.

Cada una, si entra, va en su propia spec.
