-- =====================================================================
-- Herramientas interactivas · IA para empresas: dónde invertir y qué priorizar
-- Esquema para Supabase (PostgreSQL)
--
-- Cómo usarlo:
--   1. En Supabase, abre "SQL Editor" > "New query".
--   2. Pega todo el archivo y ejecútalo (Run).
--   3. Define la clave del facilitador con la instrucción de la ÚLTIMA
--      sección, en una consulta aparte.
--
-- Seguridad:
--   Las tablas no se pueden leer ni escribir directamente con la clave
--   pública (anon/publishable). Todo pasa por funciones que validan los
--   datos. Solo el estado de la sesión (qué actividad está en vivo) es
--   de lectura pública. Las acciones del facilitador exigen su clave.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------

create table if not exists public.estado_sesion (
  id          int primary key default 1 check (id = 1),
  actividad   text not null default 'espera',
  actualizado timestamptz not null default now()
);
insert into public.estado_sesion (id) values (1) on conflict (id) do nothing;

create table if not exists public.clave_facilitador (
  id         int primary key default 1 check (id = 1),
  clave_hash text not null
);

create table if not exists public.participantes (
  id     uuid primary key,
  creado timestamptz not null default now()
);

create table if not exists public.respuestas (
  participante uuid not null references public.participantes(id) on delete cascade,
  actividad    text not null check (actividad in ('pulso','ab','capacidades','matriz','paso')),
  datos        jsonb not null,
  actualizado  timestamptz not null default now(),
  primary key (participante, actividad)
);

create table if not exists public.preguntas (
  id           bigint generated always as identity primary key,
  participante uuid not null references public.participantes(id) on delete cascade,
  texto        text not null,
  respondida   boolean not null default false,
  oculta       boolean not null default false,
  creada       timestamptz not null default now()
);

create table if not exists public.votos_pregunta (
  pregunta     bigint not null references public.preguntas(id) on delete cascade,
  participante uuid   not null references public.participantes(id) on delete cascade,
  primary key (pregunta, participante)
);

-- ---------------------------------------------------------------------
-- Seguridad a nivel de fila: todo cerrado salvo el estado de la sesión
-- ---------------------------------------------------------------------

alter table public.estado_sesion     enable row level security;
alter table public.clave_facilitador enable row level security;
alter table public.participantes     enable row level security;
alter table public.respuestas        enable row level security;
alter table public.preguntas         enable row level security;
alter table public.votos_pregunta    enable row level security;

drop policy if exists "estado de lectura publica" on public.estado_sesion;
create policy "estado de lectura publica" on public.estado_sesion
  for select to anon, authenticated using (true);

revoke all on public.clave_facilitador from anon, authenticated;
revoke all on public.participantes     from anon, authenticated;
revoke all on public.respuestas        from anon, authenticated;
revoke all on public.preguntas         from anon, authenticated;
revoke all on public.votos_pregunta    from anon, authenticated;
revoke insert, update, delete on public.estado_sesion from anon, authenticated;
grant select on public.estado_sesion to anon, authenticated;

-- ---------------------------------------------------------------------
-- Funciones internas
-- ---------------------------------------------------------------------

create or replace function public._clave_valida(p_clave text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from public.clave_facilitador
    where clave_hash = extensions.crypt(coalesce(p_clave, ''), clave_hash)
  );
$$;

create or replace function public._exigir_clave(p_clave text)
returns void
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  if not public._clave_valida(p_clave) then
    raise exception 'Clave de facilitador incorrecta' using errcode = '28000';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Funciones para participantes
-- ---------------------------------------------------------------------

