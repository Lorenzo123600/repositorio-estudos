-- Explicit administrative courtesy access, separate from financial records.
begin;
create table public.enem_complimentary_access (
 user_id uuid primary key references auth.users(id) on delete cascade,
 status text not null default 'active' check(status in ('active','revoked')),
 activated_at timestamptz not null default now(),
 expires_at timestamptz not null,
 reason text not null check(length(reason) between 1 and 200),
 check(expires_at>activated_at)
);
alter table public.enem_complimentary_access enable row level security;
revoke all on public.enem_complimentary_access from public,anon,authenticated;
grant select on public.enem_complimentary_access to authenticated;
grant all on public.enem_complimentary_access to service_role;
create policy enem_own_complimentary_access on public.enem_complimentary_access
 for select to authenticated using(user_id=(select auth.uid()));

create function public.enem_access_status()
returns table(payment_id uuid,plan_id uuid,environment text,status text,activated_at timestamptz,expires_at timestamptz,kind text)
language sql stable security invoker set search_path='' as $$
 select a.payment_id,a.plan_id,a.environment,a.status,a.activated_at,a.expires_at,'purchase'::text
 from public.enem_user_access a where a.user_id=(select auth.uid())
 union all
 select null::uuid,null::uuid,'production'::text,a.status,a.activated_at,a.expires_at,'complimentary'::text
 from public.enem_complimentary_access a where a.user_id=(select auth.uid());
$$;
revoke all on function public.enem_access_status() from public,anon;
grant execute on function public.enem_access_status() to authenticated,service_role;

create or replace function public.enem_has_paid_access() returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.enem_access_status() a
 where a.environment='production' and a.status='active' and a.activated_at<=now() and a.expires_at>now());
$$;
revoke all on function public.enem_has_paid_access() from public,anon;
grant execute on function public.enem_has_paid_access() to authenticated,service_role;
notify pgrst,'reload schema';
commit;
