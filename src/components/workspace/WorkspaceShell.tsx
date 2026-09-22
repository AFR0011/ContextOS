"use client";

import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  Download,
  FolderKanban,
  Home,
  Layers3,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
  Search,
  Settings,
  Sun,
  Wifi,
  WifiOff,
  X,
  Zap
} from "lucide-react";
import { LogoutDialog } from "@/components/workspace/LogoutDialog";
import { OfflineReadiness } from "@/components/workspace/OfflineReadiness";
import { WorkspaceCommandPalette } from "@/components/workspace/WorkspaceCommandPalette";
import type { PublicUser } from "@/lib/auth";
import { useWorkspace } from "@/lib/client-store";
import { useLocalRouter } from "@/lib/local-router";
import { useContextOsTheme } from "@/lib/theme-preference";
import { useDialogFocusTrap } from "@/lib/use-dialog-focus-trap";

const mobileBottomNav = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/search", label: "Search", icon: Search },
  { href: "/lifeos", label: "LifeOS", icon: Boxes }
] as const;

const workNavItems = [
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/areas", label: "Areas", icon: Layers3 },
  { href: "/dates", label: "Dates", icon: CalendarDays }
] as const;

type SyncSnapshot = ReturnType<typeof useWorkspace>["sync"];

function navIsActive(currentPath: string, href: string) {
  if (href === "/projects") return currentPath === "/projects" || currentPath.startsWith("/projects/");
  return currentPath === href;
}

function syncStatusLabel(sync: SyncSnapshot) {
  if (sync.syncing) return "Syncing";
  if (!sync.online) return "Offline";
  if (sync.pendingCount > 0) return `${sync.pendingCount} pending`;
  return "Online";
}

