-- C8 canonical persistence migration.
-- The product currently has no real users, but canonicalizable rows are retained
-- where their meaning is deterministic. Retired/ambiguous data is discarded.

-- Retire product concepts that no longer exist.
DROP TABLE IF EXISTS "Capture" CASCADE;
DROP TABLE IF EXISTS "Note" CASCADE;
DROP TABLE IF EXISTS "Deadline" CASCADE;
DROP TABLE IF EXISTS "Review" CASCADE;
DROP TABLE IF EXISTS "DashboardScratchpad" CASCADE;
DROP TABLE IF EXISTS "DashboardPreference" CASCADE;

-- Domain -> Area.
ALTER TABLE "Domain" RENAME TO "Area";
ALTER TABLE "Area" RENAME CONSTRAINT "Domain_userId_fkey" TO "Area_userId_fkey";
DROP INDEX IF EXISTS "Domain_userId_idx";
DROP INDEX IF EXISTS "Domain_userId_archived_idx";
ALTER TABLE "Area" ADD COLUMN "state" TEXT NOT NULL DEFAULT 'active';
UPDATE "Area" SET "state" = CASE WHEN "archived" THEN 'archived' ELSE 'active' END;
ALTER TABLE "Area" DROP COLUMN "archived";
CREATE INDEX "Area_userId_idx" ON "Area"("userId");
CREATE INDEX "Area_userId_state_idx" ON "Area"("userId", "state");
ALTER TABLE "Area" ADD CONSTRAINT "Area_state_check" CHECK ("state" IN ('active', 'archived'));

-- Remove Projects that the clean-break adapter would already discard.
DELETE FROM "Project"
WHERE "trashedAt" IS NOT NULL
   OR "domainId" NOT IN (SELECT "id" FROM "Area");

DROP INDEX IF EXISTS "Project_userId_parentProjectId_idx";
DROP INDEX IF EXISTS "Project_userId_status_idx";
ALTER TABLE "Project" RENAME COLUMN "domainId" TO "areaId";
ALTER TABLE "Project" RENAME COLUMN "currentObjective" TO "objective";
ALTER TABLE "Project" ADD COLUMN "state" TEXT NOT NULL DEFAULT 'active';
UPDATE "Project"
SET "state" = CASE
  WHEN "archivedAt" IS NOT NULL OR "status" IN ('done', 'archived') THEN 'archived'
  ELSE 'active'
END;
ALTER TABLE "Project"
  DROP COLUMN "parentProjectId",
  DROP COLUMN "status",
  DROP COLUMN "nextAction",
  DROP COLUMN "latestStatus",
  DROP COLUMN "recoveryNotes",
  DROP COLUMN "openLoops",
  DROP COLUMN "archivedAt",
  DROP COLUMN "trashedAt";
CREATE INDEX "Project_userId_areaId_idx" ON "Project"("userId", "areaId");
CREATE INDEX "Project_userId_state_idx" ON "Project"("userId", "state");
ALTER TABLE "Project" ADD CONSTRAINT "Project_state_check" CHECK ("state" IN ('active', 'archived'));

-- Keep only canonical surviving Tasks.
DELETE FROM "Task"
WHERE "archivedAt" IS NOT NULL
   OR "trashedAt" IS NOT NULL
   OR ("projectId" IS NOT NULL AND "projectId" NOT IN (SELECT "id" FROM "Project"))
   OR ("projectId" IS NULL AND ("domainId" IS NULL OR "domainId" NOT IN (SELECT "id" FROM "Area")));

DROP INDEX IF EXISTS "Task_userId_status_idx";
DROP INDEX IF EXISTS "Task_userId_dueDate_idx";
ALTER TABLE "Task" RENAME COLUMN "domainId" TO "areaId";
ALTER TABLE "Task" ADD COLUMN "state" TEXT NOT NULL DEFAULT 'open';
UPDATE "Task" SET "state" = CASE WHEN "status" = 'done' THEN 'done' ELSE 'open' END;
UPDATE "Task" SET "areaId" = NULL WHERE "projectId" IS NOT NULL;
UPDATE "Task" SET "scheduledTime" = NULL WHERE "plannedDate" IS NULL;
ALTER TABLE "Task"
  DROP COLUMN "dueDate",
  DROP COLUMN "status",
  DROP COLUMN "archivedAt",
  DROP COLUMN "trashedAt";
CREATE INDEX "Task_userId_state_idx" ON "Task"("userId", "state");
CREATE INDEX "Task_userId_projectId_idx" ON "Task"("userId", "projectId");
CREATE INDEX "Task_userId_areaId_idx" ON "Task"("userId", "areaId");
ALTER TABLE "Task" ADD CONSTRAINT "Task_state_check" CHECK ("state" IN ('open', 'done'));
ALTER TABLE "Task" ADD CONSTRAINT "Task_exactly_one_parent_check"
  CHECK ((("projectId" IS NOT NULL)::int + ("areaId" IS NOT NULL)::int) = 1);

-- Canonical Dates keep only valid exactly-one-parent rows.
ALTER TABLE "ContextDate" RENAME COLUMN "domainId" TO "areaId";
DELETE FROM "ContextDate"
WHERE (("projectId" IS NOT NULL)::int + ("areaId" IS NOT NULL)::int) <> 1
   OR ("projectId" IS NOT NULL AND "projectId" NOT IN (SELECT "id" FROM "Project"))
   OR ("areaId" IS NOT NULL AND "areaId" NOT IN (SELECT "id" FROM "Area"));
DROP INDEX IF EXISTS "ContextDate_userId_domainId_idx";
CREATE INDEX "ContextDate_userId_areaId_idx" ON "ContextDate"("userId", "areaId");

-- Old mutation payloads no longer describe the canonical schema.
DELETE FROM "SyncMutation";
