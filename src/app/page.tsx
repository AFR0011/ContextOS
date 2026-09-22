import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Database,
  FolderKanban,
  GitMerge,
  RotateCcw,
  Search,
  ShieldCheck,
  WifiOff,
  Zap,
} from "lucide-react";
import { ContextOSProductPreview } from "@/components/marketing/ContextOSProductPreview";

export const metadata: Metadata = {
  title: "ContextOS · Local-first context workspace",
  description:
    "A self-hostable local-first workspace for capturing context, organizing execution, and recovering project state after interruptions.",
};

const capabilities = [
  {
    icon: Zap,
    eyebrow: "Today",
    title: "Keep today's working context close.",
    body: "Daily Notes hold unstructured working memory while Tasks, Events, and Deadlines stay explicit and connected to the Area or Project they belong to.",
  },
  {
    icon: FolderKanban,
    eyebrow: "Organize",
    title: "Keep work attached to its context.",
    body: "Flat Areas, Projects, Tasks, and ContextDates keep operational state understandable without turning ContextOS into another everything-database.",
  },
  {
    icon: WifiOff,
    eyebrow: "Continue",
    title: "Temporary network loss does not erase the working surface.",
    body: "After a successful sign-in on the device, supported workspace state stays locally available and supported mutations can queue for later synchronization.",
  },
  {
    icon: RotateCcw,
    eyebrow: "Recover",
    title: "Return to the exact context you need.",
    body: "Canonical Search keeps current and historical Projects, Areas, Tasks, Dates, and Daily Notes discoverable without reviving retired product surfaces.",
  },
] as const;

const principles = [
  "User-scoped local state",
  "Offline mutation queue",
  "Idempotent synchronization",
  "Canonical history search",
] as const;

