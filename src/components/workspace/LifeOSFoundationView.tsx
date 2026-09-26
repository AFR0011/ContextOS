"use client";

import { Boxes, ChevronRight } from "lucide-react";
import { PageHeader, Section } from "@/components/workspace/ProductPrimitives";
import { configuredLifeOsModuleProvider } from "@/lib/lifeos-modules";

const moduleDescriptions = {
  ravel: "Personal finance and financial records.",
  socialos: "Relationships, contacts, and outreach.",
  ledger: "Daily record and reflection.",
  canon: "Durable knowledge and reference."
} as const;

export function LifeOSFoundationView() {
  const modules = configuredLifeOsModuleProvider.getModules();

  return (
    <div className="cos-page" data-testid="lifeos-hub">
      <div className="w-full max-w-5xl">
        <PageHeader
          eyebrow="LifeOS"
          title="Module hub"
        />

        <Section title="Modules">
          <div className="grid gap-3 md:grid-cols-2">
          {modules.map((module) => (
            <article
              key={module.id}
              data-testid={`lifeos-module-${module.id}`}
              className="rounded-xl border border-[var(--cos-border-soft)] bg-[var(--cos-bg-elevated)] px-4 py-4"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--cos-bg-inset)] text-[var(--cos-text-subtle)]">
                  <Boxes className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <p className="min-w-0 break-words text-sm font-semibold text-[var(--cos-text-strong)] [overflow-wrap:anywhere]">{module.name}</p>
                    <span
                      data-testid={`lifeos-module-status-${module.id}`}
                      className={`cos-pill shrink-0 whitespace-nowrap ${module.href ? "cos-pill-primary" : "cos-pill-muted"}`}
                    >
                      {module.href ? "Connected" : "Not connected"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[var(--cos-text-muted)]">{moduleDescriptions[module.id]}</p>
                  {module.summary ? (
                    <div className="mt-3 border-t border-[var(--cos-border-soft)] pt-3">
                      {module.summary.eyebrow ? <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--cos-text-subtle)]">{module.summary.eyebrow}</p> : null}
                      <p className="mt-1 text-sm font-medium text-[var(--cos-text)]">{module.summary.headline}</p>
                      {module.summary.detail ? <p className="mt-1 text-xs leading-5 text-[var(--cos-text-muted)]">{module.summary.detail}</p> : null}
                    </div>
                  ) : null}
                </div>
              </div>

              {module.href ? (
                <a href={module.href} className="cos-btn cos-btn-secondary mt-4 w-full justify-between px-3 py-2 text-xs">
                  Open {module.name} <ChevronRight className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </article>
          ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
