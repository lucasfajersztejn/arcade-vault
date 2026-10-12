# SPEC 04 — Integración base de Supabase en Next.js

**Estado:** Implementado
**Depende de:** SPEC 03 (`specs/03-about-y-contacto-resend.md`, Implementado) por `.env.template` y la convención de variables de entorno
**Fecha:** 2026-10-12
**Objetivo:** Dejar Supabase integrado en la app Next.js (dependencias, variables de entorno, clientes de servidor y navegador con `@supabase/ssr`, y tipos de base de datos generados), sin migrar ningún dato ni funcionalidad existente.

---

## Por qué existe esta spec

Auth, Salón de la Fama persistente, catálogo en BD, Realtime y Edge Functions necesitan la misma base. Esta spec la prepara una sola vez para que cada una de esas funcionalidades sea una spec pequeña e independiente que solo añada lo suyo.

---

## Alcance

### Dentro

- Dependencias `@supabase/supabase-js` y `@supabase/ssr`.
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (clave **publishable** `sb_publishable_...`), documentadas en `.env.template` y definidas en `.env` (ignorado).
- Cliente de **servidor** (`lib/supabase/server.ts`) para Server Components, Server Actions y Route Handlers, con cookies de `next/headers`.
- Cliente de **navegador** (`lib/supabase/client.ts`) para componentes cliente (base para Realtime y auth futuros).
- **Tipos de la base de datos** generados con el MCP de Supabase (`generate_typescript_types`) en `lib/supabase/database.types.ts`; ambos clientes tipados con `Database`.
- Función auxiliar que lee y valida las variables de entorno y falla con un mensaje claro si faltan.
- **Verificación temporal** de conexión end-to-end (se elimina al terminar, ver plan).
- Revisión de la documentación local de Next 16.4 antes de escribir código (regla de CLAUDE.md).

### Fuera (explícito)

- **Autenticación** (Supabase Auth, reemplazo de `av_user`, login/registro, OAuth): spec propia.
- **`proxy.ts`** (antes middleware) para refrescar la sesión: llega con la spec de auth, cuando haya sesión que refrescar.
- **Tablas, políticas RLS y migraciones**: la BD está vacía y sigue vacía. Cada spec futura añade las suyas.
- **Puntuaciones / Salón de la Fama en BD** y migración de `av_scores`; datos mock de `lib/data.ts`: se quedan como están.
- **Catálogo de juegos en BD.**
- **Realtime** y **Edge Functions**: specs propias futuras.
- Configurar la Supabase CLI o una carpeta `supabase/` con migraciones locales.
- Clave `service_role` o cualquier clave secreta en la app.
- Ruta de diagnóstico permanente (`/api/health`).
- Tests automatizados (sigue sin runner).
- Cambios en UI, rutas, sesión (`av_user`) o puntuaciones (`av_scores`). **No se toca ninguna UI**, por lo que no aplican `/frontend-design` ni `/ui-ux-pro-max`.

---

## Modelo de datos

No introduce tablas ni datos de aplicación. Solo estructuras de configuración y tipos:

```bash
# .env (ignorado) — mismas claves, vacías, en .env.template
NEXT_PUBLIC_SUPABASE_URL=                  # https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=      # sb_publishable_...
```

```ts
// lib/supabase/database.types.ts — generado, NO se edita a mano
export type Database = {
  public: { Tables: {}; Views: {}; Functions: {} /* ... */ }; /* ... */
};
```

```ts
// Firmas públicas
// lib/supabase/server.ts
export async function createClient(): Promise<SupabaseClient<Database>>;
// lib/supabase/client.ts
export function createClient(): SupabaseClient<Database>;
```

Las claves `NEXT_PUBLIC_*` son públicas por diseño: la publishable key solo es segura con RLS activada en cada tabla futura (condición obligatoria en las specs siguientes). `SUPABASE_DB_PASSWORD` ya existe en `.env.template` y no se usa en esta spec.

---

## Archivos a crear / modificar

