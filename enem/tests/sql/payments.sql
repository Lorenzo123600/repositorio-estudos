-- Executar após bootstrap.sql e a migration, em banco descartável.
insert into public.enem_payment_plans(id,name,price,duration_days,active) values
 ('33333333-3333-4333-8333-333333333333','Fixture de teste — não comercial',10,30,true);
set role service_role;
select public.enem_begin_payment('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','test','44444444-4444-4444-8444-444444444444');
select public.enem_begin_payment('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','test','44444444-4444-4444-8444-444444444444');
do $$declare p public.enem_payments; before_expiry timestamptz; s text; n integer;begin
 select * into strict p from public.enem_payments;
 if p.amount<>10 or p.duration_days<>30 then raise exception 'Preço/snapshot incorreto'; end if;
 -- Um aluno não pode reutilizar a tentativa de outro aluno.
 begin
  perform public.enem_begin_payment('22222222-2222-4222-8222-222222222222',p.plan_id,'test',p.idempotency_key);
  raise exception 'ACEITOU_OUTRO_ALUNO';
 exception when raise_exception then if sqlerrm='ACEITOU_OUTRO_ALUNO' then raise; end if; end;
 foreach s in array array['pending','rejected','cancelled'] loop
  -- Compras independentes para cada estado terminal.
  p:=public.enem_begin_payment(p.user_id,p.plan_id,'test',gen_random_uuid());
  perform public.enem_apply_verified_order(p.external_reference,p.id::text,10,'BRL','test',s,now());
  if exists(select 1 from public.enem_user_access where payment_id=p.id) then raise exception 'Acesso sem aprovação: %',s; end if;
 end loop;
 p:=public.enem_begin_payment(p.user_id,p.plan_id,'test',gen_random_uuid());
 foreach s in array array['price','currency','environment'] loop
  begin
   perform public.enem_apply_verified_order(p.external_reference,p.id::text,
    case when s='price' then 1 else 10 end,case when s='currency' then 'USD' else 'BRL' end,
    case when s='environment' then 'production' else 'test' end,'approved',now());
   raise exception 'ACEITOU_DIVERGENCIA';
  exception when raise_exception then if sqlerrm='ACEITOU_DIVERGENCIA' then raise; end if; end;
 end loop;
 perform public.enem_apply_verified_order(p.external_reference,p.id::text,10,'BRL','test','approved',now());
 select expires_at into strict before_expiry from public.enem_user_access where payment_id=p.id;
 if before_expiry<>now()+interval '30 days' then raise exception 'Expiração incorreta'; end if;
 perform public.enem_apply_verified_order(p.external_reference,p.id::text,10,'BRL','test','approved',now());
 perform public.enem_apply_verified_order(p.external_reference,p.id::text,10,'BRL','test','approved',now()+interval '1 second');
 if (select expires_at from public.enem_user_access where payment_id=p.id)<>before_expiry then raise exception 'Duplicata prorrogou acesso'; end if;
 if (select count(*) from public.enem_user_access where payment_id=p.id)<>1 then raise exception 'Duplicata concedeu acesso'; end if;
 perform public.enem_apply_verified_order(p.external_reference,p.id::text,10,'BRL','test','refunded',now()+interval '2 seconds');
 perform public.enem_apply_verified_order(p.external_reference,p.id::text,10,'BRL','test','approved',now()+interval '3 seconds');
 if (select status from public.enem_user_access where payment_id=p.id)<>'revoked' then raise exception 'Reembolso não revogou'; end if;
 -- Prova de recarga/outro dispositivo: autorização consulta dados persistidos.
 p:=public.enem_begin_payment(p.user_id,p.plan_id,'production',gen_random_uuid());
 perform public.enem_apply_verified_order(p.external_reference,p.id::text,10,'BRL','production','approved',now());
end$$;
reset role;
set role authenticated;
set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
do $$begin
 if not public.enem_has_paid_access() then raise exception 'Acesso real não encontrado'; end if;
 begin update public.enem_payments set amount=1; raise exception 'ACEITOU_ESCRITA'; exception when insufficient_privilege then null; end;
 begin insert into public.enem_user_access select * from public.enem_user_access; raise exception 'ACEITOU_CONCESSAO'; exception when insufficient_privilege then null; end;
 begin perform public.enem_apply_verified_order(gen_random_uuid(),'fake',10,'BRL','production','approved',now()); raise exception 'ACEITOU_RPC'; exception when insufficient_privilege then null; end;
