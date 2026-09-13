"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Download, FileJson, FileText, Plus, RefreshCw, Upload } from "lucide-react";
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

function AreaSettingsRow({ domain, online, onUpdate }: { domain: Domain; online: boolean; onUpdate: (updates: Partial<Domain>) => void }) {
  const [name, setName] = useState(domain.name);

  useEffect(() => {
    setName(domain.name);
  }, [domain.name]);

  const dirty = name !== domain.name;

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
      <div className="min-w-0 flex-1">
        <input
          aria-label={`Area name ${domain.name}`}
          placeholder="Area name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={commitName}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") setName(domain.name);
          }}
          className="cos-input min-h-10 w-full px-3 py-2 text-sm"
        />
        {dirty ? (
          <div className="mt-1 flex flex-wrap items-center justify-end gap-2 text-[11px]">
            <span className="text-[var(--cos-warning-text)]">Unsaved changes</span>
            {!online ? <span data-testid="offline-edit-warning" className="cos-pill cos-pill-warning">Offline: save will queue</span> : null}
          </div>
        ) : null}
      </div>
      <button type="button" onClick={() => onUpdate({ archived: !domain.archived })} className="cos-btn cos-btn-ghost min-h-10 px-3 py-2 text-xs">
        {domain.archived ? "Restore" : "Archive"}
      </button>
    </div>
  );
}

type ImportMode = "replace" | "merge";
type ImportPreview = {
  format: string;
  version: number;
  exportedAt: string;
  mode: ImportMode;
  counts: Record<string, number>;
  semantics: string;
};