| Archivo                              | Acción                                                                                                                |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `package.json` / `package-lock.json` | añadir `@supabase/supabase-js` y `@supabase/ssr` (únicas dependencias nuevas)                                         |
| `lib/supabase/env.ts`                | crear: lee `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; lanza un error claro si faltan        |
| `lib/supabase/server.ts`             | crear: `createClient()` con `createServerClient` de `@supabase/ssr` y cookies de `next/headers`                       |
| `lib/supabase/client.ts`             | crear: `createClient()` con `createBrowserClient` de `@supabase/ssr`                                                  |
| `lib/supabase/database.types.ts`     | crear: tipos generados con el MCP de Supabase                                                                         |
| `.env.template`                      | modificar: añadir las 2 claves con comentario (la de contraseña de BD ya está)                                        |
| `.env`                               | modificar (local, ignorado): rellenar URL y publishable key del proyecto                                              |
| `README.md`                          | modificar: nota breve en español sobre las variables de Supabase, solo si el README ya documenta variables de entorno |

Archivos temporales (se crean y se borran dentro del plan): ruta o componente de verificación, p. ej. `app/_supabase-check/page.tsx`.

---

## Plan de implementación

Cada paso deja la app compilando (`npm run build`) y navegable.

1. **Leer la documentación de Next 16.4** en `node_modules/next/dist/docs/` sobre `cookies()`, variables de entorno (`NEXT_PUBLIC_*`) y el comportamiento con `cacheComponents: true` en `next.config.ts` (acceso a datos dinámicos y cookies). Consultar también la guía de `@supabase/ssr` para Next.js (`search_docs` del MCP de Supabase).
2. **Dependencias y entorno:** `npm install @supabase/supabase-js @supabase/ssr`; obtener URL y publishable key con `get_project_url` y `get_publishable_keys` del MCP; rellenar `.env`; añadir las 2 claves vacías a `.env.template`. Confirmar que `.env` no aparece en `git status`.
3. **Helper de entorno:** crear `lib/supabase/env.ts`.
4. **Tipos:** generar `lib/supabase/database.types.ts` con `generate_typescript_types`.
5. **Clientes:** crear `lib/supabase/server.ts` y `lib/supabase/client.ts`, tipados con `Database`. En el servidor, manejar el `setAll` de cookies dentro de `try/catch` (los Server Components no pueden escribir cookies).
6. **Verificación temporal:** crear una página de comprobación que use el cliente de servidor y llame a `supabase.auth.getSession()` (o una RPC trivial) y otra comprobación desde un componente cliente con el cliente de navegador; abrirla con `npm run dev` y comprobar que no hay errores. Probar también el fallo: sin `NEXT_PUBLIC_SUPABASE_URL` el error es claro.
7. **Limpieza y cierre:** eliminar la verificación temporal; `npm run lint`, `npm run build`; recorrer los criterios de aceptación.

---

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `package.json` incluye `@supabase/supabase-js` y `@supabase/ssr` y ninguna otra dependencia nueva.
- [ ] `.env.template` contiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` vacías; `.env` no aparece en `git status`.
- [ ] `lib/supabase/server.ts` y `lib/supabase/client.ts` exportan `createClient()` tipado con `Database`.
- [ ] `lib/supabase/database.types.ts` existe, fue generado con el MCP y no tiene tablas (la BD está vacía).
- [ ] Durante la verificación temporal, el cliente de servidor y el de navegador se conectan al proyecto sin error (respuesta de `auth.getSession()` o RPC válida, sin errores en consola ni en la terminal de `next dev`).
- [ ] Sin `NEXT_PUBLIC_SUPABASE_URL`, `createClient()` falla con un mensaje que nombra la variable que falta.
- [ ] La verificación temporal fue eliminada: no queda ninguna ruta ni componente de diagnóstico en `app/` ni `components/`.
- [ ] `grep -r "service_role" app components lib .env.template` no devuelve resultados.
- [ ] `/`, `/games`, `/games/caida`, `/salon`, `/login` y `/about` cargan igual que antes (sesión `av_user` y puntuaciones `av_scores` intactas).
- [ ] No hay archivos nuevos en `proxy.ts`/`middleware.ts` ni carpeta `supabase/`.

---

## Decisiones tomadas y descartadas

- **Solo integración base.** Auth, tablas, Realtime y Edge Functions son specs posteriores. _Descartado:_ «todo junto» (3+ dominios, riesgo alto y spec inverificable).
- **`@supabase/ssr` con clientes de servidor y navegador separados.** Sirve a Server Components/Actions y deja listo Realtime en cliente. _Descartado:_ `supabase-js` directo en cliente (la escritura dependería solo de RLS y no encaja con las cookies de auth futuras).
- **Clave publishable (`sb_publishable_...`).** Formato vigente de Supabase. _Descartado:_ clave legacy `anon` (JWT que se irá retirando).
- **Sin `proxy.ts` ahora.** Sin auth no hay sesión que refrescar y se evita código muerto que intercepta todas las rutas. Se añade en la spec de auth.
- **Sin tablas ni migraciones.** Solo tipos generados con el MCP; cada spec futura aporta sus migraciones (con `apply_migration`). _Descartado:_ tabla `health` y Supabase CLI/`supabase/` (infraestructura sin uso todavía).
- **Verificación con código temporal que se borra.** _Descartado:_ `/api/health` permanente (API pública nueva sin necesidad) y verificar solo con build/lint (no prueba la conexión).
- **Variables `NEXT_PUBLIC_*` para URL y publishable key.** Son públicas por diseño. La seguridad real descansa en RLS, obligatoria en toda tabla futura.
- **`av_user` y `av_scores` no se tocan.** Su migración es de las specs de auth y puntuaciones.
- **Tipos generados a un archivo versionado.** Se regeneran en cada spec que cambie el esquema.

---

## Riesgos identificados

| Riesgo                                                                                                                      | Mitigación                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `cacheComponents: true` y `cookies()` en el cliente de servidor: acceder a cookies fuera de `<Suspense>` rompe el prerender | Paso 1 lee la doc local; el cliente se crea solo dentro de funciones llamadas en tiempo de request, y la verificación temporal cubre el caso |
| Que la publishable key se interprete como secreto, o al revés, que se cuele una `service_role`                              | Solo se usa publishable; criterio con `grep` de `service_role`; RLS obligatoria en las specs siguientes                                      |
| Variables de entorno ausentes en local o en producción                                                                      | `lib/supabase/env.ts` falla con el nombre de la variable que falta                                                                           |
| Paquetes `@supabase/*` incompatibles con Next 16.4 / React 19.3                                                             | Paso 2 + build; si hay conflicto de peer deps se documenta en la spec antes de forzar nada                                                   |
| Los tipos generados se quedan obsoletos al cambiar el esquema                                                               | Cada spec que modifique tablas regenera `database.types.ts` como paso explícito                                                              |
| Dejar la verificación temporal en el repo                                                                                   | Criterio de aceptación explícito y paso 7 de limpieza                                                                                        |

---

## Lo que **no** entra en esta spec

- Autenticación y reemplazo de `av_user`.
- `proxy.ts` de refresco de sesión.
- Tablas, RLS y migraciones; Supabase CLI.
- Puntuaciones, Salón de la Fama y catálogo de juegos en base de datos.
- Realtime y Edge Functions.
- Cualquier cambio visual o de rutas.

Cada uno, si llega, va en su propia spec.
