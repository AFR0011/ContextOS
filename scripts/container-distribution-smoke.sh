#!/usr/bin/env bash
set -euo pipefail

compose_file="${1:-compose.production.yml}"
base_url="${APP_URL:-http://127.0.0.1:${CONTEXTOS_PORT:-3200}}"
email="${CONTEXTOS_CONTAINER_TEST_EMAIL:-container-ci@contextos.local}"
password="${CONTEXTOS_CONTAINER_TEST_PASSWORD:-container-ci-password-17}"
project="${COMPOSE_PROJECT_NAME:-contextos-container-ci}"
representative_id="release-rehearsal-area"

export COMPOSE_PROJECT_NAME="$project"
export POSTGRES_USER="${POSTGRES_USER:-contextos_ci}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-contextos_ci_db_password_17}"
export POSTGRES_DB="${POSTGRES_DB:-contextos_ci}"
export AUTH_SECRET="${AUTH_SECRET:-contextos-container-ci-auth-secret-32-characters-minimum}"
export APP_URL="$base_url"
export CONTEXTOS_PORT="${CONTEXTOS_PORT:-3200}"
export ALLOW_PUBLIC_REGISTRATION=false
export ALLOW_DEMO_RESET=false

cookies_file="/tmp/contextos-container-cookies.txt"
health_file="/tmp/contextos-container-health.json"
login_file="/tmp/contextos-container-login.json"
bootstrap_file="/tmp/contextos-container-bootstrap.json"
register_file="/tmp/contextos-container-register.json"
sync_file="/tmp/contextos-container-sync.json"

cleanup() {
  docker compose -f "$compose_file" down -v --remove-orphans >/dev/null 2>&1 || true
  rm -f "$cookies_file" "$health_file" "$login_file" "$bootstrap_file" "$register_file" "$sync_file"
}
trap cleanup EXIT

cleanup

docker compose -f "$compose_file" config >/dev/null
docker compose -f "$compose_file" build app operator migrate
docker compose -f "$compose_file" up -d app

ready=0
for _ in $(seq 1 60); do
  if curl -fsS "$base_url/api/health" >"$health_file" 2>/dev/null; then
    ready=1
    break
  fi
  sleep 1
done

if [ "$ready" -ne 1 ]; then
  docker compose -f "$compose_file" ps >&2 || true
  docker compose -f "$compose_file" logs --no-color >&2 || true
  exit 1
fi

node - "$health_file" <<'NODE'
const fs = require('fs');
const health = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (health.status !== 'ok' || health.database !== 'ok') {
  throw new Error('Container health endpoint did not report application/database ok.');
}
NODE

docker compose -f "$compose_file" exec -T app node -e "if (typeof process.getuid === 'function' && process.getuid() === 0) process.exit(1)"
docker compose -f "$compose_file" exec -T app sh -c 'test ! -e /app/scripts/account-operator.ts && test ! -d /app/prisma'

initial_user_count="$(docker compose -f "$compose_file" run -T --rm operator node -e '
const { Client } = require("pg");
(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const result = await client.query(`SELECT COUNT(*)::int AS count FROM "User"`);
  console.log(result.rows[0].count);
  await client.end();
})().catch((error) => { console.error(error); process.exit(1); });
')"
if [ "$initial_user_count" != "0" ]; then
  echo "Expected fresh production container startup to contain zero users before operator provisioning; found $initial_user_count." >&2
  exit 1
fi

register_status="$(curl -sS -o "$register_file" -w '%{http_code}' \
  -H "Origin: $base_url" \
  -H 'content-type: application/json' \
  --data-binary '{"email":"should-not-register@contextos.local","password":"container-registration-test"}' \
  "$base_url/api/auth/register")"
if [ "$register_status" != "403" ]; then
  cat "$register_file" >&2 || true
  echo "Expected closed production registration to return 403, got $register_status." >&2
  exit 1
fi

printf '%s' "$password" | docker compose -f "$compose_file" run -T --rm operator \
  npm run account:create -- "$email" --password-stdin

node - "$login_file" "$email" "$password" <<'NODE'
const fs = require('fs');
const [path, email, password] = process.argv.slice(2);
fs.writeFileSync(path, JSON.stringify({ email, password }));
NODE

curl --fail-with-body -sS \
  -c "$cookies_file" \
  -H "Origin: $base_url" \
  -H 'content-type: application/json' \
  --data-binary "@$login_file" \
  "$base_url/api/auth/login" \
  >/dev/null

