# Stage 8.4 verification: provider-neutral database backup and restore

Date: 2026-08-14

## Scope

Stage 8.4 rehearsed a provider-neutral PostgreSQL backup and restore using only the dedicated non-production Neon branch `contextos-stage8-preview` (`br-steep-heart-agxfhkxb`). Production was not queried or modified.

Source database: `neondb` on the Stage 8 preview branch.

Restore target: `stage8_restore_20260814`, created empty on the same isolated preview branch. Before each full rehearsal attempt its `public` schema was verified empty.

The procedure uses PostgreSQL-native `pg_dump`, `pg_restore`, and `psql` through a PostgreSQL 18 container. Credential-bearing connection strings are supplied only through GitHub Actions secrets and are not committed to the repository or emitted in evidence.

## Final successful run

- Restore workflow: GitHub Actions run `31787773777`
- Verified commit: `c84d6e7e3d9afded98454aea669824e32e2cf3e2`
- Ordinary regression CI on the same commit: run `31787773837`, success
- Source PostgreSQL: Neon PostgreSQL 18.4
- Backup client: PostgreSQL 18.6

The provider-neutral restore step produced `STAGE8_DB_RESTORE=PASS`. It restored the complete public table set and compared exact row counts between source and restored target before application startup:

| Table | Verified rows |
| --- | ---: |
| Capture | 29 |
| DashboardPreference | 2 |
| DashboardScratchpad | 2 |
| Deadline | 20 |
| Domain | 9 |
| Note | 5 |
| Project | 36 |
| Review | 6 |
| Session | 13 |
| SyncMutation | 1278 |
| Task | 82 |
| User | 2 |
| _prisma_migrations | 8 |

The restored database also contained the Stage 8 preview test identity exactly once and retained project data for that identity.

## Application-level recovery verification

After PostgreSQL restore verification passed, the same workflow:

1. installed the repository dependencies with Prisma configured against the restored database;
2. generated a fresh ephemeral local `AUTH_SECRET`;
3. built the optimized ContextOS production application against the restored database;
4. started the production server locally;
5. required `/api/health` to report application and database health;
6. authenticated `stage8.preview@contextos.local` using the existing preview-only test secret;
7. verified `/api/auth/me` returned that restored identity; and
8. verified authenticated `/api/bootstrap` returned restored domain, project, task, and dashboard scratchpad data.

The workflow produced `STAGE8_RESTORED_BOOTSTRAP=PASS`.

Therefore `DB-RESTORE-001` and `DB-RESTORE-002` pass.

## Defects found during rehearsal

The rehearsal exposed two test-harness defects before the final green run:

1. The first restore succeeded, but the row-count verifier used unqualified quoted table names. Neon direct sessions did not reliably resolve the intended `public` schema, so the verifier failed on `"Capture"`. The script was corrected to schema-qualify every table as `public."<table>"`. Direct checks confirmed both source and restored `public."Capture"` contained 29 rows.
2. The second restore passed completely, but `npm ci` failed because repository `postinstall` runs `prisma generate`, whose configuration requires `DATABASE_URL`. The restored database URL was then supplied to the dependency-install step as well as the build/runtime steps.

Both defects were in the recovery harness. Neither indicated data loss or a failed PostgreSQL restore.

## Provider-native boundary

`DB-NATIVE-001` remains `blocked-external`. Stage 8.4 required the provider-neutral PostgreSQL procedure above. A Neon-native snapshot/branch/PITR rehearsal is optional and was not substituted for `pg_dump`/`pg_restore` evidence.

## Result

Stage 8.4 is closed for the required provider-neutral recovery scope. The restored database is intentionally retained for Stage 8.5 rollback rehearsal until that stage no longer needs it.
