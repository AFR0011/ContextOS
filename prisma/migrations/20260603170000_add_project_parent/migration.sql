-- Add nullable self-nesting support for project subcontexts.
ALTER TABLE "Project" ADD COLUMN "parentProjectId" TEXT;

CREATE INDEX "Project_userId_parentProjectId_idx" ON "Project"("userId", "parentProjectId");
