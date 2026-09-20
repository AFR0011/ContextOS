"use client";

import { Boxes } from "lucide-react";
import { EmptyState, PageHeader, Section } from "@/components/workspace/ProductPrimitives";

const modules = ["Ravel", "SocialOS", "Ledger", "Canon"];

export function LifeOSFoundationView() {
  return (
    <div className="cos-page">
      <PageHeader
        eyebrow="LifeOS"
        title="Module hub"
        description="A stable doorway into the larger LifeOS. Module summaries and real adapters arrive in C6; this foundation intentionally shows no invented data."
      />

      <Section title="Modules" description="ContextOS will surface only the smallest useful summary each module explicitly exposes.">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {modules.map((module) => (
            <div key={module} className="rounded-xl border border-[var(--cos-border-soft)] bg-[var(--cos-bg-elevated)] px-4 py-4">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--cos-bg-inset)] text-[var(--cos-text-subtle)]">
                  <Boxes className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--cos-text-strong)]">{module}</p>
                  <p className="text-[11px] text-[var(--cos-text-subtle)]">Adapter pending</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section className="mt-8">
        <EmptyState
          title="No module data is being duplicated here"
          description="C6 will connect explicit module-summary contracts. Until then, ContextOS keeps this surface deliberately shallow."
        />
      </Section>
    </div>
  );
}
