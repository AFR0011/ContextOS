"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  Boxes,
  BookOpen,
  CalendarDays,
  Download,
  FileText,
  FolderKanban,
  Inbox,
  LayoutDashboard,
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
import type { PublicUser } from "@/lib/auth";
import { useWorkspace } from "@/lib/client-store";

const mobileBottomNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/today", label: "Today", icon: Sun },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/search", label: "Search", icon: Search }
] as const;

const navSections = [
  {
    label: "Execution",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/inbox", label: "Inbox", icon: Inbox },
      { href: "/today", label: "Today", icon: Sun },
      { href: "/this-week", label: "This Week", icon: CalendarDays }
    ]
  },
  {
    label: "PARA",
    items: [
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/areas", label: "Areas", icon: Boxes },
      { href: "/resources", label: "Resources", icon: FileText },
      { href: "/archive", label: "Archive", icon: Archive }
    ]
  },
  {
    label: "Review",
    items: [
      { href: "/dates", label: "Dates", icon: CalendarDays },
      { href: "/reviews", label: "Reviews", icon: BookOpen },
      { href: "/search", label: "Search", icon: Search },
      { href: "/settings", label: "Settings", icon: Settings }
    ]
  }
];

type SyncSnapshot = ReturnType<typeof useWorkspace>["sync"];

function syncStatusLabel(sync: SyncSnapshot) {
  if (sync.syncing) return "Syncing";
  if (!sync.online) return "Offline";
  if (sync.pendingCount > 0) return `${sync.pendingCount} pending`;
  return "Online";
}

