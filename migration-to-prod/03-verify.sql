-- =============================================================================
-- Verificación post-migración (solo lectura)
-- Compara estos resultados con los esperados en el README.
-- =============================================================================

-- A. Tablas con RLS
select tablename, rowsecurity
from pg_tables
where schemaname='public'
order by tablename;
-- Esperado: games/scores/profiles con rowsecurity=t

-- B. Catálogo
select id, title, cat, cover, color, sort_order
from public.games
order by sort_order;
-- Esperado: 5 filas (ARKANOID, TETRIS, ASTEROIDS, SNAKE, FROGGER)

-- C. Scores (debería estar vacía)
select count(*) as total_scores from public.scores;

-- D. Vistas
select viewname, viewowner, definition is not null as has_def
from pg_views where schemaname='public' order by viewname;
-- Esperado: game_stats, leaderboard

-- E. Policies
select tablename, policyname, cmd, roles
from pg_policies where schemaname='public'
order by tablename, policyname;
-- Esperado:
--   games    · games_select_public                        · SELECT · {anon,authenticated}
--   profiles · profiles are readable by anyone            · SELECT · {public}
--   profiles · users can update their own profile         · UPDATE · {public}
--   scores   · authenticated users insert their own scores· INSERT · {public}
--   scores   · scores_select_public                       · SELECT · {anon,authenticated}

-- F. Trigger sobre auth.users
select tgname, tgrelid::regclass as table_, tgenabled
from pg_trigger
where tgname='on_auth_user_created';
-- Esperado: 1 fila, table_ = auth.users, tgenabled='O'

-- G. Event trigger (opcional)
select evtname, evtevent, evtenabled
from pg_event_trigger
where evtname='ensure_rls';
-- Esperado: 1 fila si aplicaste el bloque 6, 0 si lo omitiste

-- H. Grants
select grantee, privilege_type, table_name
from information_schema.role_table_grants
where table_schema='public' and grantee in ('anon','authenticated')
order by table_name, grantee, privilege_type;
