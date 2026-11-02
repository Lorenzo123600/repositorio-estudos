begin;
insert into auth.users(id) values('77777777-7777-4777-8777-777777777777');
set role service_role;
insert into public.enem_complimentary_access(user_id,activated_at,expires_at,reason)
 values('77777777-7777-4777-8777-777777777777',now()-interval '2 days',now()+interval '30 days','Owner fixture');
reset role;
set role authenticated;
set request.jwt.claim.sub='77777777-7777-4777-8777-777777777777';
do $$begin
 if not public.enem_has_paid_access() then raise exception 'Courtesy access denied'; end if;
 if (select count(*) from public.enem_access_status() where kind='complimentary')<>1 then raise exception 'Courtesy missing'; end if;
 if exists(select 1 from public.enem_payments) then raise exception 'Courtesy created a financial purchase'; end if;
 begin
  insert into public.enem_complimentary_access(user_id,expires_at,reason) values(auth.uid(),now()+interval '60 days','Self-grant');
  raise exception 'ACCEPTED_SELF_GRANT';
 exception when insufficient_privilege then null; end;
 begin
  update public.enem_complimentary_access set expires_at=now()+interval '100 days';
  raise exception 'ACCEPTED_SELF_EXTENSION';
 exception when insufficient_privilege then null; end;
end$$;
set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
do $$begin
 if exists(select 1 from public.enem_complimentary_access) or exists(select 1 from public.enem_access_status() where kind='complimentary') then raise exception 'Courtesy leaked'; end if;
end$$;
reset role;
set role service_role;
update public.enem_complimentary_access set status='revoked' where user_id='77777777-7777-4777-8777-777777777777';
reset role;
set role authenticated;
set request.jwt.claim.sub='77777777-7777-4777-8777-777777777777';
do $$begin if public.enem_has_paid_access() then raise exception 'Revoked courtesy accepted'; end if;end$$;
reset role;
set role service_role;
update public.enem_complimentary_access set status='active',expires_at=now()-interval '1 day' where user_id='77777777-7777-4777-8777-777777777777';
reset role;
set role authenticated;
do $$begin if public.enem_has_paid_access() then raise exception 'Expired courtesy accepted'; end if;end$$;
reset role;
set role anon;
do $$begin
 begin perform public.enem_access_status();raise exception 'ACCEPTED_ANONYMOUS';exception when insufficient_privilege then null;end;
end$$;
rollback;
select 'PASS: courtesy isolated, revocable, expiring, no payment, no self-grant' as result;
