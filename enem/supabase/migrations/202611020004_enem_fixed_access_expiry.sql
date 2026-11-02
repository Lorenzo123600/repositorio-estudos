-- Validade fixa opcional, sem alterar o prazo de compras anteriores.
begin;
alter table public.enem_payment_plans add column access_expires_at timestamptz;
alter table public.enem_payment_plans alter column duration_days drop not null;
alter table public.enem_payment_plans add constraint enem_plan_one_expiry
 check ((duration_days is not null)::integer+(access_expires_at is not null)::integer=1);
alter table public.enem_payments add column access_expires_at timestamptz;
alter table public.enem_payments alter column duration_days drop not null;
alter table public.enem_payments add constraint enem_payment_one_expiry
 check ((duration_days is not null)::integer+(access_expires_at is not null)::integer=1);
create or replace function public.enem_begin_payment(p_user_id uuid,p_plan_id uuid,p_environment text,p_idempotency_key uuid)
returns public.enem_payments language plpgsql security invoker set search_path='' as $$
declare plan public.enem_payment_plans; payment public.enem_payments;
begin
 if p_environment not in ('test','production') then raise exception 'Ambiente inválido'; end if;
 select * into plan from public.enem_payment_plans where id=p_plan_id and active and (access_expires_at is null or access_expires_at>now()) for share;
 if not found then raise exception 'Plano indisponível'; end if;
 insert into public.enem_payments(user_id,plan_id,idempotency_key,amount,currency,duration_days,access_expires_at,reversal_policy,environment)
 values(p_user_id,plan.id,p_idempotency_key,plan.price,plan.currency,plan.duration_days,plan.access_expires_at,plan.reversal_policy,p_environment)
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

create or replace function public.enem_apply_verified_order(
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
 if p_status='approved' and (payment.access_expires_at is null or payment.access_expires_at>activation) then
  insert into public.enem_user_access(payment_id,user_id,plan_id,environment,activated_at,expires_at,status)
  values(payment.id,payment.user_id,payment.plan_id,payment.environment,activation,
   coalesce(payment.access_expires_at,activation+make_interval(days=>payment.duration_days)),'active') on conflict(payment_id) do nothing;
 elsif p_status in ('refunded','charged_back','cancelled') and payment.reversal_policy='revoke' then
  update public.enem_user_access set status='revoked' where payment_id=payment.id;
 end if;
end;
$$;
-- CREATE OR REPLACE preserva as permissões, mas reafirmamos a restrição.
revoke all on function public.enem_begin_payment(uuid,uuid,text,uuid),public.enem_apply_verified_order(uuid,text,numeric,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.enem_begin_payment(uuid,uuid,text,uuid),public.enem_apply_verified_order(uuid,text,numeric,text,text,text,timestamptz) to service_role;
commit;
