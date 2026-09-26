"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Download,
  FileJson,
  FileText,
  Moon,
  RefreshCw,
  SlidersHorizontal,
  Sun,
  Trash2,
  Upload,
  UserRound
} from "lucide-react";
import { PasswordChangePanel } from "@/components/workspace/PasswordChangePanel";
import { PageHeader, Section } from "@/components/workspace/ProductPrimitives";
import { useWorkspace } from "@/lib/client-store";
import { useContextOsTheme } from "@/lib/theme-preference";

function formatSyncTimestamp(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}

function SyncMetric({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--cos-text-subtle)]">{label}</p>
      <p data-testid={testId ?? (label === "Pending" ? "pending-count" : undefined)} className="mt-1 break-words text-sm font-semibold text-[var(--cos-text)] [overflow-wrap:anywhere]">{value}</p>
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

const settingsSections = [
  ["account", "Account"],
  ["appearance", "Appearance"],
  ["sync", "Offline & Sync"],
  ["data", "Data"],
  ["security", "Security"],
  ["advanced", "Advanced"]
] as const;

type SettingsSectionId = (typeof settingsSections)[number][0];

function isSettingsSectionId(value: string | null): value is SettingsSectionId {
  return settingsSections.some(([id]) => id === value);
}

export function ProductSettingsView() {
  const { sync, syncNow, forceRefreshFromServer } = useWorkspace();
  const { theme, setTheme } = useContextOsTheme();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedSection = searchParams.get("section");
  const activeSection: SettingsSectionId = isSettingsSectionId(requestedSection) ? requestedSection : "account";
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
  const refreshTitle = sync.pendingCount > 0
    ? "Sync pending changes before refreshing"
    : sync.online
      ? "Refresh workspace from server"
      : "Refresh unavailable while offline";
  const exportTitle = sync.pendingCount > 0
    ? "Sync pending local changes before exporting"
    : sync.online
      ? "Export workspace"
      : "Export requires an online, fully synced workspace";
  const expectedConfirmation = importMode === "replace" ? "REPLACE" : "MERGE";
  const canRestore = Boolean(
    importBundle &&
    importPreview &&
    sync.online &&
    sync.pendingCount === 0 &&
    !sync.syncing &&
    !sync.refreshing &&
    !importBusy &&
    importConfirmation === expectedConfirmation
  );

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
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error || "Workspace import failed.");

      const refreshed = await forceRefreshFromServer();
      setImportBundle(null);
      setImportPreview(null);
      setImportFileName("");
      setImportConfirmation("");

      if (!refreshed) {
        setImportError(
          importMode === "replace"
            ? "The workspace was restored on the server, but this tab could not refresh the restored data. Use Refresh from server before making further edits."
            : "The workspace was merged on the server, but this tab could not refresh the merged data. Use Refresh from server before making further edits."
        );
        return;
      }

      setImportSuccess(importMode === "replace" ? "Workspace restored from export." : "Workspace export merged into this account.");
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Workspace import failed.");
    } finally {
      setImportBusy(false);
    }
  }

  function selectSettingsSection(section: SettingsSectionId) {
    const params = new URLSearchParams(searchParams.toString());
    if (section === "account") params.delete("section");
    else params.set("section", section);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="cos-page" data-testid="product-settings-view">
      <PageHeader eyebrow="ContextOS" title="Settings" />

      <div className="mb-6 lg:hidden">
        <label htmlFor="settings-section-select" className="sr-only">Settings section</label>
        <select
          id="settings-section-select"
          aria-label="Settings section"
          value={activeSection}
          onChange={(event) => selectSettingsSection(event.target.value as SettingsSectionId)}
          className="cos-input w-full px-3 py-2.5 text-sm font-semibold"
        >
          {settingsSections.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </div>

      <div className="grid gap-8 lg:grid-cols-[10.5rem_minmax(0,1fr)] xl:gap-10">
        <nav aria-label="Settings sections" className="hidden lg:block">
          <div className="sticky top-6 space-y-1">
            {settingsSections.map(([id, label]) => {
              const selected = activeSection === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectSettingsSection(id)}
                  aria-current={selected ? "page" : undefined}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cos-focus-ring)] ${selected ? "bg-[var(--cos-primary-soft)] font-semibold text-[var(--cos-primary)]" : "text-[var(--cos-text-muted)] hover:bg-[var(--cos-bg-soft)] hover:text-[var(--cos-text-strong)]"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="min-w-0">
          {activeSection === "account" ? (
          <div id="settings-account" className="scroll-mt-6">
            <Section title="Account">
              <div className="cos-surface p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--cos-bg-soft)] text-[var(--cos-text-muted)]">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--cos-text-strong)]">Delete account</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--cos-text-muted)]">
                        Permanently delete this account and workspace after a separate confirmation.
                      </p>
                    </div>
                  </div>
                  <a data-testid="open-account-deletion" href="/account/delete" className="cos-btn cos-btn-danger min-h-10 shrink-0 px-3 py-2 text-sm">
                    <Trash2 className="h-4 w-4" /> Delete account
                  </a>
                </div>
              </div>
            </Section>
          </div>

          ) : null}

          {activeSection === "appearance" ? (
          <div id="settings-appearance" className="scroll-mt-6">
            <Section title="Appearance">
              <div className="cos-surface p-4" data-testid="appearance-settings">
                <div className="grid max-w-sm grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={theme === "light"}
                    onClick={() => setTheme("light")}
                    className={`cos-btn min-h-11 justify-center px-4 py-2 text-sm ${theme === "light" ? "cos-btn-primary" : "cos-btn-secondary"}`}
                  >
                    <Sun className="h-4 w-4" /> Light
                  </button>
                  <button
                    type="button"
                    aria-pressed={theme === "dark"}
                    onClick={() => setTheme("dark")}
                    className={`cos-btn min-h-11 justify-center px-4 py-2 text-sm ${theme === "dark" ? "cos-btn-primary" : "cos-btn-secondary"}`}
                  >
                    <Moon className="h-4 w-4" /> Dark
                  </button>
                </div>
              </div>
            </Section>
          </div>

          ) : null}

          {activeSection === "sync" ? (
          <div id="settings-sync" className="scroll-mt-6">
            <Section title="Offline & Sync">
              <div className="cos-surface p-4" data-testid="offline-sync-settings">
                <div className="grid grid-cols-2 gap-x-5 gap-y-5 md:grid-cols-5">
                  <SyncMetric label="Status" value={sync.syncing ? "Syncing" : sync.online ? "Online" : "Offline"} testId="sync-status" />
                  <SyncMetric label="Pending" value={String(sync.pendingCount)} />
                  <SyncMetric label="Last synced" value={formatSyncTimestamp(sync.lastSyncedAt)} />
                  <SyncMetric label="Last refresh" value={formatSyncTimestamp(sync.lastRefreshAt)} />
                  <SyncMetric label="Stale warnings" value={String(sync.staleMutationCount)} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--cos-border-soft)] pt-4">
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

                {!sync.online ? (
                  <p role="status" className="mt-3 rounded-lg border border-[var(--cos-warning-border)] bg-[var(--cos-warning-soft)] px-3 py-2 text-sm text-[var(--cos-warning-text)]">
                    Offline. Edits stay local and sync when the connection returns.
                  </p>
                ) : null}
                {sync.error ? (
                  <p data-testid="sync-error" role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--cos-danger-border)] bg-[var(--cos-danger-soft)] px-3 py-2 text-sm text-[var(--cos-danger-text)]">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="min-w-0 break-words [overflow-wrap:anywhere]">{sync.error}{sync.lastErrorAt ? ` Last error: ${formatSyncTimestamp(sync.lastErrorAt)}.` : ""}</span>
                  </p>
                ) : null}
                {sync.lastWarning ? (
                  <p data-testid="sync-warning" role="status" className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--cos-warning-border)] bg-[var(--cos-warning-soft)] px-3 py-2 text-sm text-[var(--cos-warning-text)]">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="min-w-0 break-words [overflow-wrap:anywhere]">{sync.lastWarning}{sync.lastWarningAt ? ` Last warning: ${formatSyncTimestamp(sync.lastWarningAt)}.` : ""}</span>
                  </p>
                ) : null}
              </div>
            </Section>
          </div>

          ) : null}

          {activeSection === "data" ? (
          <div id="settings-data" className="scroll-mt-6">
            <Section title="Data">
              <div className="cos-surface p-4" data-testid="data-portability-settings">
                <p className="max-w-3xl text-sm leading-6 text-[var(--cos-text-muted)]">
                  Export a restorable JSON backup or a human-readable Markdown copy. JSON imports are validated before any workspace data changes.
                </p>

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
                {importFileName ? <p className="mt-3 break-words text-sm font-medium text-[var(--cos-text)] [overflow-wrap:anywhere]">Selected: {importFileName}</p> : null}

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
                        <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${importMode === "replace" ? "border border-[var(--cos-warning-border)] bg-[var(--cos-warning-soft)] text-[var(--cos-warning-text)]" : "bg-[var(--cos-bg-soft)] text-[var(--cos-text-muted)]"}`}>
                          {importPreview.semantics}
                        </p>
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

                {importError ? <p data-testid="workspace-import-error" role="alert" className="mt-3 rounded-lg border border-[var(--cos-danger-border)] bg-[var(--cos-danger-soft)] px-3 py-2 text-sm text-[var(--cos-danger-text)]">{importError}</p> : null}
                {importSuccess ? <p data-testid="workspace-import-success" role="status" className="mt-3 rounded-lg border border-[var(--cos-success-border)] bg-[var(--cos-success-soft)] px-3 py-2 text-sm text-[var(--cos-success-text)]">{importSuccess}</p> : null}
              </div>
            </Section>
          </div>

          ) : null}

          {activeSection === "security" ? (
          <div id="settings-security" className="scroll-mt-6">
            <Section title="Security">
              <div data-testid="security-settings">
                <PasswordChangePanel online={sync.online} />
              </div>
            </Section>
          </div>

          ) : null}

          {activeSection === "advanced" ? (
          <div id="settings-advanced" className="scroll-mt-6">
            <Section title="Advanced">
              <div data-testid="advanced-settings" className="flex items-center gap-3 py-1 text-sm text-[var(--cos-text-muted)]">
                <SlidersHorizontal className="h-4 w-4 shrink-0 text-[var(--cos-text-subtle)]" />
                <span>No advanced overrides.</span>
              </div>
            </Section>
          </div>
          ) : null}

        </div>
      </div>
    </div>
  );
}
