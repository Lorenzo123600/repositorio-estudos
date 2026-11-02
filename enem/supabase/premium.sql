-- ENEM only. Apply AFTER schema.sql. No payment is accepted from browser input.
begin;
create table if not exists public.enem_entitlements (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payment_id text not null unique,
 payment_status text not null check(payment_status in ('approved','pending','refunded','cancelled')),
 starts_at timestamptz not null default now(),
 expires_at timestamptz not null,
 check(expires_at > starts_at)
);
alter table public.enem_entitlements enable row level security;
revoke all on public.enem_entitlements from public,anon,authenticated;
grant select on public.enem_entitlements to authenticated;
drop policy if exists enem_own_entitlement on public.enem_entitlements;
create policy enem_own_entitlement on public.enem_entitlements for select to authenticated using(user_id=(select auth.uid()));
create or replace function public.enem_has_premium()
returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.enem_entitlements where user_id=auth.uid()
 and payment_status='approved' and starts_at<=now() and expires_at>now());
$$;
revoke all on function public.enem_has_premium() from public,anon;
grant execute on function public.enem_has_premium() to authenticated;
create or replace function public.enem_access()
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('premium',public.enem_has_premium(),'expiresAt',
 (select expires_at from public.enem_entitlements where user_id=auth.uid() and payment_status='approved' and starts_at<=now() and expires_at>now()));
$$;
revoke all on function public.enem_access() from public,anon;
grant execute on function public.enem_access() to authenticated;
-- Exclusive content must live here, never in public assets or the JavaScript bundle.
create table if not exists public.enem_premium_resources (
 id text primary key,
 content jsonb not null
);
alter table public.enem_premium_resources enable row level security;
revoke all on public.enem_premium_resources from public,anon,authenticated;
grant select on public.enem_premium_resources to authenticated;
drop policy if exists enem_paid_content on public.enem_premium_resources;
create policy enem_paid_content on public.enem_premium_resources for select to authenticated using((select public.enem_has_premium()));
-- Personal premium records are protected by BOTH ownership and current entitlement.
create table if not exists public.enem_premium_sessions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
 revision bigint not null default 0 check(revision>=0),
 data jsonb not null default '{}'::jsonb check(jsonb_typeof(data)='object' and octet_length(data::text)<=1048576)
);
alter table public.enem_premium_sessions enable row level security;
revoke all on public.enem_premium_sessions from public,anon,authenticated;
grant select,insert,update on public.enem_premium_sessions to authenticated;
drop policy if exists enem_paid_own_session on public.enem_premium_sessions;
create policy enem_paid_own_session on public.enem_premium_sessions for all to authenticated
 using(user_id=(select auth.uid()) and (select public.enem_has_premium()))
 with check(user_id=(select auth.uid()) and (select public.enem_has_premium()));
-- Preserve existing simulations before moving them out of the general progress document.
insert into public.enem_premium_sessions(user_id,data)
select user_id,jsonb_build_object('activeExam',data->'activeExam','examHistory',coalesce(data->'examHistory','[]'::jsonb))
from public.enem_study_progress where data ? 'activeExam' or data ? 'examHistory'
on conflict(user_id) do nothing;
update public.enem_study_progress set data=data-'activeExam'-'examHistory',revision=revision+1,updated_at=now()
where data ? 'activeExam' or data ? 'examHistory';
create or replace function public.save_enem_premium_progress(p_state jsonb,p_revision bigint)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare next_revision bigint;
begin
 if not public.enem_has_premium() then raise exception 'Acesso premium não vigente.' using errcode='42501';end if;
 if p_revision is null or p_revision<0 or p_state is null or jsonb_typeof(p_state)<>'object' then raise exception 'Estado inválido.' using errcode='22023';end if;
 insert into public.enem_premium_sessions(user_id) values(auth.uid()) on conflict(user_id) do nothing;
 update public.enem_premium_sessions set data=p_state,revision=revision+1 where user_id=auth.uid() and revision=p_revision returning revision into next_revision;
 if next_revision is null then raise exception 'Outro dispositivo atualizou seu simulado.' using errcode='PT409';end if;
 return jsonb_build_object('revision',next_revision);
end;
$$;
revoke all on function public.save_enem_premium_progress(jsonb,bigint) from public,anon;
grant execute on function public.save_enem_premium_progress(jsonb,bigint) to authenticated;
commit;