export function ProductSettingsView() {
  const { data, sync, syncNow, forceRefreshFromServer, addDomain, updateDomain } = useWorkspace();
  const [newArea, setNewArea] = useState("");
  const [importBundle, setImportBundle] = useState<unknown | null>(null);
  const [importFileName, setImportFileName] = useState("");
  const [importMode, setImportMode] = useState<ImportMode>("replace");
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importConfirmation, setImportConfirmation] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const canRefreshFromServer = Boolean(sync.online && !sync.refreshing && !sync.syncing && sync.pendingCount === 0);
  const canExport = Boolean(sync.online && !sync.refreshing && !sync.syncing && sync.pendingCount === 0);
  const refreshTitle = sync.pendingCount > 0 ? "Sync pending changes before refreshing" : sync.online ? "Refresh workspace from server" : "Refresh unavailable while offline";
  const exportTitle = sync.pendingCount > 0 ? "Sync pending local changes before exporting" : sync.online ? "Export workspace" : "Export requires an online, fully synced workspace";
  const expectedConfirmation = importMode === "replace" ? "REPLACE" : "MERGE";
  const canRestore = Boolean(
    importBundle && importPreview && sync.online && sync.pendingCount === 0 && !sync.syncing && !sync.refreshing && !importBusy && importConfirmation === expectedConfirmation
  );

  function createArea() {
    const name = newArea.trim();
    if (!name) return;
    addDomain(name);
    setNewArea("");
  }

  async function readImportResponse(response: Response) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) throw new Error(body?.error || "Workspace import failed.");
    return body;
  }

  async function previewImport(bundle: unknown, mode: ImportMode) {
    setImportBusy(true);
    setImportError(null);
    setImportSuccess(null);
    try {
      const response = await fetch("/api/portability/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "preview", mode, bundle })
      });
      const body = await response.json().catch(() => null) as ImportPreview | { error?: string } | null;
      if (!response.ok || !body || !("counts" in body)) {
        throw new Error(body && "error" in body && body.error ? body.error : "Workspace export could not be previewed.");
      }
      setImportPreview(body as ImportPreview);
    } catch (error) {
      setImportPreview(null);
      setImportError(error instanceof Error ? error.message : "Workspace export could not be previewed.");
    } finally {
      setImportBusy(false);
    }
  }

  async function chooseImport(file: File | null) {
    setImportPreview(null);
    setImportConfirmation("");
    setImportError(null);
    setImportSuccess(null);
    if (!file) {
      setImportBundle(null);
      setImportFileName("");
      return;
    }
    setImportFileName(file.name);
    try {
      const bundle = JSON.parse(await file.text()) as unknown;
      setImportBundle(bundle);
      await previewImport(bundle, importMode);
    } catch (error) {
      setImportBundle(null);
      setImportError(error instanceof Error ? error.message : "Import file is not valid JSON.");
    }
  }

  async function changeImportMode(mode: ImportMode) {
    setImportMode(mode);
    setImportConfirmation("");
    if (importBundle) await previewImport(importBundle, mode);
  }

  async function restoreImport() {
    if (!importBundle || !canRestore) return;
    setImportBusy(true);
    setImportError(null);
    setImportSuccess(null);
    try {
      const response = await fetch("/api/portability/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "restore",
          mode: importMode,
          bundle: importBundle,
          confirmedNoPendingChanges: sync.pendingCount === 0,
          confirmation: importConfirmation
        })
      });
      await readImportResponse(response);
      await forceRefreshFromServer();
      setImportSuccess(importMode === "replace" ? "Workspace restored from export." : "Workspace export merged into this account.");
      setImportBundle(null);
      setImportPreview(null);
      setImportFileName("");
      setImportConfirmation("");
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Workspace import failed.");
    } finally {
      setImportBusy(false);
    }
  }

  return (
    <div className="cos-page">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--cos-text-strong)]">Settings</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--cos-text-muted)]">Areas, workspace sync, and data portability.</p>
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

      <section className="cos-surface mt-6 p-4" data-testid="data-portability-settings">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cos-text-muted)]">Data portability</h2>
        <p className="mt-2 max-w-3xl text-sm text-[var(--cos-text-muted)]">Export the complete workspace as versioned JSON for restore, or as Markdown for a human-readable copy. JSON restore validates the whole file before changing anything.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {canExport ? (
            <>
              <a href="/api/portability/export?format=json" className="cos-btn cos-btn-primary px-4 py-2 text-sm"><FileJson className="h-4 w-4" /> Export JSON</a>
              <a href="/api/portability/export?format=markdown" className="cos-btn cos-btn-secondary px-4 py-2 text-sm"><FileText className="h-4 w-4" /> Export Markdown</a>
            </>
          ) : (
            <>
              <button type="button" disabled title={exportTitle} className="cos-btn cos-btn-primary px-4 py-2 text-sm opacity-40"><FileJson className="h-4 w-4" /> Export JSON</button>
              <button type="button" disabled title={exportTitle} className="cos-btn cos-btn-secondary px-4 py-2 text-sm opacity-40"><FileText className="h-4 w-4" /> Export Markdown</button>
            </>
          )}
          <label className="cos-btn cos-btn-secondary cursor-pointer px-4 py-2 text-sm">
            <Upload className="h-4 w-4" /> Choose JSON to import
            <input
              data-testid="workspace-import-file"
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(event) => void chooseImport(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        {!canExport ? <p data-testid="workspace-export-blocked" className="mt-2 text-sm text-[var(--cos-warning-text)]">{exportTitle}. Export is enabled after this device is online and fully synced.</p> : null}

        {importFileName ? <p className="mt-3 text-sm font-medium text-[var(--cos-text)]">Selected: {importFileName}</p> : null}
        {importBundle ? (
          <div className="mt-4 rounded-lg border border-[var(--cos-border-soft)] p-4">
            <label className="block text-sm font-semibold text-[var(--cos-text)]">
              Import mode
              <select
                aria-label="Import mode"
                value={importMode}
                disabled={importBusy}
                onChange={(event) => void changeImportMode(event.target.value as ImportMode)}
                className="cos-input mt-2 w-full px-3 py-2 text-sm sm:w-auto"
              >
                <option value="replace">Replace current workspace</option>
                <option value="merge">Merge with current workspace</option>
              </select>
            </label>

            {importPreview ? (
              <div data-testid="workspace-import-preview" className="mt-4">
                <p className="text-sm text-[var(--cos-text-muted)]">Exported {formatSyncTimestamp(importPreview.exportedAt)} · format v{importPreview.version}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(importPreview.counts).map(([key, count]) => <span key={key} className="cos-pill cos-pill-muted">{count} {key}</span>)}
                </div>
                <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${importMode === "replace" ? "border border-[var(--cos-warning-border)] bg-[var(--cos-warning-soft)] text-[var(--cos-warning-text)]" : "bg-[var(--cos-bg-soft)] text-[var(--cos-text-muted)]"}`}>{importPreview.semantics}</p>
                {importMode === "replace" ? <p className="mt-2 text-xs text-[var(--cos-text-muted)]">Other signed-in sessions are revoked so stale devices cannot repopulate the pre-restore workspace.</p> : null}

                <label className="mt-4 block text-sm font-semibold text-[var(--cos-text)]">
                  Type {expectedConfirmation} to confirm
                  <input
                    aria-label="Import confirmation"
                    value={importConfirmation}
                    onChange={(event) => setImportConfirmation(event.target.value)}
                    className="cos-input mt-2 w-full px-3 py-2 text-sm sm:max-w-xs"
                  />
                </label>
                {sync.pendingCount > 0 ? <p className="mt-2 text-sm text-[var(--cos-warning-text)]">Sync {sync.pendingCount} pending local change{sync.pendingCount === 1 ? "" : "s"} before importing.</p> : null}
                <button
                  type="button"
                  data-testid="workspace-import-restore"
                  disabled={!canRestore}
                  onClick={() => void restoreImport()}
                  className={`cos-btn mt-4 px-4 py-2 text-sm disabled:opacity-40 ${importMode === "replace" ? "cos-btn-danger" : "cos-btn-primary"}`}
                >
                  {importBusy ? "Importing..." : importMode === "replace" ? "Replace workspace" : "Merge workspace"}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        {importError ? <p data-testid="workspace-import-error" className="mt-3 rounded-lg border border-[var(--cos-danger-border)] bg-[var(--cos-danger-soft)] px-3 py-2 text-sm text-[var(--cos-danger-text)]">{importError}</p> : null}
        {importSuccess ? <p data-testid="workspace-import-success" className="mt-3 rounded-lg border border-[var(--cos-success-border)] bg-[var(--cos-success-soft)] px-3 py-2 text-sm text-[var(--cos-success-text)]">{importSuccess}</p> : null}
      </section>

      <section className="cos-surface mt-6 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cos-text-muted)]">Areas</h2>
        <p className="mt-2 text-sm text-[var(--cos-text-muted)]">Areas are stable responsibilities that organize Projects and Resources.</p>
        <div className="mt-3 divide-y divide-[var(--cos-border-soft)] rounded-lg border border-[var(--cos-border-soft)]">
          {data.domains.map((domain) => (
            <AreaSettingsRow key={domain.id} domain={domain} online={sync.online} onUpdate={(updates) => updateDomain(domain.id, updates)} />
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