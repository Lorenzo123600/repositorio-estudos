begin;
alter table public.enem_payments add column order_payload jsonb;
alter table public.enem_payments add column checkout_url text;
create function public.enem_freeze_order_payload(p_payment_id uuid,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'Payload inválido'; end if;
 update public.enem_payments set order_payload=coalesce(order_payload,p_payload)
 where id=p_payment_id returning order_payload into result;
 if not found then raise exception 'Compra inexistente'; end if;
 return result;
end;
$$;
create function public.enem_save_checkout(p_payment_id uuid,p_order_id text,p_checkout_url text)
returns void language plpgsql security invoker set search_path='' as $$
begin
 update public.enem_payments set mercadopago_order_id=p_order_id,checkout_url=p_checkout_url,updated_at=now()
 where id=p_payment_id and (mercadopago_order_id is null or mercadopago_order_id=p_order_id);
 if not found then raise exception 'Order incompatível'; end if;
end;
$$;
revoke all on function public.enem_freeze_order_payload(uuid,jsonb),public.enem_save_checkout(uuid,text,text) from public,anon,authenticated;
grant execute on function public.enem_freeze_order_payload(uuid,jsonb),public.enem_save_checkout(uuid,text,text) to service_role;
commit;
