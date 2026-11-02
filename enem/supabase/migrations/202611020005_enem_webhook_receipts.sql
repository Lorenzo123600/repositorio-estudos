-- Delivery diagnostics only: no request bodies, credentials or personal data.
begin;
create table if not exists public.enem_webhook_receipts (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 environment text not null check(environment in ('test','production')),
 status_code integer not null check(status_code between 100 and 599),
 stage text not null,
 has_data_id boolean not null,
 has_signature boolean not null,
 has_request_id boolean not null
);
alter table public.enem_webhook_receipts enable row level security;
revoke all on public.enem_webhook_receipts from public,anon,authenticated;
grant insert,select on public.enem_webhook_receipts to service_role;
commit;