function SyncIndicator({
  sync,
  compact = false,
  onRefreshFromServer
}: {
  sync: SyncSnapshot;
  compact?: boolean;
  onRefreshFromServer?: () => Promise<boolean>;
}) {
  const Icon = sync.syncing ? RefreshCw : sync.online ? Wifi : WifiOff;
  const tone = sync.error
    ? "border-[var(--cos-danger-border)] bg-[var(--cos-danger-soft)] text-[var(--cos-danger-text)]"
    : sync.lastWarning || !sync.online || sync.pendingCount > 0
      ? "border-[var(--cos-warning-border)] bg-[var(--cos-warning-soft)] text-[var(--cos-warning-text)]"
      : "border-[var(--cos-success-border)] bg-[var(--cos-success-soft)] text-[var(--cos-success-text)]";
  const canRefreshFromServer = Boolean(sync.online && !sync.syncing && !sync.refreshing && sync.pendingCount === 0);
  const refreshTitle = sync.pendingCount > 0
    ? "Sync pending changes before refreshing"
    : sync.online
      ? "Refresh workspace from server"
      : "Refresh unavailable while offline";

  if (compact) {
    return (
      <div
        data-testid="global-sync-indicator"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={`ml-auto flex min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone}`}
      >
        <Icon className={`h-3.5 w-3.5 shrink-0 ${sync.syncing ? "animate-spin" : ""}`} />
        <span className="truncate">{syncStatusLabel(sync)}</span>
      </div>
    );
  }

  return (
    <div data-testid="global-sync-indicator" role="status" aria-live="polite" aria-atomic="true" className={`rounded-xl border px-3 py-2.5 text-xs ${tone}`}>
      <div className="flex items-center gap-2 font-semibold">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${sync.syncing ? "animate-spin" : ""}`} />
        <span>{syncStatusLabel(sync)}</span>
        {sync.pendingCount > 0 ? (
          <span className="ml-auto rounded-full border border-current/15 px-2 py-0.5 text-[10px]">
            {sync.pendingCount} pending
          </span>
        ) : null}
      </div>
      {sync.error ? (
        <p role="alert" className="mt-1.5 flex items-start gap-1.5 font-medium">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{sync.error}</span>
        </p>
      ) : sync.lastWarning ? (
        <p role="status" className="mt-1.5 flex items-start gap-1.5 font-medium">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{sync.lastWarning}</span>
        </p>
      ) : null}
      {onRefreshFromServer ? (
        <button
          type="button"
          data-testid="global-refresh-from-server"
          onClick={() => void onRefreshFromServer()}
          disabled={!canRefreshFromServer}
          aria-label="Refresh workspace from server"
          title={refreshTitle}
          className="mt-2 flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-current/15 px-2 py-1.5 text-xs font-semibold hover:bg-[var(--cos-bg-soft)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className={`h-3.5 w-3.5 ${sync.refreshing ? "animate-pulse" : ""}`} />
          <span>{sync.refreshing ? "Refreshing" : "Refresh"}</span>
        </button>
      ) : null}
    </div>
  );
}

function NavButton({
  href,
  label,
  icon: Icon,
  currentPath,
  onNavigate
}: {
  href: string;
  label: string;
  icon: typeof Home;
  currentPath: string;
  onNavigate: (href: string) => void;
}) {
  const active = navIsActive(currentPath, href);
  return (
    <button
      type="button"
      onClick={() => onNavigate(href)}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`group flex min-h-10 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${
        active
          ? "border-[var(--cos-primary-border)] bg-[var(--cos-primary-soft)] text-[var(--cos-primary-text)]"
          : "border-transparent text-[var(--cos-text-muted)] hover:bg-[var(--cos-bg-soft)] hover:text-[var(--cos-text-strong)]"
      }`}
    >
      <Icon className={`h-[17px] w-[17px] shrink-0 ${active ? "text-[var(--cos-primary)]" : "text-[var(--cos-text-subtle)] group-hover:text-[var(--cos-text)]"}`} />
      <span>{label}</span>
    </button>
  );
}

export default function WorkspaceShell({ user, children }: { user: PublicUser; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const localRouter = useLocalRouter();
  const currentPath = localRouter.location.pathname;
  const { loading, sync, syncNow, forceRefreshFromServer } = useWorkspace();
  const { isDark, setTheme } = useContextOsTheme();
  const navigationDialogRef = useDialogFocusTrap({
    open,
    onClose: () => setOpen(false)
  });

  if (loading) {
    return (
      <main data-testid="workspace-local-loading" className="grid min-h-screen place-items-center bg-[var(--cos-bg)] p-4 text-[var(--cos-text)]">
        <section className="cos-surface flex w-full max-w-md items-center gap-3 p-5">
          <RefreshCw className="h-5 w-5 animate-spin text-[var(--cos-primary)]" />
          <div>
            <h1 className="font-semibold text-[var(--cos-text-strong)]">Opening local workspace</h1>
            <p className="mt-1 text-sm text-[var(--cos-text-muted)]">Reading this verified account&apos;s local state before enabling edits.</p>
          </div>
        </section>
      </main>
    );
  }

  function goTo(href: string) {
    localRouter.push(href);
    setOpen(false);
  }

  function openLogout() {
    if (!open) {
      setLogoutOpen(true);
      return;
    }

    setOpen(false);
    window.requestAnimationFrame(() => setLogoutOpen(true));
  }

  return (
    <div className="flex min-h-screen bg-[var(--cos-bg)] text-[var(--cos-text)]">
      <LogoutDialog open={logoutOpen} user={user} sync={sync} syncNow={syncNow} onClose={() => setLogoutOpen(false)} />
      <WorkspaceCommandPalette />

      {open ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
          onMouseDown={() => setOpen(false)}
        />
      ) : null}

      <aside
        id="workspace-navigation-drawer"
        ref={navigationDialogRef}
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label={open ? "Workspace navigation menu" : undefined}
        tabIndex={open ? -1 : undefined}
        className={`fixed inset-y-0 left-0 z-40 flex w-[15.5rem] flex-col border-r border-[var(--cos-border-soft)] bg-[var(--cos-bg-elevated)]/96 shadow-[var(--cos-shadow-md)] backdrop-blur-xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[68px] items-center gap-3 border-b border-[var(--cos-border-soft)] px-4">
          <div className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--cos-primary-border)] bg-[var(--cos-primary-soft)] text-[var(--cos-primary)]">
            <Zap className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-[-0.01em] text-[var(--cos-text-strong)]">ContextOS</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--cos-text-subtle)]">Execution</p>
          </div>
          <button
            type="button"
            className="cos-btn-ghost ml-auto grid h-10 w-10 place-items-center rounded-lg text-[var(--cos-text-muted)]"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </button>
          <button
            type="button"
            className="cos-btn-ghost grid h-10 w-10 place-items-center rounded-lg text-[var(--cos-text-muted)] lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <nav aria-label="Workspace navigation" data-testid="workspace-primary-nav" className="flex-1 overflow-y-auto px-3 py-4">
          <NavButton href="/dashboard" label="Home" icon={Home} currentPath={currentPath} onNavigate={goTo} />

          <div data-testid="workspace-secondary-nav" className="mt-6">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--cos-text-subtle)]">Work</p>
            <div className="space-y-0.5">
              {workNavItems.map((item) => (
                <NavButton key={item.href} {...item} currentPath={currentPath} onNavigate={goTo} />
              ))}
            </div>
          </div>

          <div className="my-5 border-t border-[var(--cos-border-soft)]" />

          <div className="space-y-0.5">
            <NavButton href="/lifeos" label="LifeOS" icon={Boxes} currentPath={currentPath} onNavigate={goTo} />
            <NavButton href="/search" label="Search" icon={Search} currentPath={currentPath} onNavigate={goTo} />
          </div>
        </nav>

        <div className="border-t border-[var(--cos-border-soft)] p-3">
          <div data-testid="workspace-utility-nav" className="mb-3">
            <NavButton href="/settings" label="Settings" icon={Settings} currentPath={currentPath} onNavigate={goTo} />
          </div>

          <div className="space-y-2">
            <SyncIndicator sync={sync} onRefreshFromServer={forceRefreshFromServer} />
            <OfflineReadiness />
          </div>

          <div className="mt-3 flex items-center gap-2 border-t border-[var(--cos-border-soft)] px-1 pt-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[var(--cos-text)]">{user.email}</p>
              <p className="mt-0.5 text-[10px] text-[var(--cos-text-subtle)]">
                {sync.syncing
                  ? "Syncing…"
                  : sync.lastSyncedAt
                    ? `Synced ${new Date(sync.lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : "Not synced yet"}
              </p>
            </div>
            <button
              type="button"
              onClick={openLogout}
              className="cos-btn-ghost grid h-10 w-10 place-items-center rounded-lg text-[var(--cos-text-muted)]"
              title="Log out"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0">
        <header className="sticky top-0 z-20 flex h-[60px] items-center gap-3 border-b border-[var(--cos-border-soft)] bg-[var(--cos-bg-elevated)]/88 px-4 backdrop-blur-xl lg:hidden">
          <button
            type="button"
            className="cos-btn-ghost grid h-10 w-10 place-items-center rounded-lg text-[var(--cos-text)]"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            aria-expanded={open}
            aria-controls="workspace-navigation-drawer"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold text-[var(--cos-text-strong)]">
            <Zap className="h-4 w-4 text-[var(--cos-primary)]" />
            <span className="truncate">ContextOS</span>
          </div>
          <SyncIndicator sync={sync} compact />
        </header>

        {children}

        <nav
          aria-label="Primary navigation"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--cos-border-soft)] bg-[var(--cos-bg-elevated)]/92 backdrop-blur-xl lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="grid grid-cols-4 px-1">
            {mobileBottomNav.map((item) => {
              const Icon = item.icon;
              const active = navIsActive(currentPath, item.href);
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => goTo(item.href)}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[10px] font-medium ${
                    active
                      ? "text-[var(--cos-primary-text)]"
                      : "text-[var(--cos-text-muted)] hover:text-[var(--cos-text-strong)]"
                  }`}
                >
                  <Icon className={`h-[19px] w-[19px] ${active ? "text-[var(--cos-primary)]" : ""}`} />
                  <span className="truncate">{item.label}</span>
                  {active ? <span className="absolute bottom-1 h-0.5 w-5 rounded-full bg-[var(--cos-primary)]" /> : null}
                </button>
              );
            })}
          </div>
        </nav>
      </main>
    </div>
  );
}
