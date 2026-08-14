#!/usr/bin/env bash
set -euo pipefail

: "${SOURCE_DATABASE_URL:?SOURCE_DATABASE_URL is required}"
: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL is required}"

if [[ "$SOURCE_DATABASE_URL" == "$RESTORE_DATABASE_URL" ]]; then
  echo "Refusing to restore into the source database." >&2
  exit 1
fi

for binary in pg_dump pg_restore psql; do
  command -v "$binary" >/dev/null 2>&1 || {
    echo "Required PostgreSQL client binary is missing: $binary" >&2
    exit 1
  }
done

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

dump_file="$workdir/contextos-stage8.dump"
source_tables="$workdir/source-tables.txt"
restore_tables="$workdir/restore-tables.txt"

server_version="$(psql "$SOURCE_DATABASE_URL" -X -A -t -v ON_ERROR_STOP=1 -c 'SHOW server_version;')"
client_version="$(pg_dump --version)"
echo "Source PostgreSQL server: $server_version"
echo "Backup client: $client_version"

restore_table_count="$(psql "$RESTORE_DATABASE_URL" -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM pg_tables WHERE schemaname = 'public';")"
if [[ "$restore_table_count" != "0" ]]; then
  echo "Refusing to restore into a non-empty public schema ($restore_table_count tables found)." >&2
  exit 1
fi

psql "$SOURCE_DATABASE_URL" -X -A -t -v ON_ERROR_STOP=1 \
  -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" > "$source_tables"

if [[ ! -s "$source_tables" ]]; then
  echo "Source database has no public tables." >&2
  exit 1
fi

pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$dump_file" \
  "$SOURCE_DATABASE_URL"

pg_restore --list "$dump_file" >/dev/null

pg_restore \
  --exit-on-error \
  --no-owner \
  --no-privileges \
  --dbname="$RESTORE_DATABASE_URL" \
  "$dump_file"

psql "$RESTORE_DATABASE_URL" -X -A -t -v ON_ERROR_STOP=1 \
  -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" > "$restore_tables"

diff -u "$source_tables" "$restore_tables"

while IFS= read -r table; do
  [[ -z "$table" ]] && continue
  escaped_table="${table//\"/\"\"}"
  source_count="$(psql "$SOURCE_DATABASE_URL" -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM \"$escaped_table\";")"
  restore_count="$(psql "$RESTORE_DATABASE_URL" -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM \"$escaped_table\";")"
  if [[ "$source_count" != "$restore_count" ]]; then
    echo "Row-count mismatch for $table: source=$source_count restore=$restore_count" >&2
    exit 1
  fi
  printf 'verified %-28s %s rows\n' "$table" "$source_count"
done < "$source_tables"

fixture_count="$(psql "$RESTORE_DATABASE_URL" -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM \"User\" WHERE email = 'stage8.preview@contextos.local';")"
if [[ "$fixture_count" != "1" ]]; then
  echo "Restored Stage 8 preview identity was not found exactly once." >&2
  exit 1
fi

project_count="$(psql "$RESTORE_DATABASE_URL" -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM \"Project\" p JOIN \"User\" u ON u.id = p.\"userId\" WHERE u.email = 'stage8.preview@contextos.local';")"
if [[ "$project_count" -lt 1 ]]; then
  echo "Restored Stage 8 preview identity has no project data." >&2
  exit 1
fi

echo "STAGE8_DB_RESTORE=PASS"
