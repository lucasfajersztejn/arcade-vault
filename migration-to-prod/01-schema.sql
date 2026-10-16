-- =============================================================================
-- Arcade Vault — esquema completo (dev → prod)
-- Estado consolidado tras las 16 migraciones de dev.
-- Ejecutar en Supabase Prod → SQL Editor sobre un proyecto limpio.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. TABLAS
-- -----------------------------------------------------------------------------

create table public.games (
  id         text primary key,
  title      text not null,
  short      text not null,
  long       text not null,
  cat        text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover      text not null,
  color      text not null check (color in ('cyan','magenta','yellow','green')),
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

create table public.scores (
  id          bigint generated always as identity primary key,
  game_id     text not null references public.games(id) on delete cascade,
  player_name text not null check (char_length(btrim(player_name)) between 1 and 20),
  score       int  not null check (score >= 0 and score <= 99999999),
  user_id     uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc);
create index scores_user_id_idx    on public.scores (user_id);

create table public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text not null unique,
  created_at   timestamptz not null default now(),
  constraint display_name_shape check (
    char_length(display_name) between 3 and 20
    and display_name ~ '^[A-Za-z0-9_-]+$'
  )
);

-- -----------------------------------------------------------------------------
-- 2. VISTAS (respetan la RLS del usuario que consulta)
-- -----------------------------------------------------------------------------

create view public.game_stats with (security_invoker = true) as
  select g.id as game_id,
         count(s.id)::int          as plays,
         coalesce(max(s.score), 0) as best
  from public.games g
  left join public.scores s on s.game_id = g.id
  group by g.id;

create view public.leaderboard with (security_invoker = true) as
  select distinct on (s.game_id, coalesce(p.display_name, s.player_name))
    s.game_id,
    coalesce(p.display_name, s.player_name, 'JUGADOR'::text) as player_name,
    s.score,
    s.created_at as achieved_at
  from public.scores s
  left join public.profiles p on p.user_id = s.user_id
  order by s.game_id, coalesce(p.display_name, s.player_name), s.score desc, s.created_at;

-- -----------------------------------------------------------------------------
-- 3. RLS + POLICIES
-- -----------------------------------------------------------------------------

alter table public.games    enable row level security;
alter table public.scores   enable row level security;
alter table public.profiles enable row level security;

-- games: lectura pública, nunca escritura desde el cliente.
create policy "games_select_public" on public.games
  for select to anon, authenticated using (true);

-- scores: lectura pública, insert solo para usuarios autenticados y para su propio user_id.
create policy "scores_select_public" on public.scores
  for select to anon, authenticated using (true);

create policy "authenticated users insert their own scores"
  on public.scores for insert
  with check (((select auth.uid()) = user_id) and user_id is not null);

-- profiles: lectura pública (los nombres se usan en el leaderboard), update solo del propio.
create policy "profiles are readable by anyone"
  on public.profiles for select
  using (true);

create policy "users can update their own profile"
  on public.profiles for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- 4. PRIVILEGIOS (reset + grants explícitos)
-- -----------------------------------------------------------------------------

revoke all on public.games, public.scores, public.profiles,
             public.game_stats, public.leaderboard
  from anon, authenticated;

grant select on public.games, public.scores, public.profiles,
                public.game_stats, public.leaderboard
  to anon, authenticated;

grant insert on public.scores   to authenticated;
grant update on public.profiles to authenticated;

-- -----------------------------------------------------------------------------
-- 5. TRIGGER: crear profile al registrar un usuario
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  base_name text;
  candidate text;
  suffix    int := 0;
begin
  base_name := coalesce(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'name',
    'JUGADOR'
  );
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

revoke all     on function public.handle_new_user() from public, anon, authenticated;
grant  execute on function public.handle_new_user() to supabase_auth_admin;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 6. EVENT TRIGGER: auto-enable RLS en nuevas tablas de public
--     Opcional pero recomendado — es un cinturón de seguridad.
--     Si tu rol no es `postgres`, salta este bloque.
-- -----------------------------------------------------------------------------

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  cmd record;
  tbl name;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table','partitioned table')
  loop
    if cmd.schema_name is not null
       and cmd.schema_name in ('public')
       and cmd.schema_name not in ('pg_catalog','information_schema')
       and cmd.schema_name not like 'pg_toast%'
       and cmd.schema_name not like 'pg_temp%' then
      begin
        select c.relname into tbl from pg_catalog.pg_class c where c.oid = cmd.objid;
        execute format('alter table if exists %I.%I enable row level security', cmd.schema_name, tbl);
        raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      exception when others then
        raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      end;
    else
      raise log 'rls_auto_enable: skip % (system schema or not enforced: %)', cmd.object_identity, cmd.schema_name;
    end if;
  end loop;
end;
$$;

revoke all on function public.rls_auto_enable() from public, anon, authenticated;

-- Supabase crea un `ensure_rls` por defecto en proyectos nuevos; lo sustituimos
-- por el nuestro para que el comportamiento quede explícito y bajo control.
drop event trigger if exists ensure_rls;
create event trigger ensure_rls
  on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function public.rls_auto_enable();

-- -----------------------------------------------------------------------------
-- 7. SANITY CHECK
-- -----------------------------------------------------------------------------

do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.games'::regclass) then
    raise exception 'RLS no está habilitado en public.games';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.scores'::regclass) then
    raise exception 'RLS no está habilitado en public.scores';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass) then
    raise exception 'RLS no está habilitado en public.profiles';
  end if;
end $$;

commit;