function SyncIndicator({ sync, compact = false, onRefreshFromServer }: { sync: SyncSnapshot; compact?: boolean; onRefreshFromServer?: () => Promise<void> }) {
  const Icon = sync.syncing ? RefreshCw : sync.online ? Wifi : WifiOff;
  const tone = sync.error
    ? "border-[var(--cos-danger-border)] bg-[var(--cos-danger-soft)] text-[var(--cos-danger-text)]"
    : sync.lastWarning || !sync.online || sync.pendingCount > 0
      ? "border-[var(--cos-warning-border)] bg-[var(--cos-warning-soft)] text-[var(--cos-warning-text)]"
      : "border-[var(--cos-success-border)] bg-[var(--cos-success-soft)] text-[var(--cos-success-text)]";
  const canRefreshFromServer = Boolean(sync.online && !sync.syncing && !sync.refreshing && sync.pendingCount === 0);
  const refreshTitle = sync.pendingCount > 0 ? "Sync pending changes before refreshing" : sync.online ? "Refresh workspace from server" : "Refresh unavailable while offline";

  if (compact) {
    return (
      <div data-testid="global-sync-indicator" className={`ml-auto flex min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>
        <Icon className={`h-3.5 w-3.5 shrink-0 ${sync.syncing ? "animate-spin" : ""}`} />
        <span className="truncate">{syncStatusLabel(sync)}</span>
      </div>
    );
  }

  return (
    <div data-testid="global-sync-indicator" className={`mb-3 rounded-lg border px-3 py-2 text-xs ${tone}`}>
      <div className="flex items-center gap-2 font-semibold">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${sync.syncing ? "animate-spin" : ""}`} />
        <span>{syncStatusLabel(sync)}</span>
        {sync.pendingCount > 0 ? <span className="ml-auto rounded-full bg-white/70 px-2 py-0.5">{sync.pendingCount} pending</span> : null}
      </div>
      {sync.error ? (
        <p className="mt-1 flex items-start gap-1.5 font-medium">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{sync.error}</span>
        </p>
      ) : sync.lastWarning ? (
        <p className="mt-1 flex items-start gap-1.5 font-medium">
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
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-current/20 bg-white/45 px-2 py-1.5 text-xs font-semibold hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className={`h-3.5 w-3.5 ${sync.refreshing ? "animate-pulse" : ""}`} />
          <span>{sync.refreshing ? "Refreshing" : "Refresh"}</span>
        </button>
      ) : null}
    </div>
  );
}

export default function WorkspaceShell({ user, children }: { user: PublicUser; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean | null>(null);
  const pathname = usePathname();
  const currentPath = pathname ?? "";
  const router = useRouter();
  const { data, sync, forceRefreshFromServer } = useWorkspace();
  const inboxCount = data.captures.filter((capture) => capture.status === "unprocessed").length;
  const isDark = darkMode ?? false;

  useEffect(() => {
    const stored = window.localStorage.getItem("contextos-theme");
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
    setDarkMode(stored ? stored === "dark" : prefersDark);
  }, []);

  useEffect(() => {
    if (darkMode === null) return;
    document.documentElement.classList.toggle("dark", darkMode);
    window.localStorage.setItem("contextos-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen bg-[var(--cos-bg)] text-[var(--cos-text)]">
      {open ? <div className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" onClick={() => setOpen(false)} /> : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-68 flex-col border-r border-[var(--cos-border)] bg-[var(--cos-bg-elevated)] transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-[var(--cos-border-soft)] px-5 py-4">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--cos-primary)] text-white shadow-sm">
            <Zap className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-[var(--cos-text-strong)]">ContextOS</p>
            <p className="text-[11px] font-medium text-[var(--cos-text-subtle)]">MVP v0.2.8</p>
          </div>
          <button
            className="cos-btn-ghost ml-auto grid h-9 w-9 place-items-center rounded-md text-[var(--cos-text-muted)]"
            onClick={() => setDarkMode(!isDark)}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button className="cos-btn-ghost grid h-9 w-9 place-items-center rounded-md text-[var(--cos-text-muted)] lg:hidden" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {navSections.map((section) => (
            <div key={section.label} className="mb-3">
              <p className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--cos-text-subtle)]">{section.label}</p>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = currentPath === item.href || (item.href === "/projects" && currentPath.startsWith("/projects"));
                return (
                  <button
                    key={item.href}
                    onClick={() => {
                      router.push(item.href);
                      setOpen(false);
                    }}
                    className={`mb-0.5 flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium ${
                      active
                        ? "border border-[var(--cos-primary-border)] bg-[var(--cos-primary-soft)] text-[var(--cos-primary-text)]"
                        : "border border-transparent text-[var(--cos-text-muted)] hover:bg-[var(--cos-bg-soft)] hover:text-[var(--cos-text-strong)]"
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    <span>{item.label}</span>
                    {item.href === "/inbox" && inboxCount > 0 ? (
                      <span className="ml-auto min-w-5 rounded-full bg-[var(--cos-primary)] px-1.5 py-0.5 text-center text-[11px] font-semibold text-white">
                        {inboxCount}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-[var(--cos-border-soft)] px-5 py-4">
          <SyncIndicator sync={sync} onRefreshFromServer={forceRefreshFromServer} />
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[var(--cos-text)]">{user.email}</p>
              <p className="text-[11px] text-[var(--cos-text-subtle)]">{sync.syncing ? "Syncing..." : sync.lastSyncedAt ? `Synced ${new Date(sync.lastSyncedAt).toLocaleTimeString()}` : "Not synced yet"}</p>
            </div>
            <button onClick={logout} className="cos-btn-ghost grid h-9 w-9 place-items-center rounded-md text-[var(--cos-text-muted)]" title="Log out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-[var(--cos-border)] bg-[var(--cos-bg-elevated)]/95 px-4 py-3 backdrop-blur lg:hidden">
          <button className="cos-btn-ghost grid h-9 w-9 place-items-center rounded-md text-[var(--cos-text)]" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <button
            className="cos-btn-ghost grid h-9 w-9 place-items-center rounded-md text-[var(--cos-text)]"
            onClick={() => setDarkMode(!isDark)}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--cos-text-strong)]">
            <Zap className="h-4 w-4 text-[var(--cos-primary)]" />
            ContextOS
          </div>
          <SyncIndicator sync={sync} compact />
        </div>
        {children}

        <nav
          aria-label="Primary navigation"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--cos-border)] bg-[var(--cos-bg-elevated)]/95 backdrop-blur lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="grid grid-cols-5">
            {mobileBottomNav.map((item) => {
              const Icon = item.icon;
              const active =
                currentPath === item.href ||
                (item.href === "/projects" && currentPath.startsWith("/projects"));
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => router.push(item.href)}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium ${
                    active
                      ? "text-[var(--cos-primary-text)]"
                      : "text-[var(--cos-text-muted)] hover:text-[var(--cos-text-strong)]"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? "text-[var(--cos-primary)]" : ""}`} />
                  <span className="truncate">{item.label}</span>
                  {item.href === "/inbox" && inboxCount > 0 ? (
                    <span className="absolute right-2 top-1.5 min-w-4 rounded-full bg-[var(--cos-primary)] px-1 py-0.5 text-center text-[9px] font-semibold leading-none text-white">
                      {inboxCount > 9 ? "9+" : inboxCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </nav>
      </main>
    </div>
  );
}
