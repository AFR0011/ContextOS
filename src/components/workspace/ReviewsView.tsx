"use client";

import { useState, type ReactNode } from "react";
import { BookOpen } from "lucide-react";
import { format, parseISO } from "date-fns";
import { MarkdownEditor } from "@/components/workspace/MarkdownEditor";
import { MarkdownPreview as SharedMarkdownPreview } from "@/components/workspace/editor/MarkdownPreview";
import { useWorkspace } from "@/lib/client-store";
import type { ReviewType } from "@/lib/types";

function Page({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="cos-page">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--cos-text-strong)]">{title}</h1>
          {subtitle ? <p className="mt-1 max-w-2xl text-sm text-[var(--cos-text-muted)]">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function SectionTitle({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cos-text-muted)]">{title}</h2>
      {count !== undefined ? <span className="text-xs text-[var(--cos-text-subtle)]">({count})</span> : null}
    </div>
  );
}

export function ReviewsView() {
  const { data, addReview } = useWorkspace();
  const [type, setType] = useState<ReviewType | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const questions = type === "daily-startup" ? [["focus", "What needs focus today?"]] : type === "daily-shutdown" ? [["changed", "What changed today?"], ["open", "What is still open?"], ["resume", "What should be resumed tomorrow?"], ["triage", "Any inbox items to triage?"]] : [["outcomes", "What outcomes matter this week?"], ["active", "Which projects are active?"], ["stale", "Which projects are stale?"], ["dates", "What important dates are coming?"], ["drop", "What should be dropped, deferred, or blocked?"], ["plan", "What should be planned for this week?"]];
  const labels: Record<ReviewType, string> = { "daily-startup": "Daily Startup", "daily-shutdown": "Daily Shutdown", weekly: "Weekly Review" };

  if (type) {
    return (
      <Page title={labels[type]} subtitle="Store review context for recovery.">
        <div className="cos-surface space-y-5 p-4">
          {questions.map(([key, label]) => (
            <label key={key} className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--cos-text)]">{label}</span>
              <MarkdownEditor
                value={responses[key] || ""}
                onChange={(markdown) => setResponses((prev) => ({ ...prev, [key]: markdown }))}
                placeholder="Type / for blocks..."
                minLines={3}
                mode="compact"
                hideSaveButton
                dataTestId={`review-response-${key}`}
              />
            </label>
          ))}
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={() => { addReview(type, responses); setType(null); setResponses({}); }} className="cos-btn cos-btn-primary px-5 py-2 text-sm">Save Review</button>
          <button onClick={() => setType(null)} className="cos-btn cos-btn-ghost px-3 py-2 text-sm">Cancel</button>
        </div>
      </Page>
    );
  }

  return (
    <Page title="Reviews" subtitle="Daily and weekly recovery notes.">
      <div className="grid gap-4 sm:grid-cols-3">{(["daily-startup", "daily-shutdown", "weekly"] as ReviewType[]).map((reviewType) => <button key={reviewType} onClick={() => { setType(reviewType); setResponses({}); }} className="cos-surface p-5 text-left hover:border-[var(--cos-review)]"><BookOpen className="mb-2 h-5 w-5 text-[var(--cos-review)]" /><h3 className="text-sm font-semibold text-[var(--cos-text-strong)]">{labels[reviewType]}</h3></button>)}</div>
      <section className="mt-8"><SectionTitle title="Past Reviews" count={data.reviews.length} /><div className="mt-3 space-y-2">{data.reviews.map((review) => <details key={review.id} className="cos-surface"><summary className="cursor-pointer p-3 text-sm font-medium text-[var(--cos-text)]">{labels[review.type]} <span className="ml-2 text-xs text-[var(--cos-text-subtle)]">{format(parseISO(review.date), "MMM d, yyyy h:mm a")}</span></summary><div className="space-y-3 px-3 pb-3">{Object.entries(review.responses).map(([key, value]) => <div key={key}><p className="text-xs font-medium capitalize text-[var(--cos-text-muted)]">{key}</p><SharedMarkdownPreview content={value} className="text-sm text-[var(--cos-text)]" /></div>)}</div></details>)}</div></section>
    </Page>
  );
}