end$$;
set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
do $$begin
 if exists(select 1 from public.enem_payments) or exists(select 1 from public.enem_user_access) or public.enem_has_paid_access() then raise exception 'Vazamento entre alunos'; end if;
end$$;
reset role;
-- Expiração e test mode não autorizam produção.
update public.enem_user_access set activated_at=now()-interval '40 days',expires_at=now()-interval '10 days';
set role authenticated;
set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
do $$begin if public.enem_has_paid_access() then raise exception 'Acesso expirado aceito'; end if; end$$;
reset role;
select 'Pagamento: snapshots, idempotência, estados, reversão, RLS e expiração passaram.' as resultado;
-- Política de preservação é copiada na compra, assim como preço e duração.
update public.enem_payment_plans set reversal_policy='preserve';
set role service_role;
do $$declare p public.enem_payments;begin
 p:=public.enem_begin_payment('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','test',gen_random_uuid());
 perform public.enem_apply_verified_order(p.external_reference,p.id::text,10,'BRL','test','pending',now());
 perform public.enem_apply_verified_order(p.external_reference,p.id::text,10,'BRL','test','approved',now());
 perform public.enem_apply_verified_order(p.external_reference,p.id::text,10,'BRL','test','charged_back',now());
 if (select status from public.enem_user_access where payment_id=p.id)<>'active' then raise exception 'Política preserve ignorada'; end if;
end$$;
reset role;
update public.enem_payment_plans set price=99,duration_days=1,active=false;
set role service_role;
do $$begin
 if exists(select 1 from public.enem_payments where amount<>10 or duration_days<>30) then raise exception 'Alterar catálogo alterou compra'; end if;
 begin
  perform public.enem_begin_payment('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','test',gen_random_uuid());
  raise exception 'ACEITOU_INATIVO';
 exception when raise_exception then if sqlerrm='ACEITOU_INATIVO' then raise; end if; end;
end$$;
reset role;
select 'PASS: política preserve, timestamps iguais, catálogo congelado e plano inativo' as resultado;
set role service_role;
do $$declare p public.enem_payments; payload jsonb;begin
 select * into p from public.enem_payments limit 1;
 payload:=public.enem_freeze_order_payload(p.id,'{"total_amount":"10.00"}');
 payload:=public.enem_freeze_order_payload(p.id,'{"total_amount":"999.00"}');
 if payload->>'total_amount'<>'10.00' then raise exception 'Retry alterou payload'; end if;
 perform public.enem_save_checkout(p.id,coalesce(p.mercadopago_order_id,'ORD-test'),'https://www.mercadopago.com.br/checkout/v1/redirect?order_id=ORD-test');
 begin
  perform public.enem_save_checkout(p.id,'ORD-different','https://invalid.test/');
  raise exception 'ACEITOU_OUTRA_ORDER';
 exception when raise_exception then if sqlerrm='ACEITOU_OUTRA_ORDER' then raise; end if; end;
end$$;
reset role;
set role authenticated;
do $$begin
 begin perform public.enem_freeze_order_payload(gen_random_uuid(),'{}');raise exception 'ACEITOU_PAYLOAD';exception when insufficient_privilege then null;end;
 begin perform public.enem_save_checkout(gen_random_uuid(),'fake','https://invalid.test');raise exception 'ACEITOU_CHECKOUT';exception when insufficient_privilege then null;end;
