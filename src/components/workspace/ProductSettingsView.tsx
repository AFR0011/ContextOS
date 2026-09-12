"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Download, Plus, RefreshCw } from "lucide-react";
import { useWorkspace } from "@/lib/client-store";
import type { Domain } from "@/lib/types";

function formatSyncTimestamp(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}

function SyncMetric({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="rounded-lg bg-[var(--cos-bg-soft)] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--cos-text-subtle)]">{label}</p>
      <p data-testid={testId ?? (label === "Pending" ? "pending-count" : undefined)} className="mt-1 text-sm font-semibold text-[var(--cos-text)]">{value}</p>
    </div>
  );
}

function AreaSettingsRow({ domain, onUpdate }: { domain: Domain; onUpdate: (updates: Partial<Domain>) => void }) {
  const [name, setName] = useState(domain.name);

  useEffect(() => {
    setName(domain.name);
  }, [domain.name]);

  function commitName() {
    const next = name.trim();
    if (!next) {
      setName(domain.name);
      return;
    }
    if (next !== domain.name) onUpdate({ name: next });
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
      <input
        aria-label={`Area name ${domain.name}`}
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={commitName}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") setName(domain.name);
        }}
        className="cos-input min-h-10 min-w-0 flex-1 px-3 py-2 text-sm"
      />
      <button type="button" onClick={() => onUpdate({ archived: !domain.archived })} className="cos-btn cos-btn-ghost min-h-10 px-3 py-2 text-xs">
        {domain.archived ? "Restore" : "Archive"}
      </button>
    </div>
  );
}

export function ProductSettingsView() {
  const { data, sync, syncNow, forceRefreshFromServer, addDomain, updateDomain } = useWorkspace();
  const [newArea, setNewArea] = useState("");
  const canRefreshFromServer = Boolean(sync.online && !sync.refreshing && !sync.syncing && sync.pendingCount === 0);
  const refreshTitle = sync.pendingCount > 0 ? "Sync pending changes before refreshing" : sync.online ? "Refresh workspace from server" : "Refresh unavailable while offline";

  function createArea() {
    const name = newArea.trim();
    if (!name) return;
    addDomain(name);
    setNewArea("");
  }

  return (
    <div className="cos-page">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--cos-text-strong)]">Settings</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--cos-text-muted)]">Areas and workspace sync state.</p>
      </div>

      <section className="cos-surface p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cos-text-muted)]">Sync</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SyncMetric label="Status" value={sync.syncing ? "Syncing" : sync.online ? "Online" : "Offline"} testId="sync-status" />
          <SyncMetric label="Pending" value={String(sync.pendingCount)} />
          <SyncMetric label="Last synced" value={formatSyncTimestamp(sync.lastSyncedAt)} />
          <SyncMetric label="Last refresh" value={formatSyncTimestamp(sync.lastRefreshAt)} />
          <SyncMetric label="Stale warnings" value={String(sync.staleMutationCount)} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => void syncNow()} disabled={!sync.online || sync.syncing} className="cos-btn cos-btn-primary px-4 py-2 text-sm disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${sync.syncing ? "animate-spin" : ""}`} />
            {sync.syncing ? "Syncing..." : "Sync now"}
          </button>
          <button
            type="button"
            data-testid="settings-refresh-from-server"
            onClick={() => void forceRefreshFromServer()}
            disabled={!canRefreshFromServer}
            title={refreshTitle}
            className="cos-btn cos-btn-secondary px-4 py-2 text-sm disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {sync.refreshing ? "Refreshing..." : "Refresh from server"}
          </button>
        </div>
        {!sync.online ? <p className="mt-3 rounded-lg border border-[var(--cos-warning-border)] bg-[var(--cos-warning-soft)] px-3 py-2 text-sm text-[var(--cos-warning-text)]">Offline. Edits are saved locally and will sync when the connection returns.</p> : null}
        {sync.error ? (
          <p data-testid="sync-error" className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--cos-danger-border)] bg-[var(--cos-danger-soft)] px-3 py-2 text-sm text-[var(--cos-danger-text)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{sync.error}{sync.lastErrorAt ? ` Last error: ${formatSyncTimestamp(sync.lastErrorAt)}.` : ""}</span>
          </p>
        ) : null}
        {sync.lastWarning ? (
          <p data-testid="sync-warning" className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--cos-warning-border)] bg-[var(--cos-warning-soft)] px-3 py-2 text-sm text-[var(--cos-warning-text)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{sync.lastWarning}{sync.lastWarningAt ? ` Last warning: ${formatSyncTimestamp(sync.lastWarningAt)}.` : ""}</span>
          </p>
        ) : null}
      </section>

      <section className="cos-surface mt-6 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cos-text-muted)]">Areas</h2>
        <p className="mt-2 text-sm text-[var(--cos-text-muted)]">Areas are stable responsibilities or domains that organize Projects and Resources.</p>
        <div className="mt-3 divide-y divide-[var(--cos-border-soft)] rounded-lg border border-[var(--cos-border-soft)]">
          {data.domains.map((domain) => (
            <AreaSettingsRow key={domain.id} domain={domain} onUpdate={(updates) => updateDomain(domain.id, updates)} />
          ))}
          <form
            className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center"
            onSubmit={(event) => {
              event.preventDefault();
              createArea();
            }}
          >
            <input value={newArea} onChange={(event) => setNewArea(event.target.value)} placeholder="Add Area..." aria-label="Add Area" className="cos-input min-h-10 min-w-0 flex-1 px-3 py-2 text-sm" />
            <button type="submit" disabled={!newArea.trim()} className="cos-btn cos-btn-primary min-h-10 px-3 py-2 text-sm disabled:opacity-50"><Plus className="h-4 w-4" /> Add Area</button>
          </form>
        </div>
      </section>
    </div>
  );
}