curl --fail-with-body -sS \
  -b "$cookies_file" \
  "$base_url/api/bootstrap" \
  >"$bootstrap_file"

node - "$bootstrap_file" "$email" <<'NODE'
const fs = require('fs');
const [path, expectedEmail] = process.argv.slice(2);
const payload = JSON.parse(fs.readFileSync(path, 'utf8'));
if (payload?.user?.email !== expectedEmail) {
  throw new Error('Container login/bootstrap did not return the operator-created identity.');
}
const data = payload?.data;
if (!data) throw new Error('Container bootstrap did not return workspace data.');
for (const key of ['domains', 'projects', 'tasks', 'captures', 'notes', 'deadlines', 'reviews']) {
  if (!Array.isArray(data[key]) || data[key].length !== 0) {
    throw new Error(`Fresh operator-created workspace should have zero ${key}.`);
  }
}
if (!Array.isArray(data.dashboardScratchpads) || data.dashboardScratchpads.length !== 1) {
  throw new Error('Fresh operator-created workspace should have exactly one dashboard scratchpad scaffold.');
}
if (!Array.isArray(data.dashboardPreferences) || data.dashboardPreferences.length !== 1) {
  throw new Error('Fresh operator-created workspace should have exactly one dashboard preference scaffold.');
}
NODE

node - "$sync_file" "$representative_id" <<'NODE'
const fs = require('fs');
const [path, id] = process.argv.slice(2);
const now = new Date().toISOString();
fs.writeFileSync(path, JSON.stringify({
  mutations: [{
    mutationId: `release-rehearsal-${Date.now()}`,
    entityType: 'domains',
    entityId: id,
    operation: 'upsert',
    payload: {
      id,
      name: 'Release rehearsal area',
      archived: false,
      createdAt: now,
      updatedAt: now
    },
    createdAt: now
  }]
}));
NODE

curl --fail-with-body -sS \
  -b "$cookies_file" \
  -H "Origin: $base_url" \
  -H 'content-type: application/json' \
  --data-binary "@$sync_file" \
  "$base_url/api/sync" \
  >/dev/null

# Rehearse an ordinary app/database restart while preserving the named PostgreSQL volume.
docker compose -f "$compose_file" stop app database >/dev/null
docker compose -f "$compose_file" start database >/dev/null

database_ready=0
for _ in $(seq 1 60); do
  if docker compose -f "$compose_file" exec -T database pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
    database_ready=1
    break
  fi
  sleep 1
done
if [ "$database_ready" -ne 1 ]; then
  docker compose -f "$compose_file" ps >&2 || true
  docker compose -f "$compose_file" logs --no-color database >&2 || true
  exit 1
fi

docker compose -f "$compose_file" start app >/dev/null

ready=0
for _ in $(seq 1 60); do
  if curl -fsS "$base_url/api/health" >"$health_file" 2>/dev/null; then
    ready=1
    break
  fi
  sleep 1
done
if [ "$ready" -ne 1 ]; then
  docker compose -f "$compose_file" ps >&2 || true
  docker compose -f "$compose_file" logs --no-color app database >&2 || true
  exit 1
fi

curl --fail-with-body -sS \
  -b "$cookies_file" \
  "$base_url/api/bootstrap" \
  >"$bootstrap_file"

node - "$health_file" "$bootstrap_file" "$email" "$representative_id" <<'NODE'
const fs = require('fs');
const [healthPath, bootstrapPath, expectedEmail, expectedId] = process.argv.slice(2);
const health = JSON.parse(fs.readFileSync(healthPath, 'utf8'));
if (health.status !== 'ok' || health.database !== 'ok') {
  throw new Error('Container health endpoint did not recover after app/database restart.');
}
const payload = JSON.parse(fs.readFileSync(bootstrapPath, 'utf8'));
if (payload?.user?.email !== expectedEmail) {
  throw new Error('Operator-created account did not survive app/database restart.');
}
if (!payload?.data?.domains?.some((domain) => domain.id === expectedId && domain.name === 'Release rehearsal area')) {
  throw new Error('Representative synchronized workspace data did not survive app/database restart.');
}
NODE

echo "CONTEXTOS_CONTAINER_DISTRIBUTION=PASS"
echo "CONTEXTOS_CONTAINER_RESTART_PERSISTENCE=PASS"
