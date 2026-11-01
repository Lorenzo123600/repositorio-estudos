#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
docker_cmd=(env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock)
container="enem-sql-test-${RANDOM}-$$"
trap '"${docker_cmd[@]}" rm -f "$container" >/dev/null 2>&1 || true' EXIT
"${docker_cmd[@]}" run --rm -d --name "$container" --network none -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine >/dev/null
for attempt in {1..30}; do
 if "${docker_cmd[@]}" exec "$container" pg_isready -U postgres >/dev/null 2>&1;then break;fi
 sleep 1
done
psql_cmd=("${docker_cmd[@]}" exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1)
"${psql_cmd[@]}" < tests/sql/bootstrap.sql
"${psql_cmd[@]}" < supabase/schema.sql
"${psql_cmd[@]}" < supabase/schema.sql
"${psql_cmd[@]}" < tests/sql/isolation.sql
