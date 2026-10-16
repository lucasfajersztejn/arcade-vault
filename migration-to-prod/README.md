# Migración dev → prod (Supabase)

Yo (Claude) **no** tengo acceso a tu proyecto de producción. Este paquete contiene todo lo necesario para que tú lo apliques a mano desde el dashboard de Supabase y el `.env` de tu deploy.

## Qué se migra y qué no

- ✅ **Esquema completo**: tablas `games`, `scores`, `profiles`; vistas `game_stats`, `leaderboard`; función + trigger `handle_new_user`; función + event trigger `rls_auto_enable`; policies RLS; índices; grants.
- ✅ **Catálogo de juegos (`games`)**: 5 filas con el estado real actual (nombres ya renombrados a `ARKANOID` / `TETRIS`, `sort_order` 1–5).
- ❌ **`scores` en dev son FICTICIOS** (seeds `seed_example_*_scores`). No se migran: prod arranca con el leaderboard vacío. Si los quieres de todas formas, lo decides tú.
- ❌ **`profiles` y `auth.users` de dev**: no se migran. Son datos personales de tu usuario de dev; prod se puebla sola a medida que la gente se registra (el trigger `handle_new_user` crea el `profile` automático).
- ⚠️ **Config de Auth (Site URL, redirect URLs, plantillas de email, SMTP, providers)**: no es SQL, se configura en el dashboard. Checklist más abajo.
- ⚠️ **Edge Functions**: no hay ninguna en dev, nada que migrar.
- ⚠️ **Secrets de la Edge Runtime / Vault**: tampoco hay en dev.

## Pasos (orden exacto)

### 1. Aplicar el esquema

En **Supabase Prod → SQL Editor**, pega y ejecuta:

- `01-schema.sql` — crea todo el esquema desde cero. Es idempotente a nivel de proyecto limpio (si prod está vacío, corre tal cual; si ya aplicaste algo, revisa antes).

### 2. Sembrar el catálogo

- `02-seed-games.sql` — inserta las 5 filas de `games` con el estado actual.

### 3. Verificar

- `03-verify.sql` — queries de comprobación. Compara su salida con la de dev:
  - 3 tablas con RLS activo (`games`, `scores`, `profiles`)
  - 5 juegos
  - 0 scores (si no sembraste ficticios)
  - 2 vistas (`game_stats`, `leaderboard`) con `security_invoker=true`
  - Policies esperadas
  - Trigger `on_auth_user_created` sobre `auth.users`
  - Event trigger `ensure_rls`

### 4. Configurar Auth (dashboard, no SQL)

En **Prod → Authentication**:

1. **URL Configuration**
   - _Site URL_: `https://<tu-dominio-de-prod>`
   - _Redirect URLs_: añadir `https://<tu-dominio-de-prod>/**` (y, si lo usas, el callback OAuth del provider).
2. **Providers**: activa los mismos que uses en dev (Email por defecto; si tienes Google/GitHub, replica credenciales — las claves OAuth deben ser nuevas, no reutilices las de dev).
3. **Email templates**: si editaste alguna plantilla en dev, cópiala a prod.
4. **SMTP**: configura el SMTP propio (sin esto Supabase manda emails con dominio compartido y rate limit bajo). Si usas Resend, puedes reutilizar la misma cuenta pero con una API key separada para prod.
5. **Rate limits / email confirmation**: revisa que coincidan con dev. Spec 16 asume `email_confirmation` activo.
6. **Anti-abuso (Captcha)**: si lo tenías activo, replícalo.

### 5. Variables de entorno del deploy

En tu plataforma de hosting (Vercel, etc.) define:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref-prod>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   # de prod, NO la de dev
NEXT_PUBLIC_SITE_URL=https://<tu-dominio-de-prod>
RESEND_API_KEY=re_...                                     # idealmente una key distinta a dev
CONTACT_TO_EMAIL=...
CONTACT_FROM_EMAIL="Arcade Vault <...>"
SUPABASE_DB_PASSWORD=...                                  # solo si lo usas en algún script
```

Reglas:

- **Nunca** pongas la `service_role` key en el cliente ni en `NEXT_PUBLIC_*`.
- El `.env.template` del repo ya refleja estas variables.

### 6. MCP de Supabase (CLAUDE.md)

El `.mcp.json` actual apunta al proyecto de **dev**. Déjalo así: así te aseguras de que yo nunca tenga acceso a prod. Si en algún momento quieres darme acceso temporal a prod, cambia el `project-ref` del `.mcp.json` manualmente y revístelo cuando acabes.

### 7. Backups

Antes de la primera migración importante, en **Prod → Database → Backups** confirma que los backups diarios están activos (plan Pro y superior). En Free solo tendrás PITR si lo activas.

## Si algo falla

- Si `01-schema.sql` revienta porque un objeto ya existe, es que prod no estaba vacío: revisa qué falta y aplica solo las partes que faltan.
- El event trigger `rls_auto_enable` requiere permisos de `postgres`. Supabase los da por defecto en el SQL Editor; si tu rol no los tiene, salta esa sección (es un cinturón de seguridad, no un requisito).
- Si no quieres sembrar el catálogo manualmente, también puedes vaciar prod y restaurarlo con `pg_dump` desde dev, pero perderás el aislamiento (yo tendría que ver prod para ayudarte).
