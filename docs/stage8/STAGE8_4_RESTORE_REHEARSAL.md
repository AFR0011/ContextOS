# Stage 8.4 PostgreSQL Backup and Restore Rehearsal

## Scope

Stage 8.4 verifies provider-neutral logical PostgreSQL recovery before any optional provider-native recovery exercise.

The source is the isolated Stage 8 preview database on Neon branch `br-steep-heart-agxfhkxb`. The restore target is the empty database `stage8_restore_20260814` on the same isolated non-production branch. Production is not used as either source or target.

## Repository tooling

- `scripts/stage8-db-backup-restore.sh` performs a custom-format `pg_dump`, verifies the archive, restores it with `pg_restore`, compares the public table set, compares exact row counts for every restored public table, and verifies the Stage 8 preview fixture exists after restore.
- `.github/workflows/stage8-db-restore.yml` runs the logical recovery rehearsal with PostgreSQL 18 tooling, builds ContextOS against the restored database, starts the production build locally, authenticates the preview-only Stage 8 test identity, and requires `/api/bootstrap` to return usable workspace data.

The dump file is temporary and is deleted at the end of the restore script. It is not uploaded as a workflow artifact.

## Required GitHub Actions secrets

The workflow requires these repository secrets:

- `STAGE8_BACKUP_SOURCE_DATABASE_URL`: direct PostgreSQL connection URL for database `neondb` on branch `br-steep-heart-agxfhkxb`.
- `STAGE8_BACKUP_RESTORE_DATABASE_URL`: direct PostgreSQL connection URL for database `stage8_restore_20260814` on branch `br-steep-heart-agxfhkxb`.
- `HOSTED_PREVIEW_TEST_PASSWORD`: the existing Stage 8 preview-only test password secret already used for hosted verification.

No database URL or password belongs in source control, workflow inputs, workflow logs, or this document.

## Acceptance

`DB-RESTORE-001` passes only if the restore target is empty before the rehearsal, the logical dump restores successfully, the restored public table set matches the source, and every public table has the same row count before application access mutates the restored database.

`DB-RESTORE-002` passes only if the production ContextOS build can start against the restored database, `/api/health` reports the database healthy, the restored Stage 8 test identity can authenticate, and authenticated `/api/bootstrap` returns domains, projects, tasks, and dashboard scratchpad state.

The provider-native recovery item remains separate and optional until explicitly exercised against non-production infrastructure.
