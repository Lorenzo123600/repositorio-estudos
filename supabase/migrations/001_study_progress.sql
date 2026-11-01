-- Execute no SQL Editor do Supabase, uma única vez.
create table if not exists public.study_progress (
 user_id uuid not null references auth.users(id) on delete cascade,
 app_id text not null check (app_id in ('enem','prumo')),
 state jsonb not null default '{}'::jsonb check (jsonb_typeof(state) = 'object'),
 revision bigint not null default 1 check (revision >= 1),
 updated_at timestamptz not null default now(),
 primary key (user_id, app_id)
);
alter table public.study_progress enable row level security;
revoke all on public.study_progress from anon;
grant select, insert, update on public.study_progress to authenticated;
drop policy if exists study_progress_select_own on public.study_progress;
create policy study_progress_select_own on public.study_progress for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists study_progress_insert_own on public.study_progress;
create policy study_progress_insert_own on public.study_progress for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists study_progress_update_own on public.study_progress;
create policy study_progress_update_own on public.study_progress for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Escrita condicional atômica para evitar que um dispositivo antigo sobrescreva outro.
create or replace function public.save_study_progress(
 p_app_id text, p_state jsonb, p_expected_revision bigint
) returns bigint language plpgsql security invoker set search_path = '' as $$
declare v_revision bigint;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if p_app_id not in ('enem','prumo') or p_state is null or jsonb_typeof(p_state) <> 'object' then
  raise exception 'Invalid input' using errcode='22023';
 end if;
 if p_expected_revision = 0 then
  insert into public.study_progress(user_id,app_id,state)
  values (auth.uid(),p_app_id,p_state)
  on conflict (user_id,app_id) do nothing
  returning revision into v_revision;
 else
  update public.study_progress
  set state=p_state,revision=revision+1,updated_at=now()
  where user_id=auth.uid() and app_id=p_app_id and revision=p_expected_revision
  returning revision into v_revision;
 end if;
 return v_revision; -- null = conflito, nunca sobrescrever silenciosamente
end $$;
revoke all on function public.save_study_progress(text,jsonb,bigint) from public, anon;
grant execute on function public.save_study_progress(text,jsonb,bigint) to authenticated;
