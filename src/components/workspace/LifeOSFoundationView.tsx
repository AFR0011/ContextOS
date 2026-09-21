"use client";

import { Boxes, ChevronRight } from "lucide-react";
import { EmptyState, PageHeader, Section } from "@/components/workspace/ProductPrimitives";
import { disconnectedLifeOsModuleProvider } from "@/lib/lifeos-modules";

export function LifeOSFoundationView() {
  const modules = disconnectedLifeOsModuleProvider.getModules();

  return (
    <div className="cos-page" data-testid="lifeos-hub">
      <PageHeader
        eyebrow="LifeOS"
        title="Module hub"
        description="A shallow doorway into the larger LifeOS. ContextOS only renders summaries that modules explicitly expose."
      />

      <Section title="Modules" description="No module internals are duplicated into ContextOS.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                  <p className="text-sm font-semibold text-[var(--cos-text-strong)]">{module.name}</p>
                  {module.summary ? (
                    <>
                      {module.summary.eyebrow ? <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--cos-text-subtle)]">{module.summary.eyebrow}</p> : null}
                      <p className="mt-1 text-sm text-[var(--cos-text)]">{module.summary.headline}</p>
                      {module.summary.detail ? <p className="mt-1 text-xs leading-5 text-[var(--cos-text-muted)]">{module.summary.detail}</p> : null}
                    </>
                  ) : (
                    <p className="mt-1 text-xs text-[var(--cos-text-subtle)]">No summary provider connected</p>
                  )}
                </div>
              </div>

              {module.href ? (
                <a href={module.href} className="cos-btn cos-btn-secondary mt-4 w-full justify-between px-3 py-2 text-xs">
                  Open {module.name} <ChevronRight className="h-3.5 w-3.5" />
                </a>
              ) : (
                <div className="mt-4 rounded-lg border border-[var(--cos-border-soft)] bg-[var(--cos-bg-soft)] px-3 py-2 text-xs text-[var(--cos-text-subtle)]">
                  Entry point not connected
                </div>
              )}
            </article>
          ))}
        </div>
      </Section>

      <Section className="mt-8">
        <EmptyState
          title="ContextOS stays shallow by design"
          description="Module summaries appear here only through the explicit LifeOS provider contract. Until a module is connected, no placeholder metrics or invented activity are shown."
        />
      </Section>
    </div>
  );
}
