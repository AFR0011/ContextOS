CREATE TABLE "ContextDate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "details" TEXT NOT NULL DEFAULT '',
    "projectId" TEXT,
    "domainId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContextDate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContextDate_userId_idx" ON "ContextDate"("userId");
CREATE INDEX "ContextDate_userId_date_idx" ON "ContextDate"("userId", "date");
CREATE INDEX "ContextDate_userId_projectId_idx" ON "ContextDate"("userId", "projectId");
CREATE INDEX "ContextDate_userId_domainId_idx" ON "ContextDate"("userId", "domainId");

ALTER TABLE "ContextDate"
ADD CONSTRAINT "ContextDate_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