create or replace function public.unirse(p_participante uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.participantes (id) values (p_participante)
  on conflict (id) do nothing;
$$;

create or replace function public.responder(p_participante uuid, p_actividad text, p_datos jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_actividad not in ('pulso','ab','capacidades','matriz','paso') then
    raise exception 'Actividad no válida: %', p_actividad;
  end if;
  if p_datos is null or jsonb_typeof(p_datos) <> 'object' then
    raise exception 'La respuesta debe ser un objeto JSON';
  end if;
  if octet_length(p_datos::text) > 4000 then
    raise exception 'La respuesta es demasiado larga';
  end if;

  insert into public.participantes (id) values (p_participante)
  on conflict (id) do nothing;

  insert into public.respuestas (participante, actividad, datos, actualizado)
  values (p_participante, p_actividad, p_datos, now())
  on conflict (participante, actividad)
  do update set datos = excluded.datos, actualizado = now();
end;
$$;

-- Devuelve las respuestas de una actividad sin identificar a nadie.
create or replace function public.resultados(p_actividad text)
returns table (datos jsonb, actualizado timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select r.datos, r.actualizado
  from public.respuestas r
  where r.actividad = p_actividad
  order by r.actualizado asc
  limit 500;
$$;

create or replace function public.resumen()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'participantes', (select count(*) from public.participantes),
    'respuestas', coalesce((
      select jsonb_object_agg(actividad, n)
      from (select actividad, count(*) as n from public.respuestas group by actividad) t
    ), '{}'::jsonb),
    'preguntas', (select count(*) from public.preguntas where not oculta and not respondida)
  );
$$;

create or replace function public.preguntar(p_participante uuid, p_texto text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_texto text := btrim(coalesce(p_texto, ''));
begin
  if char_length(v_texto) < 3 then
    raise exception 'La pregunta es demasiado corta';
  end if;
  if char_length(v_texto) > 280 then
    v_texto := left(v_texto, 280);
  end if;
  insert into public.participantes (id) values (p_participante)
  on conflict (id) do nothing;
  if (select count(*) from public.preguntas where participante = p_participante) >= 10 then
    raise exception 'Llegaste al máximo de 10 preguntas';
  end if;
  insert into public.preguntas (participante, texto) values (p_participante, v_texto);
end;
$$;

-- Marca o desmarca el voto de un participante en una pregunta.
create or replace function public.votar(p_participante uuid, p_pregunta bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.participantes (id) values (p_participante)
  on conflict (id) do nothing;
  if exists (select 1 from public.votos_pregunta
             where pregunta = p_pregunta and participante = p_participante) then
    delete from public.votos_pregunta
    where pregunta = p_pregunta and participante = p_participante;
  else
    insert into public.votos_pregunta (pregunta, participante)
    values (p_pregunta, p_participante);
  end if;
end;
$$;

create or replace function public.listar_preguntas(p_participante uuid)
returns table (id bigint, texto text, votos int, mia boolean, votada boolean,
               respondida boolean, creada timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select q.id,
         q.texto,
         (select count(*)::int from public.votos_pregunta v where v.pregunta = q.id) as votos,
         (q.participante = p_participante) as mia,
         exists (select 1 from public.votos_pregunta v
                 where v.pregunta = q.id and v.participante = p_participante) as votada,
         q.respondida,
         q.creada
  from public.preguntas q
  where not q.oculta
  order by q.respondida asc, votos desc, q.creada asc
  limit 200;
$$;

-- ---------------------------------------------------------------------
-- Funciones para facilitadores (exigen la clave)
-- ---------------------------------------------------------------------

create or replace function public.verificar_clave(p_clave text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select public._clave_valida(p_clave);
$$;

create or replace function public.cambiar_actividad(p_clave text, p_actividad text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public._exigir_clave(p_clave);
  if p_actividad not in ('espera','pulso','ab','capacidades','matriz','paso','preguntas','fin') then
    raise exception 'Actividad no válida: %', p_actividad;
  end if;
  update public.estado_sesion set actividad = p_actividad, actualizado = now() where id = 1;
end;
$$;

create or replace function public.marcar_pregunta(p_clave text, p_pregunta bigint,
                                                  p_respondida boolean, p_oculta boolean)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public._exigir_clave(p_clave);
  update public.preguntas
  set respondida = coalesce(p_respondida, respondida),
      oculta     = coalesce(p_oculta, oculta)
  where id = p_pregunta;
end;
$$;

-- Borra todas las respuestas, preguntas y participantes. Úsala antes de la sesión.
create or replace function public.reiniciar_sesion(p_clave text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public._exigir_clave(p_clave);
  delete from public.votos_pregunta where true;
  delete from public.preguntas where true;
  delete from public.respuestas where true;
  delete from public.participantes where true;
  update public.estado_sesion set actividad = 'espera', actualizado = now() where id = 1;
end;
$$;

-- ---------------------------------------------------------------------
-- Permisos de ejecución
-- ---------------------------------------------------------------------

revoke execute on function public._clave_valida(text)  from public, anon, authenticated;
revoke execute on function public._exigir_clave(text)  from public, anon, authenticated;

grant execute on function public.unirse(uuid)                        to anon, authenticated;
grant execute on function public.responder(uuid, text, jsonb)        to anon, authenticated;
grant execute on function public.resultados(text)                    to anon, authenticated;
grant execute on function public.resumen()                           to anon, authenticated;
grant execute on function public.preguntar(uuid, text)               to anon, authenticated;
grant execute on function public.votar(uuid, bigint)                 to anon, authenticated;
grant execute on function public.listar_preguntas(uuid)              to anon, authenticated;
grant execute on function public.verificar_clave(text)               to anon, authenticated;
grant execute on function public.cambiar_actividad(text, text)       to anon, authenticated;
grant execute on function public.marcar_pregunta(text, bigint, boolean, boolean) to anon, authenticated;
grant execute on function public.reiniciar_sesion(text)              to anon, authenticated;

-- ---------------------------------------------------------------------
-- Clave del facilitador
-- ---------------------------------------------------------------------
-- Este archivo es público (está en el repositorio), así que NO lleva la
-- clave. Mientras no se defina, nadie puede cambiar la actividad.
-- Defínela ejecutando aparte, en el SQL Editor, esta instrucción con tu
-- clave (no la guardes en ningún archivo del repositorio):
--
--   insert into public.clave_facilitador (id, clave_hash)
--   values (1, extensions.crypt('TU-CLAVE', extensions.gen_salt('bf')))
--   on conflict (id) do update set clave_hash = excluded.clave_hash;
