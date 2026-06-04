"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  Boxes,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileText,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
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
      { href: "/deadlines", label: "Deadlines", icon: CheckCircle2 },
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

function SyncIndicator({ sync, compact = false }: { sync: SyncSnapshot; compact?: boolean }) {
  const Icon = sync.syncing ? RefreshCw : sync.online ? Wifi : WifiOff;
  const tone = sync.error
    ? "border-red-100 bg-red-50 text-red-700"
    : sync.lastWarning || !sync.online || sync.pendingCount > 0
      ? "border-amber-100 bg-amber-50 text-amber-700"
      : "border-emerald-100 bg-emerald-50 text-emerald-700";

  if (compact) {
    return (
      <div data-testid="global-sync-indicator" className={`ml-auto flex min-w-0 items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-semibold ${tone}`}>
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
    </div>
  );
}

export default function WorkspaceShell({ user, children }: { user: PublicUser; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const currentPath = pathname ?? "";
  const router = useRouter();
  const { data, sync } = useWorkspace();
  const inboxCount = data.captures.filter((capture) => capture.status === "unprocessed").length;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {open ? <div className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" onClick={() => setOpen(false)} /> : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-68 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-600 text-white">
            <Zap className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-950">ContextOS</p>
            <p className="text-[11px] font-medium text-slate-400">MVP v0.1</p>
          </div>
          <button className="ml-auto rounded-md p-1 text-slate-400 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {navSections.map((section) => (
            <div key={section.label} className="mb-3">
              <p className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{section.label}</p>
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
                    className={`mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                      active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    <span>{item.label}</span>
                    {item.href === "/inbox" && inboxCount > 0 ? (
                      <span className="ml-auto min-w-5 rounded-full bg-indigo-600 px-1.5 py-0.5 text-center text-[11px] font-semibold text-white">
                        {inboxCount}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-100 px-5 py-4">
          <SyncIndicator sync={sync} />
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-slate-700">{user.email}</p>
              <p className="text-[11px] text-slate-400">{sync.syncing ? "Syncing..." : sync.lastSyncedAt ? `Synced ${new Date(sync.lastSyncedAt).toLocaleTimeString()}` : "Not synced yet"}</p>
            </div>
            <button onClick={logout} className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Log out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <button className="rounded-md p-1 text-slate-600 hover:bg-slate-100" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Zap className="h-4 w-4 text-indigo-600" />
            ContextOS
          </div>
          <SyncIndicator sync={sync} compact />
        </div>
        {children}
      </main>
    </div>
  );
}
