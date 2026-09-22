"use client";

import { useState } from "react";
import { Archive, Plus, RotateCcw } from "lucide-react";
import { EmptyState, PageHeader, Section } from "@/components/workspace/ProductPrimitives";
import { useWorkspace } from "@/lib/client-store";
import { useLocalRouter as useRouter } from "@/lib/local-router";

function AreaRow({
  name,
  projectCount,
  taskCount,
  archived,
  onOpen,
  onArchive,
  onRestore
}: {
  name: string;
  projectCount: number;
  taskCount: number;
  archived?: boolean;
  onOpen: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
}) {
  return (
    <div className={`cos-entity-row ${archived ? "opacity-70" : ""}`}>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span className="block break-words text-sm font-semibold text-[var(--cos-text-strong)] [overflow-wrap:anywhere]">{name}</span>
        <span className="mt-1 block text-xs text-[var(--cos-text-subtle)]">
          {projectCount} active project{projectCount === 1 ? "" : "s"} · {taskCount} direct open task{taskCount === 1 ? "" : "s"}
        </span>
      </button>
      {onArchive ? (
        <button type="button" onClick={onArchive} aria-label={`Archive ${name}`} className="cos-btn cos-btn-ghost min-h-10 shrink-0 px-3 py-2 text-xs">
          <Archive className="h-3.5 w-3.5" /> Archive
        </button>
      ) : null}
      {onRestore ? (
        <button type="button" onClick={onRestore} aria-label={`Restore ${name}`} className="cos-btn cos-btn-ghost min-h-10 shrink-0 px-3 py-2 text-xs">
          <RotateCcw className="h-3.5 w-3.5" /> Restore
        </button>
      ) : null}
    </div>
  );
}

export function AreasView() {
  const router = useRouter();
  const { data, loading, addArea, updateArea } = useWorkspace();
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");

  const activeAreas = data.areas.filter((area) => area.state === "active");
  const archivedAreas = data.areas.filter((area) => area.state === "archived");

  function counts(areaId: string) {
    const projectCount = data.projects.filter((project) => project.areaId === areaId && project.state === "active").length;
    const taskCount = data.tasks.filter(
      (task) => task.state === "open" && task.parent.type === "area" && task.parent.areaId === areaId
    ).length;
    return { projectCount, taskCount };
  }

  function createArea() {
    const trimmed = name.trim();
    if (!trimmed) return;
    addArea(trimmed);
    setName("");
    setShowNew(false);
  }

  return (
    <div className="cos-page">
      <PageHeader
        eyebrow="Work"
        title="Areas"
        description="Long-lived domains of responsibility. Areas organize Projects and direct Tasks; they are not analytics dashboards."
        action={<button type="button" onClick={() => setShowNew(true)} className="cos-btn cos-btn-primary px-4 py-2 text-sm"><Plus className="h-4 w-4" /> New Area</button>}
      />

      {showNew ? (
        <section className="cos-surface mb-6 flex flex-col gap-2 p-4 sm:flex-row">
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && createArea()}
            placeholder="Area name"
            className="cos-input min-w-0 flex-1 px-3 py-2 text-sm"
          />
          <button type="button" onClick={createArea} disabled={!name.trim()} className="cos-btn cos-btn-primary px-4 py-2 text-sm disabled:opacity-50">Create Area</button>
          <button type="button" onClick={() => setShowNew(false)} className="cos-btn cos-btn-ghost px-4 py-2 text-sm">Cancel</button>
        </section>
      ) : null}

      {loading ? <EmptyState title="Loading Areas" description="Workspace data is hydrating from local storage or the server." /> : null}

      {!loading ? (
        <>
          <Section title="Active">
            {activeAreas.length ? (
              <div className="space-y-2">
                {activeAreas.map((area) => {
                  const { projectCount, taskCount } = counts(area.id);
                  return (
                    <AreaRow
                      key={area.id}
                      name={area.name}
                      projectCount={projectCount}
                      taskCount={taskCount}
                      onOpen={() => router.push(`/areas/${area.id}`)}
                      onArchive={() => updateArea(area.id, { state: "archived" })}
                    />
                  );
                })}
              </div>
            ) : (
              <EmptyState title="No active Areas" description="Create an Area for a stable responsibility you actually maintain." />
            )}
          </Section>

          <Section title="Archived" description="Archiving an Area does not archive its Projects. Their lifecycle remains independent." className="mt-8">
            {archivedAreas.length ? (
              <div className="space-y-2">
                {archivedAreas.map((area) => {
                  const { projectCount, taskCount } = counts(area.id);
                  return (
                    <AreaRow
                      key={area.id}
                      name={area.name}
                      projectCount={projectCount}
                      taskCount={taskCount}
                      archived
                      onOpen={() => router.push(`/areas/${area.id}`)}
                      onRestore={() => updateArea(area.id, { state: "active" })}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[var(--cos-text-subtle)]">No archived Areas.</p>
            )}
          </Section>
        </>
      ) : null}
    </div>
  );
}
