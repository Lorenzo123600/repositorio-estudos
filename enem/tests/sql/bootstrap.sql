create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
insert into auth.users values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');

-- Reproduz a tabela compartilhada já existente no projeto do usuário.
create table public.study_progress (
 user_id uuid references auth.users(id), app_id text not null,
 state jsonb not null default '{}'::jsonb, revision bigint not null default 0,
 updated_at timestamptz not null default now(), primary key(user_id,app_id)
);
insert into public.study_progress(user_id,app_id,state) values
 ('11111111-1111-4111-8111-111111111111','outro-app','{"essay":"Não modificar"}');
