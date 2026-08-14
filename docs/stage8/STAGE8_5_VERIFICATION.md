# Stage 8.5 verification: release-pair migration and rollback

Date: 2026-08-14

## Release pair

The previous application release is the Stage 7 production merge commit:

- Stage 7 application: `7efe1909b1369fde702342b75009e115218295d3`

The Stage 8 rehearsal was triggered from:

- Stage 8 application candidate: `9d7372e061cc836faa4c8263b2faecc1e29484dd`
- Release-pair rehearsal run: `31788424132`
- Ordinary regression CI on the same commit: `31788424095`, success

The database target was the disposable restored database `stage8_restore_20260814` on the dedicated non-production Neon preview branch. Production was not used.

## Database migration state

Git comparison from Stage 7 to Stage 8 found no changes to `prisma/schema.prisma` or `prisma/migrations/*`. The database therefore has the same committed migration state for both application releases.

The rehearsal recorded the migration ledger before the Stage 8 deployment step. Eight migrations were applied:

1. `20260603073122_init`
2. `20260603170000_add_project_parent`
3. `20260604090000_dashboard_command_sheet`
4. `20260604160000_add_recovery_deadline_review_fields`
5. `20260605160000_add_task_time_range`
6. `20260611130000_workflow_simplification`
7. `20260616090000_user_scoped_sync_mutations`
8. `20260616133000_dashboard_task_sort_mode`

Stage 8 then ran `npm run db:deploy` against the disposable database. Prisma found the same eight migrations and reported `No pending migrations to apply.`

A second migration-ledger snapshot, including migration names, checksums, and applied state, was compared byte-for-byte with the pre-deploy snapshot. The workflow produced:

`STAGE8_MIGRATION_LEDGER_UNCHANGED=PASS`

This is a verified forward-safe no-op for this release pair. It is not evidence of reversible Prisma migrations.

## Application compatibility sequence

The rehearsal used the same recovered database throughout the following sequence:

1. Built the exact Stage 7 application and verified health, authentication, identity lookup, and authenticated bootstrap.
   - `STAGE8_STAGE7_BEFORE_UPGRADE=PASS`
2. Ran the Stage 8 migration deployment step and verified the migration ledger remained unchanged.
3. Built the Stage 8 candidate and verified the same health/authentication/bootstrap path.
   - `STAGE8_STAGE8_AFTER_UPGRADE=PASS`
4. Rolled the application back to the exact Stage 7 build while leaving the database in the post-Stage-8-deploy state.
5. Verified the Stage 7 application again through health, authentication, identity lookup, and authenticated bootstrap.
   - `STAGE8_STAGE7_AFTER_ROLLBACK=PASS`

The workflow then produced:

- `STAGE8_RELEASE_UPGRADE=PASS`
- `STAGE8_APP_ONLY_ROLLBACK=PASS`

## Compatibility result

Application-only rollback from Stage 8 to Stage 7 is safe for this specific release pair because Stage 8 introduced no schema migration and the exact Stage 7 application was demonstrated to operate correctly against the post-deploy database.

The rollback procedure for this pair is therefore:

1. stop/pause further Stage 8 promotion if a release failure is detected;
2. do not attempt a reverse Prisma migration, because no reverse migration exists or is required here;
3. redeploy the verified Stage 7 application commit while leaving the database at the unchanged eight-migration state;
4. verify application/database health, authentication, and workspace bootstrap;
5. if a future release pair changes schema and the previous application is not compatible with the upgraded database, use the provider-neutral backup/restore recovery procedure verified in Stage 8.4 to restore a compatible pre-upgrade database into a clean target before rolling the previous application onto it.

## Backup/restore fallback

The database-restore fallback was already exercised independently in Stage 8.4, run `31787773777`, including exact table/row-count comparison and authenticated ContextOS bootstrap after restore. It was not invoked as part of this release-pair rollback because the Stage 7 application proved compatible with the unchanged Stage 8 database state.

This means the fallback capability is tested, while the Stage 8.5 record remains explicit that it was not needed for this compatible pair.

## Result

- `ROLLBACK-001`: passed. Stage 7-compatible application/database state was exercised, followed by the Stage 8 migration deployment and application verification on disposable infrastructure.
- `ROLLBACK-002`: passed. Stage 7 application-only rollback against the post-Stage-8-deploy database was explicitly demonstrated.
- `ROLLBACK-003`: fallback capability passed through the Stage 8.4 provider-neutral restore rehearsal; it was not invoked by an incompatibility in this release pair because app-only rollback was compatible.

Stage 8.5 is complete for the Stage 7 to Stage 8 release pair.
