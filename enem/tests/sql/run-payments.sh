#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
docker_cmd=(env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock)
container="enem-payment-test-${RANDOM}-$$"
cleanup(){
 status=$?
 if [ "$status" -ne 0 ]; then "${docker_cmd[@]}" logs "$container" >&2 || true; fi
 "${docker_cmd[@]}" rm -f "$container" >/dev/null 2>&1 || true
}
trap cleanup EXIT
"${docker_cmd[@]}" run --rm -d --name "$container" --network none -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine >/dev/null
ready=false
for attempt in {1..30}; do
 if "${docker_cmd[@]}" exec "$container" sh -c 'test "$(cat /proc/1/comm)" = postgres && pg_isready -U postgres' >/dev/null 2>&1; then ready=true; break; fi
 sleep 1
done
if [ "$ready" != true ]; then echo "PostgreSQL não ficou pronto" >&2; exit 1; fi
psql_cmd=("${docker_cmd[@]}" exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1)
"${psql_cmd[@]}" < tests/sql/bootstrap.sql
"${psql_cmd[@]}" -c 'create role service_role nologin bypassrls; grant usage on schema public,auth to service_role;'
"${psql_cmd[@]}" < supabase/schema.sql
for migration in supabase/migrations/*.sql; do
 "${psql_cmd[@]}" < "$migration"
done
"${psql_cmd[@]}" < tests/sql/payments.sql
"${psql_cmd[@]}" < tests/sql/complimentary.sql
"${psql_cmd[@]}" < tests/sql/isolation.sql
