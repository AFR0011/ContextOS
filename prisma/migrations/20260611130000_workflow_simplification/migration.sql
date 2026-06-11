ALTER TABLE "Task" ADD COLUMN "scheduledTime" TEXT;

UPDATE "Task"
SET "scheduledTime" = COALESCE("startTime", "endTime");

WITH "ProjectNoteBlocks" AS (
  SELECT
    "projectId",
    string_agg(
      '<!-- imported-project-note:' || "id" || ' -->' || E'\n### ' ||
      COALESCE(NULLIF("title", ''), 'Untitled note') ||
      CASE WHEN "content" = '' THEN '' ELSE E'\n\n' || "content" END ||
      E'\n<!-- /imported-project-note:' || "id" || ' -->',
      E'\n\n' ORDER BY "createdAt", "id"
    ) AS "blocks"
  FROM "Note"
  WHERE "projectId" IS NOT NULL AND "trashedAt" IS NULL
  GROUP BY "projectId"
)
UPDATE "Project" AS project
SET "recoveryNotes" = concat_ws(
  E'\n\n',
  NULLIF(BTRIM(project."recoveryNotes"), ''),
  '## Imported project notes' || E'\n\n' || note_blocks."blocks"
)
FROM "ProjectNoteBlocks" AS note_blocks
WHERE project."id" = note_blocks."projectId";

DELETE FROM "Note" WHERE "projectId" IS NOT NULL;

ALTER TABLE "Task" DROP COLUMN "startTime";
ALTER TABLE "Task" DROP COLUMN "endTime";

DROP TABLE "Priority";
