-- Dashboard 2.0 mobile command sheet persistence.
CREATE TABLE "DashboardScratchpad" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardScratchpad_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DashboardPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sectionOrder" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "collapsedSections" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dateWindowDays" INTEGER NOT NULL DEFAULT 14,
    "showCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DashboardScratchpad_userId_key" ON "DashboardScratchpad"("userId");
CREATE INDEX "DashboardScratchpad_userId_idx" ON "DashboardScratchpad"("userId");

CREATE UNIQUE INDEX "DashboardPreference_userId_key" ON "DashboardPreference"("userId");
CREATE INDEX "DashboardPreference_userId_idx" ON "DashboardPreference"("userId");

ALTER TABLE "DashboardScratchpad" ADD CONSTRAINT "DashboardScratchpad_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DashboardPreference" ADD CONSTRAINT "DashboardPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
