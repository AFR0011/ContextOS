"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Archive,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
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

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/today", label: "Today", icon: Sun },
  { href: "/this-week", label: "This Week", icon: CalendarDays },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/deadlines", label: "Deadlines", icon: CheckCircle2 },
  { href: "/archive", label: "Archive", icon: Archive },
  { href: "/search", label: "Search", icon: Search },
  { href: "/reviews", label: "Reviews", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings }
];

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
          {navItems.map((item) => {
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
        </nav>

        <div className="border-t border-slate-100 px-5 py-4">
          <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
            {sync.online ? <Wifi className="h-3.5 w-3.5 text-emerald-500" /> : <WifiOff className="h-3.5 w-3.5 text-amber-500" />}
            <span>{sync.online ? "Online" : "Offline"}</span>
            {sync.pendingCount > 0 ? <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">{sync.pendingCount} pending</span> : null}
          </div>
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
          {sync.pendingCount > 0 ? <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{sync.pendingCount} pending</span> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
