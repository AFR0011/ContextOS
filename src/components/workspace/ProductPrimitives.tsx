"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useDialogFocusTrap } from "@/lib/use-dialog-focus-trap";
import { CalendarDays, Check, ChevronRight, Circle, Clock3, Search, X } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="cos-kicker">{eyebrow}</p> : null}
        <h1 tabIndex={-1} className="cos-page-title mt-1 break-words outline-none [overflow-wrap:anywhere]">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--cos-text-muted)]">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function Section({
  title,
  description,
  action,
  children,
  className = ""
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`cos-section ${className}`}>
      {title || description || action ? (
        <div className="mb-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {title ? <h2 className="cos-section-heading break-words [overflow-wrap:anywhere]">{title}</h2> : null}
            {description ? <p className="mt-1 text-xs leading-5 text-[var(--cos-text-subtle)]">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function EntityRow({
  leading,
  title,
  meta,
  trailing,
  onOpen,
  muted = false,
  className = ""
}: {
  leading?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  onOpen?: () => void;
  muted?: boolean;
  className?: string;
}) {
  const content = (
    <>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div className={`break-words text-sm font-medium [overflow-wrap:anywhere] ${muted ? "text-[var(--cos-text-muted)]" : "text-[var(--cos-text-strong)]"}`}>{title}</div>
        {meta ? <div className="mt-0.5 break-words text-xs text-[var(--cos-text-subtle)] [overflow-wrap:anywhere]">{meta}</div> : null}
      </div>
      {trailing ?? (onOpen ? <ChevronRight className="h-4 w-4 shrink-0 text-[var(--cos-text-subtle)]" /> : null)}
    </>
  );

  return onOpen ? (
    <button type="button" onClick={onOpen} className={`cos-entity-row w-full text-left ${className}`}>
      {content}
    </button>
  ) : (
    <div className={`cos-entity-row ${className}`}>{content}</div>
  );
}

export function TaskRow({
  title,
  done,
  meta,
  onToggle,
  onOpen,
  toggleDisabledReason
}: {
  title: string;
  done?: boolean;
  meta?: ReactNode;
  onToggle?: () => void;
  onOpen?: () => void;
  toggleDisabledReason?: string | null;
}) {
  return (
    <div className={`cos-entity-row ${done ? "opacity-55" : ""}`}>
      <button
        type="button"
        onClick={onToggle}
        disabled={Boolean(toggleDisabledReason)}
        title={toggleDisabledReason ?? undefined}
        aria-label={done ? `Reopen ${title}` : `Complete ${title}`}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[var(--cos-text-subtle)] hover:bg-[var(--cos-primary-soft)] hover:text-[var(--cos-primary)] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {done ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
      </button>
      {onOpen ? (
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <span className={`block break-words text-sm font-medium text-[var(--cos-text-strong)] [overflow-wrap:anywhere] ${done ? "line-through" : ""}`}>{title}</span>
          {meta ? <span className="mt-0.5 block break-words text-xs text-[var(--cos-text-subtle)] [overflow-wrap:anywhere]">{meta}</span> : null}
        </button>
      ) : (
        <div className="min-w-0 flex-1">
          <span className={`block break-words text-sm font-medium text-[var(--cos-text-strong)] [overflow-wrap:anywhere] ${done ? "line-through" : ""}`}>{title}</span>
          {meta ? <span className="mt-0.5 block break-words text-xs text-[var(--cos-text-subtle)] [overflow-wrap:anywhere]">{meta}</span> : null}
        </div>
      )}
    </div>
  );
}

export function DateRow({
  title,
  kind,
  time,
  meta,
  onOpen
}: {
  title: string;
  kind: "event" | "deadline";
  time?: string | null;
  meta?: ReactNode;
  onOpen?: () => void;
}) {
  return (
    <EntityRow
      onOpen={onOpen}
      leading={
        <div className={`grid h-8 w-8 place-items-center rounded-lg border ${
          kind === "event"
            ? "border-[var(--cos-primary-border)] bg-[var(--cos-primary-soft)] text-[var(--cos-primary)]"
            : "border-[var(--cos-warning-border)] bg-[var(--cos-warning-soft)] text-[var(--cos-warning-text)]"
        }`}>
          {kind === "event" ? <Clock3 className="h-3.5 w-3.5" /> : <CalendarDays className="h-3.5 w-3.5" />}
        </div>
      }
      title={title}
      meta={<>{time ? `${time} · ` : ""}{meta}</>}
    />
  );
}

export interface DaylineItem {
  id: string;
  type: "task" | "event";
  time?: string | null;
  title: string;
  done?: boolean;
  meta?: string;
  onToggle?: () => void;
  onOpen?: () => void;
  toggleDisabledReason?: string | null;
}

export function Dayline({ items }: { items: DaylineItem[] }) {
  return (
    <div className="relative">
      <div className="absolute bottom-2 left-[4.85rem] top-2 w-px bg-[var(--cos-border-soft)]" aria-hidden="true" />
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id} className={`grid grid-cols-[4rem_1.5rem_minmax(0,1fr)] items-start gap-2 rounded-lg px-1 py-2 ${item.done ? "opacity-55" : ""}`}>
            <div className="pt-0.5 text-right text-xs tabular-nums text-[var(--cos-text-subtle)]">{item.time ?? ""}</div>
            <div className="relative z-10 grid h-5 place-items-center">
              {item.type === "task" ? (
                <button
                  type="button"
                  onClick={item.onToggle}
                  disabled={!item.onToggle || Boolean(item.toggleDisabledReason)}
                  title={item.toggleDisabledReason ?? undefined}
                  aria-label={item.done ? `Reopen ${item.title}` : `Complete ${item.title}`}
                  className="group grid h-10 w-10 -m-2 place-items-center rounded-full disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-full border-2 border-[var(--cos-bg)] transition-colors ${
                      item.done
                        ? "bg-[var(--cos-text-subtle)] text-[var(--cos-bg)]"
                        : "bg-[var(--cos-bg-elevated)] text-transparent ring-1 ring-[var(--cos-border-strong)] group-hover:ring-[var(--cos-primary)]"
                    }`}
                  >
                    {item.done ? <Check className="h-3 w-3" /> : null}
                  </span>
                </button>
              ) : (
                <span className="h-2.5 w-2.5 rounded-full border-2 border-[var(--cos-bg)] bg-[var(--cos-primary)]" />
              )}
            </div>
            {item.onOpen ? (
              <button type="button" onClick={item.onOpen} className="min-w-0 text-left">
                <span className={`block break-words text-sm font-medium text-[var(--cos-text-strong)] [overflow-wrap:anywhere] ${item.done ? "line-through" : ""}`}>{item.title}</span>
                {item.meta ? <span className="mt-0.5 block break-words text-xs text-[var(--cos-text-subtle)] [overflow-wrap:anywhere]">{item.meta}</span> : null}
              </button>
            ) : (
              <div className="min-w-0">
                <p className={`break-words text-sm font-medium text-[var(--cos-text-strong)] [overflow-wrap:anywhere] ${item.done ? "line-through" : ""}`}>{item.title}</p>
                {item.meta ? <p className="mt-0.5 break-words text-xs text-[var(--cos-text-subtle)] [overflow-wrap:anywhere]">{item.meta}</p> : null}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function InsightCard({
  title,
  message,
  source,
  actions
}: {
  title: string;
  message: string;
  source?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <article className="rounded-xl border border-[var(--cos-primary-border)] bg-[var(--cos-primary-soft)]/45 p-4">
      <h3 className="text-sm font-semibold text-[var(--cos-text-strong)]">{title}</h3>
      <p className="mt-1.5 text-sm leading-6 text-[var(--cos-text-muted)]">{message}</p>
      {source ? <div className="mt-2 text-[11px] text-[var(--cos-text-subtle)]">{source}</div> : null}
      {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
    </article>
  );
}

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="cos-empty px-5 py-8 text-center">
      <p className="text-sm font-medium text-[var(--cos-text-strong)]">{title}</p>
      {description ? <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-[var(--cos-text-muted)]">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function DetailSheet({
  open,
  title,
  description,
  onClose,
  children,
  footer
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const dialogRef = useDialogFocusTrap({ open, onClose });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 backdrop-blur-[2px] sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-[var(--cos-border)] bg-[var(--cos-bg-elevated)] shadow-[var(--cos-shadow-lg)] sm:max-h-[calc(100dvh-2rem)] sm:max-w-xl sm:rounded-2xl">
        <header className="sticky top-0 z-10 flex items-start gap-3 border-b border-[var(--cos-border-soft)] bg-[var(--cos-bg-elevated)]/95 px-5 py-4 backdrop-blur">
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-lg font-semibold text-[var(--cos-text-strong)] [overflow-wrap:anywhere]">{title}</h2>
            {description ? <p className="mt-1 text-sm text-[var(--cos-text-muted)]">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="cos-btn-ghost grid h-10 w-10 place-items-center rounded-lg"><X className="h-4 w-4" /></button>
        </header>
        <div className="p-5">{children}</div>
        {footer ? <footer className="sticky bottom-0 border-t border-[var(--cos-border-soft)] bg-[var(--cos-bg-elevated)]/95 px-5 py-4 backdrop-blur">{footer}</footer> : null}
      </section>
    </div>
  );
}

export interface CommandPaletteItem {
  id: string;
  label: string;
  hint?: string;
  icon?: ReactNode;
  onSelect: () => void;
}

export function CommandPalette({
  open,
  query,
  onQueryChange,
  items,
  onClose
}: {
  open: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  items: CommandPaletteItem[];
  onClose: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useDialogFocusTrap({ open, onClose });

  useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
  }, [open, query, items.length]);

  useEffect(() => {
    if (!open) return;
    const active = resultsRef.current?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]');
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, items.length, open]);


  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => items.length ? (index + 1) % items.length : 0);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) => items.length ? (index - 1 + items.length) % items.length : 0);
        return;
      }
      if (event.key === "Enter" && items[activeIndex]) {
        event.preventDefault();
        items[activeIndex].onSelect();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, items, onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center bg-slate-950/35 p-4 backdrop-blur-sm sm:pt-[12dvh]"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        data-testid="command-palette"
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[var(--cos-border)] bg-[var(--cos-bg-elevated)] shadow-[var(--cos-shadow-lg)] sm:max-h-[calc(88dvh-1rem)]"
      >
        <div className="flex items-center gap-3 border-b border-[var(--cos-border-soft)] px-4">
          <Search className="h-4 w-4 text-[var(--cos-text-subtle)]" />
          <input
            autoFocus
            role="combobox"
            aria-label="Search or run a command"
            aria-expanded="true"
            aria-autocomplete="list"
            aria-controls="command-palette-results"
            aria-activedescendant={items[activeIndex] ? `command-palette-option-${items[activeIndex].id}` : undefined}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search or run a command…"
            className="h-12 min-w-0 flex-1 bg-transparent text-sm text-[var(--cos-text-strong)] outline-none placeholder:text-[var(--cos-text-subtle)]"
          />
        </div>
        <div id="command-palette-results" ref={resultsRef} className="min-h-0 flex-1 overflow-y-auto p-2 sm:max-h-[22rem]" role="listbox" aria-label="Command palette results">
          {items.length ? items.map((item, index) => (
            <button
              key={item.id}
              id={`command-palette-option-${item.id}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              data-testid={`command-palette-item-${item.id}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={item.onSelect}
              className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${
                index === activeIndex ? "bg-[var(--cos-primary-soft)]" : "hover:bg-[var(--cos-bg-soft)]"
              }`}
            >
              <span className="text-[var(--cos-text-subtle)]">{item.icon}</span>
              <span className="min-w-0 flex-1 break-words text-sm font-medium text-[var(--cos-text-strong)] [overflow-wrap:anywhere]">{item.label}</span>
              {item.hint ? <span className="shrink-0 text-[11px] text-[var(--cos-text-subtle)]">{item.hint}</span> : null}
            </button>
          )) : <p className="px-3 py-6 text-center text-sm text-[var(--cos-text-muted)]">No matching commands.</p>}
        </div>
      </section>
    </div>
  );
}
