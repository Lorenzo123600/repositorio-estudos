set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$begin
 if public.load_study_progress() <> '{"state":null,"revision":0}'::jsonb then raise exception 'Initial state invalid';end if;
 if public.save_study_progress('{"essay":"Texto A"}',0) <> '{"revision":1}'::jsonb then raise exception 'Save invalid';end if;
 begin perform public.save_study_progress('{"essay":"Stale"}',0);raise exception 'Stale write was accepted';exception when sqlstate 'PT409' then null;end;
 begin perform public.save_study_progress('[]',1);raise exception 'Array state was accepted';exception when invalid_parameter_value then null;end;
 if public.load_study_progress()->'state'->>'essay' <> 'Texto A' then raise exception 'State overwritten';end if;
end$$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$begin
 if (select count(*) from public.study_progress) <> 0 then raise exception 'RLS leaked another account';end if;
 if public.load_study_progress()->'state' <> 'null'::jsonb then raise exception 'RPC leaked another account';end if;
 begin insert into public.study_progress(user_id) values('11111111-1111-4111-8111-111111111111');raise exception 'Cross-account insert was accepted';exception when insufficient_privilege then null;end;
 update public.study_progress set data='{"essay":"Attacker"}' where user_id='11111111-1111-4111-8111-111111111111';
 if found then raise exception 'Cross-account update was accepted';end if;
 perform public.save_study_progress('{"essay":"Texto B"}',0);
end$$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$begin
 if public.load_study_progress()->'state'->>'essay' <> 'Texto A' then raise exception 'Account A was changed';end if;
end$$;
reset role;
set role anon;
do $$begin
 begin perform public.load_study_progress();raise exception 'Anonymous RPC accepted';exception when insufficient_privilege then null;end;
 begin perform * from public.study_progress;raise exception 'Anonymous read accepted';exception when insufficient_privilege then null;end;
end$$;
reset role;
select 'PASS: RLS, anonymous denial, isolation, validation and revision conflicts' as result;
