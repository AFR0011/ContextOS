import {
  CalendarDays,
  CheckCircle2,
  Circle,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  Search,
  Wifi,
  Zap,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Inbox", icon: Inbox, badge: "6" },
  { label: "Search", icon: Search },
] as const;

const projects = ["Portfolio launch", "Research manuscript", "ContextOS"] as const;

const tasks = [
  { title: "Review launch checklist", meta: "Portfolio launch", done: false },
  { title: "Verify repository links", meta: "Portfolio launch", done: true },
  { title: "Draft discussion section", meta: "Research manuscript", done: false },
] as const;

export function ContextOSProductPreview() {
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-[var(--cos-border)] bg-[var(--cos-bg-elevated)] shadow-[0_32px_90px_rgba(15,23,42,0.16)]">
      <div className="flex items-center justify-between border-b border-[var(--cos-border)] bg-[var(--cos-bg-elevated)] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff8b7b]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#f5c451]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#68c98e]" />
        </div>
        <div className="flex items-center gap-2 rounded-full border border-[var(--cos-border)] bg-[var(--cos-bg-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--cos-text-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--cos-primary)]" />
          Synthetic preview
        </div>
      </div>

      <div className="grid min-h-[470px] grid-cols-1 sm:grid-cols-[180px_1fr] lg:min-h-[520px] lg:grid-cols-[205px_1fr]">
        <aside className="hidden border-r border-[var(--cos-border)] bg-[var(--cos-bg-soft)] p-4 sm:block">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-[var(--cos-primary)] text-white shadow-sm">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-[var(--cos-text-strong)]">ContextOS</div>
              <div className="text-[10px] text-[var(--cos-text-muted)]">Local workspace</div>
            </div>
          </div>

          <nav className="mt-5 space-y-1" aria-label="Preview navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-xs font-semibold ${
                    item.active
                      ? "bg-[var(--cos-primary-soft)] text-[var(--cos-primary-text)]"
                      : "text-[var(--cos-text-muted)]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span className="ml-auto rounded-full bg-[var(--cos-bg-elevated)] px-1.5 py-0.5 text-[9px] text-[var(--cos-text-muted)] shadow-sm">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </nav>

          <div className="mt-6 px-2.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--cos-text-subtle)]">
            Projects
          </div>
          <div className="mt-2 space-y-1">
            {projects.map((project, index) => (
              <div key={project} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] text-[var(--cos-text-muted)]">
                <span
                  className={`h-2 w-2 rounded-full ${
                    index === 0 ? "bg-[var(--cos-project)]" : index === 1 ? "bg-[var(--cos-date)]" : "bg-[var(--cos-review)]"
                  }`}
                />
                <span className="truncate">{project}</span>
              </div>
            ))}
          </div>

          <div className="mt-7 rounded-xl border border-[var(--cos-success-border)] bg-[var(--cos-success-soft)] p-3 text-[10px] text-[var(--cos-success-text)]">
            <div className="flex items-center gap-1.5 font-bold">
              <Wifi className="h-3 w-3" />
              Synced
            </div>
            <p className="mt-1 leading-4 opacity-80">Local workspace is current.</p>
          </div>
        </aside>

        <div className="bg-[var(--cos-bg)] p-4 sm:p-5 lg:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--cos-primary-text)]">Command center</p>
              <h3 className="mt-1 text-xl font-bold tracking-tight text-[var(--cos-text-strong)] sm:text-2xl">Pick up where you left off.</h3>
              <p className="mt-1 max-w-xl text-[11px] leading-5 text-[var(--cos-text-muted)] sm:text-xs">
                Capture loose context, surface what matters now, and keep project state close to the work.
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-[var(--cos-success-border)] bg-[var(--cos-success-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--cos-success-text)]">
              <Wifi className="h-3 w-3" />
              Online
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[var(--cos-primary-border)] bg-[var(--cos-bg-elevated)] p-3 shadow-[var(--cos-shadow-sm)] sm:p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--cos-text-subtle)]">
              <Zap className="h-3 w-3 text-[var(--cos-primary)]" />
              Capture
            </div>
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-[var(--cos-border)] bg-[var(--cos-bg-soft)] px-3 py-3 text-xs text-[var(--cos-text-muted)]">
              <span className="flex-1">Add a task, note, date, or loose thought…</span>
              <span className="rounded-md border border-[var(--cos-border)] bg-[var(--cos-bg-elevated)] px-2 py-1 font-mono text-[9px]">⌘ K</span>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-2xl border border-[var(--cos-border)] bg-[var(--cos-bg-elevated)] p-4 shadow-[var(--cos-shadow-sm)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--cos-text-subtle)]">Focus</p>
                  <h4 className="mt-1 text-sm font-bold text-[var(--cos-text-strong)]">What needs attention</h4>
                </div>
                <span className="rounded-full bg-[var(--cos-primary-soft)] px-2 py-1 text-[9px] font-bold text-[var(--cos-primary-text)]">3 open</span>
              </div>
              <div className="mt-3 space-y-2">
                {tasks.map((task) => (
                  <div key={task.title} className="flex items-start gap-2.5 rounded-xl border border-[var(--cos-border-soft)] bg-[var(--cos-bg-soft)] p-2.5">
                    {task.done ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cos-success)]" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cos-border-strong)]" />
                    )}
                    <div className="min-w-0">
                      <p className={`truncate text-[11px] font-semibold ${task.done ? "text-[var(--cos-text-subtle)] line-through" : "text-[var(--cos-text)]"}`}>
                        {task.title}
                      </p>
                      <p className="mt-0.5 truncate text-[9px] text-[var(--cos-text-subtle)]">{task.meta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid gap-4">
              <section className="rounded-2xl border border-[var(--cos-border)] bg-[var(--cos-bg-elevated)] p-4 shadow-[var(--cos-shadow-sm)]">
                <div className="flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-[var(--cos-primary)]" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--cos-text-subtle)]">Inbox</p>
                    <p className="text-sm font-bold text-[var(--cos-text-strong)]">6 items to triage</p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[var(--cos-border)] bg-[var(--cos-bg-elevated)] p-4 shadow-[var(--cos-shadow-sm)]">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-[var(--cos-date)]" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--cos-text-subtle)]">Upcoming</p>
                    <p className="text-sm font-bold text-[var(--cos-text-strong)]">2 important dates</p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[var(--cos-border)] bg-[var(--cos-bg-elevated)] p-4 shadow-[var(--cos-shadow-sm)]">
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-[var(--cos-project)]" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--cos-text-subtle)]">Projects</p>
                    <p className="text-sm font-bold text-[var(--cos-text-strong)]">3 active contexts</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
