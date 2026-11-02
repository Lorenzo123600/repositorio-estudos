begin;
alter table public.enem_payments add column seller_id text;
alter table public.enem_payments add column application_id text;
create function public.enem_bind_payment_context(p_payment_id uuid,p_environment text,p_seller_id text,p_application_id text)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if coalesce(length(p_seller_id),0)=0 or coalesce(length(p_application_id),0)=0 then raise exception 'Conta de pagamento ausente'; end if;
 update public.enem_payments set seller_id=p_seller_id,application_id=p_application_id
 where id=p_payment_id and environment=p_environment
 and (seller_id is null or seller_id=p_seller_id) and (application_id is null or application_id=p_application_id);
 if not found then raise exception 'Ambiente/conta incompatível'; end if;
end;
$$;
create function public.enem_apply_mercadopago_order(
 p_external_reference uuid,p_order_id text,p_amount numeric,p_currency text,
 p_environment text,p_status text,p_provider_updated_at timestamptz,
 p_seller_id text,p_application_id text
) returns void language plpgsql security invoker set search_path='' as $$
declare payment public.enem_payments;
begin
 select * into payment from public.enem_payments where external_reference=p_external_reference for update;
 if not found or payment.mercadopago_order_id is distinct from p_order_id
 or payment.seller_id is null or payment.application_id is null
 or payment.seller_id is distinct from p_seller_id or payment.application_id is distinct from p_application_id
 or payment.environment is distinct from p_environment then raise exception 'Proveniência da order inválida'; end if;
 perform public.enem_apply_verified_order(p_external_reference,p_order_id,p_amount,p_currency,p_environment,p_status,p_provider_updated_at);
end;
$$;
revoke all on function public.enem_bind_payment_context(uuid,text,text,text), public.enem_apply_mercadopago_order(uuid,text,numeric,text,text,text,timestamptz,text,text) from public,anon,authenticated;
grant execute on function public.enem_bind_payment_context(uuid,text,text,text), public.enem_apply_mercadopago_order(uuid,text,numeric,text,text,text,timestamptz,text,text) to service_role;
commit;
