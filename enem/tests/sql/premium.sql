-- Isolated database fixtures, never execute on production.
reset role;
insert into public.enem_premium_resources values('private','{"secret":"exclusive"}');
insert into public.enem_entitlements(user_id,payment_id,payment_status,expires_at) values
 ('11111111-1111-4111-8111-111111111111','approved-test','approved',now()+interval '1 day');
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$begin
 if not public.enem_has_premium() then raise exception 'approved denied';end if;
 if (select count(*) from public.enem_premium_resources)<>1 then raise exception 'content denied';end if;
end$$;
select public.save_enem_premium_progress('{"activeExam":{}}',0);
do $$begin
 begin perform public.save_enem_premium_progress('{}',0);raise exception 'stale revision accepted';exception when sqlstate 'PT409' then null;end;
end$$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$begin
 if public.enem_has_premium() then raise exception 'unpaid allowed';end if;
 if (select count(*) from public.enem_premium_resources)<>0 then raise exception 'content leaked';end if;
 if (select count(*) from public.enem_premium_sessions)<>0 then raise exception 'session leaked';end if;
 if (select count(*) from public.enem_entitlements)<>0 then raise exception 'payment leaked';end if;
 begin
  insert into public.enem_entitlements values(auth.uid(),'forged','approved',now(),now()+interval '1 day');
  raise exception 'forged payment accepted';
 exception when insufficient_privilege then null;end;
 begin
  insert into public.enem_premium_sessions(user_id,data) values('11111111-1111-4111-8111-111111111111','{}');
  raise exception 'cross-user write accepted';
 exception when insufficient_privilege then null;end;
end$$;
reset role;
insert into public.enem_entitlements(user_id,payment_id,payment_status,expires_at) values
 ('22222222-2222-4222-8222-222222222222','second-paid','approved',now()+interval '1 day');
set role authenticated;
do $$begin
 if not public.enem_has_premium() then raise exception 'second user not paid';end if;
 if (select count(*) from public.enem_premium_sessions)<>0 then raise exception 'paid cross-user session leaked';end if;
 begin insert into public.enem_premium_sessions(user_id) values('11111111-1111-4111-8111-111111111111');raise exception 'paid cross-write accepted';exception when insufficient_privilege then null;end;
end$$;
reset role;
update public.enem_entitlements set starts_at=now()-interval '2 days',expires_at=now()-interval '1 day';
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$begin
 if public.enem_has_premium() then raise exception 'expired allowed';end if;
 if (select count(*) from public.enem_premium_sessions)<>0 then raise exception 'expired session visible';end if;
 if (select count(*) from public.enem_premium_resources)<>0 then raise exception 'expired content visible';end if;
end$$;
reset role;
set role anon;
do $$begin
 begin perform * from public.enem_premium_resources;raise exception 'anon allowed';exception when insufficient_privilege then null;end;
 begin perform public.enem_access();raise exception 'anon rpc allowed';exception when insufficient_privilege then null;end;
end$$;
reset role;