end$$;
reset role;
select 'PASS: payload imutável, checkout vinculado e RPCs privadas' as resultado;
set role service_role;
do $$declare p public.enem_payments;begin
 select * into p from public.enem_payments where mercadopago_order_id is not null limit 1;
 perform public.enem_bind_payment_context(p.id,p.environment,'seller-fixture','app-fixture');
 perform public.enem_bind_payment_context(p.id,p.environment,'seller-fixture','app-fixture');
 begin
  perform public.enem_bind_payment_context(p.id,p.environment,'different-seller','app-fixture');
  raise exception 'ACEITOU_CONTEXTO_DIFERENTE';
 exception when raise_exception then if sqlerrm='ACEITOU_CONTEXTO_DIFERENTE' then raise; end if; end;
 begin
  perform public.enem_apply_mercadopago_order(p.external_reference,p.mercadopago_order_id,p.amount,p.currency,p.environment,'approved',now(),'different-seller','app-fixture');
  raise exception 'ACEITOU_PROVENIENCIA_DIFERENTE';
 exception when raise_exception then if sqlerrm='ACEITOU_PROVENIENCIA_DIFERENTE' then raise; end if; end;
 perform public.enem_apply_mercadopago_order(p.external_reference,p.mercadopago_order_id,p.amount,p.currency,p.environment,'approved',now(),'seller-fixture','app-fixture');
end$$;
reset role;
set role authenticated;
do $$begin
 begin perform public.enem_bind_payment_context(gen_random_uuid(),'test','seller','app');raise exception 'ACEITOU_CONTEXTO_CLIENTE';exception when insufficient_privilege then null;end;
 begin perform public.enem_apply_mercadopago_order(gen_random_uuid(),'fake',10,'BRL','production','approved',now(),'seller','app');raise exception 'ACEITOU_ORDER_CLIENTE';exception when insufficient_privilege then null;end;
end$$;
reset role;
select 'PASS: proveniência imutável, ambiente/conta vinculados e RPCs privadas' as resultado;
-- Validade absoluta: todas as compras terminam no mesmo instante, sem extensão.
insert into public.enem_payment_plans(id,name,price,duration_days,access_expires_at,active)
values ('66666666-6666-4666-8666-666666666666','Fixture com validade fixa',14.90,null,now()+interval '2 days',true);
set role service_role;
do $$declare a public.enem_payments; b public.enem_payments; deadline timestamptz;begin
 a:=public.enem_begin_payment('11111111-1111-4111-8111-111111111111','66666666-6666-4666-8666-666666666666','test',gen_random_uuid());
 b:=public.enem_begin_payment(a.user_id,a.plan_id,'test',gen_random_uuid());
 deadline:=a.access_expires_at;
 if a.duration_days is not null or a.amount<>14.90 or deadline is null or b.access_expires_at<>deadline then raise exception 'Validade fixa incorreta'; end if;
 perform public.enem_apply_verified_order(a.external_reference,a.id::text,14.90,'BRL','test','approved',now());
 perform public.enem_apply_verified_order(a.external_reference,a.id::text,14.90,'BRL','test','approved',now()+interval '1 second');
 if (select expires_at from public.enem_user_access where payment_id=a.id)<>deadline then raise exception 'Duplicata estendeu data final'; end if;
 update public.enem_payment_plans set access_expires_at=now()+interval '10 days' where id=a.plan_id;
 if (select access_expires_at from public.enem_payments where id=a.id)<>deadline then raise exception 'Catálogo alterou compra existente'; end if;
 -- Simula o relógio passando o prazo da compra ainda pendente.
 update public.enem_payments set access_expires_at=now()-interval '1 second' where id=b.id;
 perform public.enem_apply_verified_order(b.external_reference,b.id::text,14.90,'BRL','test','approved',now());
 if exists(select 1 from public.enem_user_access where payment_id=b.id) then raise exception 'Pagamento tardio concedeu acesso expirado'; end if;
 update public.enem_payment_plans set access_expires_at=now()-interval '1 second' where id=a.plan_id;
 begin
  perform public.enem_begin_payment(a.user_id,a.plan_id,'test',gen_random_uuid());
  raise exception 'ACEITOU_PLANO_EXPIRADO';
 exception when raise_exception then if sqlerrm='ACEITOU_PLANO_EXPIRADO' then raise; end if; end;
end$$;
reset role;
-- O limite é exclusivo, cobrindo todo 31/12 no horário brasileiro.
do $$begin
 if ('2027-01-01 03:00:00+00'::timestamptz - interval '1 microsecond') at time zone 'America/Sao_Paulo' <> '2026-12-31 23:59:59.999999'::timestamp then raise exception 'Fuso/data final incorretos'; end if;
end$$;
select 'PASS: validade fixa, fuso de Brasília, duplicatas, snapshots e aprovação após prazo' as resultado;