export default function HomePage() {
  return (
    <main className="min-h-dvh overflow-hidden bg-[var(--cos-bg)] text-[var(--cos-text)]">
      <header className="border-b border-[var(--cos-border)] bg-[color:rgba(255,255,255,0.88)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="ContextOS home">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--cos-primary)] text-white shadow-[0_8px_24px_rgba(94,106,210,0.25)]">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold leading-none tracking-tight text-[var(--cos-text-strong)]">ContextOS</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cos-text-subtle)]">Execution-first context recovery</div>
            </div>
          </Link>

          <nav className="flex items-center gap-1.5 sm:gap-2" aria-label="Primary">
            <a
              href="https://github.com/AFR0011/ContextOS"
              target="_blank"
              rel="noreferrer"
              className="hidden min-h-10 items-center rounded-full px-4 text-sm font-semibold text-[var(--cos-text-muted)] hover:bg-[var(--cos-bg-inset)] hover:text-[var(--cos-text-strong)] md:inline-flex"
            >
              GitHub
            </a>
            <Link
              href="/login"
              className="hidden min-h-10 items-center rounded-full px-4 text-sm font-semibold text-[var(--cos-text-muted)] hover:bg-[var(--cos-bg-inset)] hover:text-[var(--cos-text-strong)] sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--cos-primary)] px-4 text-sm font-bold text-white shadow-sm hover:bg-[var(--cos-primary-hover)] sm:px-5"
            >
              Open workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative">
        <div className="pointer-events-none absolute left-1/2 top-[-18rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-[color:rgba(94,106,210,0.09)] blur-3xl" />
        <div className="relative mx-auto grid max-w-[1240px] gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:gap-14 lg:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--cos-primary-border)] bg-[var(--cos-primary-soft)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--cos-primary-text)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--cos-primary)]" />
              Local-first workspace
            </div>

            <h1 className="mt-6 max-w-3xl text-5xl font-bold leading-[0.98] tracking-[-0.045em] text-[var(--cos-text-strong)] sm:text-6xl lg:text-[4.6rem]">
              Keep the context. Resume the work.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--cos-text-muted)] sm:text-xl">
              ContextOS gives interrupted work a durable shape: see what matters today, keep working memory nearby, connect execution to Areas and Projects, then return without reconstructing the whole situation from memory.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--cos-primary)] px-6 text-sm font-bold text-white shadow-[0_12px_28px_rgba(94,106,210,0.2)] hover:bg-[var(--cos-primary-hover)]"
              >
                Open workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#system"
                className="inline-flex min-h-12 items-center rounded-full border border-[var(--cos-border-strong)] bg-[var(--cos-bg-elevated)] px-6 text-sm font-bold text-[var(--cos-text-strong)] shadow-sm hover:bg-[var(--cos-bg-soft)]"
              >
                See how it works
              </a>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              {principles.map((principle) => (
                <div key={principle} className="flex items-center gap-2 text-xs font-semibold text-[var(--cos-text-muted)]">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[var(--cos-primary)]" />
                  <span>{principle}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-3xl">
            <div className="absolute -left-10 top-12 h-48 w-48 rounded-full bg-[color:rgba(124,58,237,0.08)] blur-3xl" />
            <div className="absolute -right-10 bottom-10 h-56 w-56 rounded-full bg-[color:rgba(8,145,178,0.08)] blur-3xl" />
            <div className="relative">
              <ContextOSProductPreview />
            </div>
          </div>
        </div>
      </section>

      <section id="system" className="border-y border-[var(--cos-border)] bg-[var(--cos-bg-elevated)]">
        <div className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-22 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--cos-primary-text)]">Built for interrupted work</p>
            <h2 className="mt-4 text-4xl font-bold leading-tight tracking-[-0.03em] text-[var(--cos-text-strong)] sm:text-5xl">
              The useful part is not remembering everything. It is recovering enough to continue.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--cos-text-muted)]">
              ContextOS treats context as working infrastructure: something you organize, carry across temporary failures, and deliberately recover when attention moves elsewhere.
            </p>
          </div>

          <div className="mt-11 grid gap-px overflow-hidden rounded-[1.75rem] border border-[var(--cos-border)] bg-[var(--cos-border)] md:grid-cols-2">
            {capabilities.map((capability) => {
              const Icon = capability.icon;
              return (
                <article key={capability.title} className="bg-[var(--cos-bg)] p-6 sm:p-8">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--cos-primary-text)]">
                    <Icon className="h-4 w-4" />
                    {capability.eyebrow}
                  </div>
                  <h3 className="mt-4 text-2xl font-bold tracking-[-0.02em] text-[var(--cos-text-strong)]">{capability.title}</h3>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--cos-text-muted)]">{capability.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1240px] gap-8 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-14">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--cos-primary-text)]">Local first, bounded honestly</p>
          <h2 className="mt-4 text-4xl font-bold leading-tight tracking-[-0.03em] text-[var(--cos-text-strong)] sm:text-5xl">
            Local state for continuity. Server state for durable synchronization.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--cos-text-muted)]">
            The browser keeps user-scoped workspace state and supported pending mutations. The server owns authentication, authorization, validation, and synchronized PostgreSQL state. The boundary is explicit rather than pretending every operation can happen offline.
          </p>
          <div className="mt-7 space-y-3 text-sm text-[var(--cos-text-muted)]">
            <div className="flex items-start gap-3">
              <Search className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cos-primary)]" />
              <span>Locally available workspace data stays searchable after prior successful authentication on the device.</span>
            </div>
            <div className="flex items-start gap-3">
              <GitMerge className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cos-primary)]" />
              <span>Queued mutations replay through an idempotent, ownership-validated synchronization path.</span>
            </div>
            <div className="flex items-start gap-3">
              <Database className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cos-primary)]" />
              <span>PostgreSQL becomes canonical after successful synchronization; API traffic remains outside the offline cache.</span>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-[var(--cos-border)] bg-[var(--cos-bg-elevated)] p-5 shadow-[var(--cos-shadow-md)] sm:p-7">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
            <div className="rounded-2xl border border-[var(--cos-primary-border)] bg-[var(--cos-primary-soft)] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cos-primary-text)]">Browser</p>
              <h3 className="mt-2 text-lg font-bold text-[var(--cos-text-strong)]">Local workspace</h3>
              <p className="mt-2 text-xs leading-5 text-[var(--cos-text-muted)]">IndexedDB cache, mutation outbox, verified application shell.</p>
            </div>
            <ArrowRight className="mx-auto hidden h-5 w-5 text-[var(--cos-text-subtle)] sm:block" />
            <div className="rounded-2xl border border-[var(--cos-border)] bg-[var(--cos-bg-soft)] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cos-text-subtle)]">Next.js API</p>
              <h3 className="mt-2 text-lg font-bold text-[var(--cos-text-strong)]">Trust boundary</h3>
              <p className="mt-2 text-xs leading-5 text-[var(--cos-text-muted)]">Authentication, authorization, validation, idempotent replay.</p>
            </div>
            <ArrowRight className="mx-auto hidden h-5 w-5 text-[var(--cos-text-subtle)] sm:block" />
            <div className="rounded-2xl border border-[var(--cos-success-border)] bg-[var(--cos-success-soft)] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cos-success-text)]">PostgreSQL</p>
              <h3 className="mt-2 text-lg font-bold text-[var(--cos-text-strong)]">Synced state</h3>
              <p className="mt-2 text-xs leading-5 text-[var(--cos-text-muted)]">Durable user-owned records after successful synchronization.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--cos-border)] bg-[#111424] text-white">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-8 px-5 py-14 sm:px-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--cos-primary)]">
                <Zap className="h-4 w-4" />
              </div>
              <span className="text-xl font-bold">ContextOS</span>
            </div>
            <h2 className="mt-7 max-w-2xl text-4xl font-bold leading-tight tracking-[-0.03em] sm:text-5xl">
              Stop rebuilding the situation every time attention moves.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/60">
              Self-hostable local-first workspace software with explicit synchronization, recovery, and failure boundaries.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-[#111424] hover:bg-white/90"
          >
            Open workspace
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#111424] text-white/50">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-5 py-6 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>ContextOS · self-hostable workspace software</span>
          <a href="https://github.com/AFR0011/ContextOS" target="_blank" rel="noreferrer" className="hover:text-white/80">
            Source on GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}
