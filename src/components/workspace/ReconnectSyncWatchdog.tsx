"use client";

import { useEffect } from "react";
import { useWorkspace } from "@/lib/client-store";

const RECONNECT_WATCHDOG_MS = 3_000;

export default function ReconnectSyncWatchdog() {
  const { sync, syncNow } = useWorkspace();

  useEffect(() => {
    if (sync.pendingCount <= 0 || typeof window === "undefined") return;

    const tryPendingSync = () => {
      if (navigator.onLine) void syncNow();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") tryPendingSync();
    };

    const interval = window.setInterval(tryPendingSync, RECONNECT_WATCHDOG_MS);
    window.addEventListener("focus", tryPendingSync);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cover the case where pendingCount becomes non-zero just after connectivity
    // has already returned, so no new browser `online` event will be emitted.
    tryPendingSync();

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", tryPendingSync);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sync.pendingCount, syncNow]);

  return null;
}
