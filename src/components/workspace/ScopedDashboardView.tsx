"use client";

import { Dashboard2View } from "@/components/workspace/Dashboard2";
import { useWorkspace } from "@/lib/client-store";

const VIEW_STORAGE_PREFIX = "contextos-dashboard-command-page-view";

export function ScopedDashboardView() {
  const { data } = useWorkspace();
  const preferenceId = data.dashboardPreferences[0]?.id ?? null;

  if (!preferenceId) {
    return (
      <div className="cos-page">
        <div className="cos-surface p-4 text-sm text-[var(--cos-text-muted)]">Loading your Dashboard view...</div>
      </div>
    );
  }

  const storageKey = `${VIEW_STORAGE_PREFIX}:${preferenceId}`;
  return <Dashboard2View key={storageKey} viewStorageKey={storageKey} />;
}
