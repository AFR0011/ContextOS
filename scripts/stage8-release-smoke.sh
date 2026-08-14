#!/usr/bin/env bash
set -euo pipefail

app_dir="${1:?application directory is required}"
port="${2:?port is required}"
label="${3:?label is required}"

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${HOSTED_PREVIEW_TEST_PASSWORD:?HOSTED_PREVIEW_TEST_PASSWORD is required}"
: "${AUTH_SECRET:?AUTH_SECRET is required}"

log_file="/tmp/contextos-${label}.log"
health_file="/tmp/contextos-${label}-health.json"
login_file="/tmp/contextos-${label}-login.json"
cookies_file="/tmp/contextos-${label}-cookies.txt"
me_file="/tmp/contextos-${label}-me.json"
bootstrap_file="/tmp/contextos-${label}-bootstrap.json"

(
  cd "$app_dir"
  HOSTNAME=127.0.0.1 PORT="$port" NEXT_PUBLIC_APP_URL="http://127.0.0.1:$port" npm start
) >"$log_file" 2>&1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT

for attempt in $(seq 1 50); do
  if curl -fsS "http://127.0.0.1:$port/api/health" >"$health_file"; then
    break
  fi
  if ! kill -0 "$server_pid" 2>/dev/null; then
    echo "$label exited before becoming healthy." >&2
    tail -n 100 "$log_file" >&2
    exit 1
  fi
  sleep 1
done

node - "$health_file" "$login_file" <<'NODE'
const fs = require('fs');
const [healthPath, loginPath] = process.argv.slice(2);
const health = JSON.parse(fs.readFileSync(healthPath, 'utf8'));
if (health.status !== 'ok' || health.database !== 'ok') {
  throw new Error('Application/database health did not report ok.');
}
fs.writeFileSync(loginPath, JSON.stringify({
  email: 'stage8.preview@contextos.local',
  password: process.env.HOSTED_PREVIEW_TEST_PASSWORD
}));
NODE

curl --fail-with-body -sS \
  -c "$cookies_file" \
  -H 'content-type: application/json' \
  --data-binary "@$login_file" \
  "http://127.0.0.1:$port/api/auth/login" \
  >/dev/null

curl --fail-with-body -sS \
  -b "$cookies_file" \
  "http://127.0.0.1:$port/api/auth/me" \
  >"$me_file"

curl --fail-with-body -sS \
  -b "$cookies_file" \
  "http://127.0.0.1:$port/api/bootstrap" \
  >"$bootstrap_file"

node - "$me_file" "$bootstrap_file" <<'NODE'
const fs = require('fs');
const [mePath, bootstrapPath] = process.argv.slice(2);
const me = JSON.parse(fs.readFileSync(mePath, 'utf8'));
const bootstrap = JSON.parse(fs.readFileSync(bootstrapPath, 'utf8'));
const email = me?.user?.email ?? me?.email;
if (email !== 'stage8.preview@contextos.local') {
  throw new Error('Expected restored Stage 8 identity was not authenticated.');
}
const data = bootstrap?.data;
if (!data) throw new Error('Bootstrap response did not contain workspace data.');
if (!Array.isArray(data.domains) || data.domains.length < 1) throw new Error('Bootstrap has no domains.');
if (!Array.isArray(data.projects) || data.projects.length < 1) throw new Error('Bootstrap has no projects.');
if (!Array.isArray(data.tasks) || data.tasks.length < 1) throw new Error('Bootstrap has no tasks.');
NODE

kill "$server_pid" 2>/dev/null || true
wait "$server_pid" 2>/dev/null || true
trap - EXIT

echo "${label}=PASS"
