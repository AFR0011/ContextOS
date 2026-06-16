DROP INDEX IF EXISTS "SyncMutation_mutationId_key";

CREATE UNIQUE INDEX "SyncMutation_userId_mutationId_key" ON "SyncMutation"("userId", "mutationId");
