"use client";

import { useState, type ReactNode } from "react";
import { ArrowRight, Boxes, Plus, Upload } from "lucide-react";
import { useWorkspace } from "@/lib/client-store";
import { useLocalRouter } from "@/lib/local-router";

function AreaCreator({ compact = false }: { compact?: boolean }) {
  const { addDomain } = useWorkspace();
  const [name, setName] = useState("");

  function createArea() {
    const areaName = name.trim();
    if (!areaName) return;
    addDomain(areaName);
    setName("");
  }

  return (
    <form
      data-testid={compact ? "area-creator" : "first-run-area-form"}
      className={compact ? "flex flex-col gap-2 sm:flex-row" : "mt-6 space-y-3"}
      onSubmit={(event) => {
        event.preventDefault();
        createArea();
      }}
    >
      <label className={compact ? "min-w-0 flex-1" : "block"}>
        <span className={compact ? "sr-only" : "mb-1 block text-sm font-medium text-[var(--cos-text)]"}>Area name</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Work, Research, Personal"
          aria-label="Area name"
          autoFocus={!compact}
          className="cos-input min-h-10 w-full px-3 py-2 text-sm"
        />
      </label>
      <button type="submit" disabled={!name.trim()} className="cos-btn cos-btn-primary min-h-10 justify-center px-4 py-2 text-sm disabled:opacity-50">
        <Plus className="h-4 w-4" />
        Add Area
      </button>
    </form>
  );
}

export function FirstRunSetup() {
  const router = useLocalRouter();

  return (
    <div data-testid="first-run-setup" className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="cos-surface p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--cos-primary-soft)] text-[var(--cos-primary-text)]">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cos-primary-text)]">First run</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--cos-text-strong)]">Set up your first Area</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--cos-text-muted)]">
              Areas are stable parts of your work or life that hold Projects and Resources. Start with one you actually use. ContextOS will not invent sample work for you.
            </p>
          </div>
        </div>

        <AreaCreator />

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--cos-border-soft)] pt-4">
          <span className="text-sm text-[var(--cos-text-muted)]">Already have a ContextOS workspace export?</span>
          <button
            type="button"
            onClick={() => router.push("/settings")}
            className="cos-btn cos-btn-secondary min-h-10 px-4 py-2 text-sm"
          >
            <Upload className="h-4 w-4" />
            Restore a workspace
          </button>
        </div>

        <div className="mt-6 rounded-lg border border-[var(--cos-border-soft)] bg-[var(--cos-bg-soft)] p-4 text-sm text-[var(--cos-text-muted)]">
          <p className="font-medium text-[var(--cos-text-strong)]">What happens next?</p>
          <p className="mt-1 leading-6">After you create an Area, your normal workspace opens immediately. You can then add a Project, capture something into Inbox, or create a Resource without cleaning up demo records first.</p>
        </div>
      </section>
    </div>
  );
}

export function AreasSetupView({ children }: { children: ReactNode }) {
  return (
    <>
      <section className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="cos-surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-semibold text-[var(--cos-text-strong)]">Add an Area</h2>
            <p className="mt-1 text-sm text-[var(--cos-text-muted)]">Create a stable responsibility or domain for Projects and Resources.</p>
          </div>
          <div className="w-full sm:max-w-md">
            <AreaCreator compact />
          </div>
        </div>
      </section>
      {children}
    </>
  );
}

export function AreaRequiredView({ target }: { target: "projects" | "resources" }) {
  const router = useLocalRouter();
  const label = target === "projects" ? "Projects" : "Resources";

  return (
    <div data-testid="area-required" className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <section className="cos-surface p-5">
        <div className="flex items-start gap-3">
          <Boxes className="mt-0.5 h-5 w-5 shrink-0 text-[var(--cos-primary)]" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-[var(--cos-text-strong)]">Create an active Area first</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--cos-text-muted)]">{label} belong to an Area. Add or restore one before creating {target}.</p>
            <button type="button" onClick={() => router.push("/areas")} className="cos-btn cos-btn-primary mt-4 min-h-10 px-4 py-2 text-sm">
              Manage Areas <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
