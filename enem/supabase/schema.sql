-- Execute uma vez no SQL Editor do SEU projeto Supabase (pode repetir).
-- Tabela exclusiva do ENEM. Não modifica a tabela compartilhada study_progress.
-- Preserva dados existentes. Nunca desative RLS.
begin;
create table if not exists public.enem_study_progress (
 user_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null default '{}'::jsonb,
 revision bigint not null default 0 check (revision >= 0),
 updated_at timestamptz not null default now(),
 constraint enem_study_progress_object check (jsonb_typeof(data) = 'object'),
 constraint enem_study_progress_size check (octet_length(data::text) <= 1048576)
);
alter table public.enem_study_progress enable row level security;
revoke all on public.enem_study_progress from anon, authenticated;
grant select, insert, update on public.enem_study_progress to authenticated;
drop policy if exists own_study_read on public.enem_study_progress;
create policy own_study_read on public.enem_study_progress for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists own_study_insert on public.enem_study_progress;
create policy own_study_insert on public.enem_study_progress for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists own_study_update on public.enem_study_progress;
create policy own_study_update on public.enem_study_progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.load_enem_study_progress()
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode='28000'; end if;
 select jsonb_build_object('state',data,'revision',revision) into result from public.enem_study_progress where user_id=auth.uid();
 return coalesce(result,jsonb_build_object('state',null,'revision',0));
end;
$$;
create or replace function public.save_enem_study_progress(p_state jsonb,p_revision bigint)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare saved_revision bigint;
begin
 if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode='28000'; end if;
 if p_state is null or jsonb_typeof(p_state) <> 'object' or p_revision is null or p_revision < 0 then
  raise exception 'Progresso inválido.' using errcode='22023';
 end if;
 if octet_length(p_state::text)>1048576 then raise exception 'Progresso excede 1 MB.' using errcode='22023'; end if;
 -- Concurrent first writes serialize on the primary key; only one can advance revision 0.
 insert into public.enem_study_progress(user_id) values(auth.uid()) on conflict(user_id) do nothing;
 update public.enem_study_progress set data=p_state,revision=revision+1,updated_at=now()
 where user_id=auth.uid() and revision=p_revision returning revision into saved_revision;
 if saved_revision is null then raise exception 'Outro dispositivo atualizou seu progresso.' using errcode='PT409'; end if;
 return jsonb_build_object('revision',saved_revision);
end;
$$;
revoke all on function public.load_enem_study_progress() from public, anon;
revoke all on function public.save_enem_study_progress(jsonb,bigint) from public, anon;
grant execute on function public.load_enem_study_progress() to authenticated;
grant execute on function public.save_enem_study_progress(jsonb,bigint) to authenticated;
commit;
