"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Inbox, ShieldCheck } from "lucide-react";
import { useWorkspace } from "@/lib/client-store";
import { handoffFromFragment, validateLifeOsHandoff, type LifeOsHandoffV1 } from "@/lib/lifeos-handoff";

export default function HandoffPreviewPage() {
  const router = useRouter();
  const { addHandoffCapture, loading } = useWorkspace();
  const [handoff, setHandoff] = useState<LifeOsHandoffV1 | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!window.location.hash) return;
    try {
      const parsed = handoffFromFragment(window.location.hash, "contextos");
      setHandoff(parsed);
      setTitle(parsed.title);
      setBody(parsed.body);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not read this handoff.");
    } finally {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
  }, []);

  const validation = useMemo(() => {
    if (!handoff) return null;
    try {
      return validateLifeOsHandoff({ ...handoff, title, body }, "contextos");
    } catch (reason) {
      return reason instanceof Error ? reason.message : "This handoff is invalid.";
    }
  }, [body, handoff, title]);

  function approve() {
    if (!handoff || typeof validation === "string") return;
    addHandoffCapture({ ...handoff, title: title.trim(), body: body.trim() });
    router.replace("/inbox?filter=suggestions");
  }

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <button type="button" onClick={() => router.replace("/inbox")} className="cos-btn cos-btn-ghost min-h-10 px-3 py-2 text-sm">
        <ArrowLeft className="h-4 w-4" /> Inbox
      </button>
      <section className="cos-surface space-y-5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-6 w-6 text-[var(--cos-primary)]" />
          <div>
            <h1 className="text-xl font-semibold text-[var(--cos-text-strong)]">Review suggested capture</h1>
            <p className="mt-1 text-sm text-[var(--cos-text-muted)]">Approval adds an unprocessed Inbox capture. It will not create a task or modify a project.</p>
          </div>
        </div>
        {error ? <p role="alert" className="rounded-lg bg-[var(--cos-danger-soft)] p-3 text-sm text-[var(--cos-danger-text)]">{error}</p> : null}
        {!handoff && !error ? <p className="text-sm text-[var(--cos-text-muted)]">Waiting for handoff data...</p> : null}
        {handoff ? (
          <>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="cos-pill cos-pill-primary">{handoff.source}</span>
              <span className="cos-pill cos-pill-muted">{handoff.kind}</span>
              {handoff.area ? <span className="cos-pill cos-pill-muted">{handoff.area}</span> : null}
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--cos-text-muted)]">Title</span>
              <input value={title} maxLength={160} onChange={(event) => setTitle(event.target.value)} className="cos-input w-full px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--cos-text-muted)]">Body</span>
              <textarea value={body} rows={10} onChange={(event) => setBody(event.target.value)} className="cos-input w-full px-3 py-2 text-sm" />
            </label>
            {typeof validation === "string" ? <p role="alert" className="text-sm text-[var(--cos-danger-text)]">{validation}</p> : null}
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={approve} disabled={loading || typeof validation === "string"} className="cos-btn cos-btn-primary min-h-10 px-4 py-2 text-sm disabled:opacity-50">
                <Inbox className="h-4 w-4" /> Approve to Inbox
              </button>
              <button type="button" onClick={() => router.replace("/inbox")} className="cos-btn cos-btn-secondary min-h-10 px-4 py-2 text-sm">Dismiss</button>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
