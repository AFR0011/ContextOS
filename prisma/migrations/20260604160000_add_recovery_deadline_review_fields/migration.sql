-- Add project recovery notes, optional deadline metadata, and review prompt dismissal state.
ALTER TABLE "Project" ADD COLUMN "recoveryNotes" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Deadline" ADD COLUMN "time" TEXT;
ALTER TABLE "Deadline" ADD COLUMN "location" TEXT NOT NULL DEFAULT '';

ALTER TABLE "DashboardPreference" ADD COLUMN "reviewPromptDismissals" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
