-- C10 Audit A-06: replace client-clock conflict ordering with server-owned record revisions.
ALTER TABLE "Area" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Project" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Task" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ContextDate" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "DailyNote" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
