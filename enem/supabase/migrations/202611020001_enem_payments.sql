-- Fundação de pagamentos exclusiva do ENEM. Não altera auth ou progresso.
-- Nenhum plano/preço comercial é criado automaticamente.
begin;
create table public.enem_payment_plans (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(name) between 1 and 120),
 price numeric(12,2) not null check (price > 0),
 currency text not null default 'BRL' check (currency = 'BRL'),
 duration_days integer not null check (duration_days between 1 and 3650),
 active boolean not null default false,
 reversal_policy text not null default 'revoke' check (reversal_policy in ('revoke','preserve'))
);
create table public.enem_payments (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete restrict,
 plan_id uuid not null references public.enem_payment_plans(id) on delete restrict,
 external_reference uuid not null unique default gen_random_uuid(),
 mercadopago_order_id text unique,
 idempotency_key uuid not null unique,
 amount numeric(12,2) not null check (amount > 0),
 currency text not null check (currency = 'BRL'),
 duration_days integer not null check (duration_days between 1 and 3650),
 reversal_policy text not null check (reversal_policy in ('revoke','preserve')),
 status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled','refunded','charged_back')),
 environment text not null check (environment in ('test','production')),
 provider_updated_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index enem_payments_owner on public.enem_payments(user_id,created_at desc);
create table public.enem_user_access (
 payment_id uuid primary key references public.enem_payments(id) on delete restrict,
 user_id uuid not null references auth.users(id) on delete restrict,
 plan_id uuid not null references public.enem_payment_plans(id) on delete restrict,
 environment text not null check (environment in ('test','production')),
 activated_at timestamptz not null,
 expires_at timestamptz not null,
 status text not null check (status in ('active','revoked')),
 check (expires_at > activated_at)
);
create index enem_user_access_owner on public.enem_user_access(user_id,expires_at);
alter table public.enem_payment_plans enable row level security;
alter table public.enem_payments enable row level security;
alter table public.enem_user_access enable row level security;
revoke all on public.enem_payment_plans, public.enem_payments, public.enem_user_access from public,anon,authenticated;
grant select on public.enem_payment_plans, public.enem_payments, public.enem_user_access to authenticated;
grant all on public.enem_payment_plans, public.enem_payments, public.enem_user_access to service_role;
create policy enem_active_plans on public.enem_payment_plans for select to authenticated using (active);
create policy enem_own_payments on public.enem_payments for select to authenticated using ((select auth.uid()) = user_id);
create policy enem_own_access on public.enem_user_access for select to authenticated using ((select auth.uid()) = user_id);

-- Executar SOMENTE após autenticar e consultar o catálogo no backend.
-- O UUID fornecido pelo cliente identifica uma tentativa; não determina preço/status.
create function public.enem_begin_payment(p_user_id uuid,p_plan_id uuid,p_environment text,p_idempotency_key uuid)
returns public.enem_payments language plpgsql security invoker set search_path='' as $$
declare plan public.enem_payment_plans; payment public.enem_payments;
begin
 if p_environment not in ('test','production') then raise exception 'Ambiente inválido'; end if;
 select * into plan from public.enem_payment_plans where id=p_plan_id and active for share;
 if not found then raise exception 'Plano indisponível'; end if;
 insert into public.enem_payments(user_id,plan_id,idempotency_key,amount,currency,duration_days,reversal_policy,environment)
 values(p_user_id,plan.id,p_idempotency_key,plan.price,plan.currency,plan.duration_days,plan.reversal_policy,p_environment)
 on conflict(idempotency_key) do nothing returning * into payment;
 if payment.id is null then
  select * into payment from public.enem_payments where idempotency_key=p_idempotency_key;
  if payment.user_id<>p_user_id or payment.plan_id<>p_plan_id or payment.environment<>p_environment then
   raise exception 'Tentativa já vinculada a outra compra';
  end if;
 end if;
 return payment;
end;
$$;

-- O backend deve passar exclusivamente dados normalizados de uma consulta
-- autenticada ao provedor, depois de validar assinatura e ambiente da order.
-- Transação/lock serializam duplicatas; snapshots preservam o contrato comprado.
create function public.enem_apply_verified_order(
 p_external_reference uuid,p_order_id text,p_amount numeric,p_currency text,
 p_environment text,p_status text,p_provider_updated_at timestamptz
) returns void language plpgsql security invoker set search_path='' as $$
declare payment public.enem_payments; activation timestamptz:=now();
begin
 select * into payment from public.enem_payments where external_reference=p_external_reference for update;
 if not found then raise exception 'Compra inexistente'; end if;
 if p_order_id is null or length(p_order_id)=0 or p_amount is distinct from payment.amount
 or p_currency is distinct from payment.currency or p_environment is distinct from payment.environment
 or p_provider_updated_at is null or p_status is null
 or p_status not in ('pending','approved','rejected','cancelled','refunded','charged_back') then
  raise exception 'Order incompatível com a compra';
 end if;
 if payment.mercadopago_order_id is not null and payment.mercadopago_order_id<>p_order_id then
  raise exception 'Order já vinculada';
 end if;
 -- Evita que snapshots antigos desfaçam uma confirmação ou reversão.
 if payment.provider_updated_at is not null and p_provider_updated_at<payment.provider_updated_at then return; end if;
 if payment.status in ('refunded','charged_back','cancelled') and p_status not in ('refunded','charged_back','cancelled') then return; end if;
 if payment.status='approved' and p_status in ('pending','rejected') then return; end if;
 update public.enem_payments set mercadopago_order_id=p_order_id,status=p_status,
 provider_updated_at=p_provider_updated_at,updated_at=activation where id=payment.id;
 if p_status='approved' then
  insert into public.enem_user_access(payment_id,user_id,plan_id,environment,activated_at,expires_at,status)
  values(payment.id,payment.user_id,payment.plan_id,payment.environment,activation,
   activation+make_interval(days=>payment.duration_days),'active') on conflict(payment_id) do nothing;
 elsif p_status in ('refunded','charged_back','cancelled') and payment.reversal_policy='revoke' then
  update public.enem_user_access set status='revoked' where payment_id=payment.id;
 end if;
end;
$$;
-- Somente acessos reais e vigentes podem autorizar serviços premium em produção.
create function public.enem_has_paid_access() returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.enem_user_access where user_id=(select auth.uid())
 and environment='production' and status='active' and activated_at<=now() and expires_at>now());
$$;
revoke all on function public.enem_begin_payment(uuid,uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.enem_apply_verified_order(uuid,text,numeric,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.enem_begin_payment(uuid,uuid,text,uuid) to service_role;
grant execute on function public.enem_apply_verified_order(uuid,text,numeric,text,text,text,timestamptz) to service_role;
revoke all on function public.enem_has_paid_access() from public,anon;
grant execute on function public.enem_has_paid_access() to authenticated,service_role;
commit;
