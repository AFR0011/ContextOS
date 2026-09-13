"use client";

import { useEffect, useState } from "react";
import { Dashboard2View } from "@/components/workspace/Dashboard2";
import { useWorkspace } from "@/lib/client-store";

const LEGACY_VIEW_KEY = "contextos-dashboard-command-page-view";
const VIEW_OWNER_KEY = `${LEGACY_VIEW_KEY}:owner`;

function scopedViewKey(preferenceId: string) {
  return `${LEGACY_VIEW_KEY}:${preferenceId}`;
}

export function ScopedDashboardView() {
  const { data } = useWorkspace();
  const preferenceId = data.dashboardPreferences[0]?.id ?? null;
  const [readyPreferenceId, setReadyPreferenceId] = useState<string | null>(null);

  useEffect(() => {
    if (!preferenceId) {
      setReadyPreferenceId(null);
      return;
    }

    const scopedKey = scopedViewKey(preferenceId);
    const previousOwner = window.localStorage.getItem(VIEW_OWNER_KEY);
    const bridgeValue = window.localStorage.getItem(LEGACY_VIEW_KEY);

    // The legacy key is retained only as the bridge used by Dashboard2View. It is
    // never trusted unless we know it belongs to this exact user-owned preference
    // record. This prevents account B from inheriting account A's Dashboard view.
    if (previousOwner === preferenceId && bridgeValue) {
      window.localStorage.setItem(scopedKey, bridgeValue);
    }

    const scopedValue = window.localStorage.getItem(scopedKey);
    if (scopedValue) window.localStorage.setItem(LEGACY_VIEW_KEY, scopedValue);
    else window.localStorage.removeItem(LEGACY_VIEW_KEY);
    window.localStorage.setItem(VIEW_OWNER_KEY, preferenceId);
    setReadyPreferenceId(preferenceId);

    const persistCurrentView = () => {
      if (window.localStorage.getItem(VIEW_OWNER_KEY) !== preferenceId) return;
      const currentValue = window.localStorage.getItem(LEGACY_VIEW_KEY);
      if (currentValue) window.localStorage.setItem(scopedKey, currentValue);
      else window.localStorage.removeItem(scopedKey);
    };

    window.addEventListener("pagehide", persistCurrentView);
    return () => {
      persistCurrentView();
      window.removeEventListener("pagehide", persistCurrentView);
    };
  }, [preferenceId]);

  if (!preferenceId || readyPreferenceId !== preferenceId) {
    return (
      <div className="cos-page">
        <div className="cos-surface p-4 text-sm text-[var(--cos-text-muted)]">Loading your Dashboard view...</div>
      </div>
    );
  }

  return <Dashboard2View key={preferenceId} />;
}
