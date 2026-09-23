"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Boxes,
  CalendarDays,
  CalendarPlus,
  CheckSquare2,
  FileText,
  FolderKanban,
  Home,
  Layers3,
  Search,
  Settings
} from "lucide-react";
import { CommandPalette, DetailSheet, type CommandPaletteItem } from "@/components/workspace/ProductPrimitives";
import { buildCanonicalSearchResults, searchCanonicalResults, type CanonicalSearchKind } from "@/lib/canonical-search";
import { useWorkspace } from "@/lib/client-store";
import { localDateKey } from "@/lib/dates";
import { useLocalRouter } from "@/lib/local-router";

type CreateMode = "task" | "date" | null;

function resultIcon(kind: CanonicalSearchKind) {
  if (kind === "project") return <FolderKanban className="h-4 w-4" />;
  if (kind === "area") return <Layers3 className="h-4 w-4" />;
  if (kind === "task") return <CheckSquare2 className="h-4 w-4" />;
  if (kind === "date") return <CalendarDays className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

export function WorkspaceCommandPalette() {
  const router = useLocalRouter();
  const { data, addTask, addDate } = useWorkspace();
  const canonical = data;
  const today = localDateKey();
  const searchIndex = useMemo(() => buildCanonicalSearchResults(canonical, today), [canonical, today]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const paletteOpenerRef = useRef<HTMLElement | null>(null);
  const [createMode, setCreateMode] = useState<CreateMode>(null);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskParent, setTaskParent] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  const [dateTitle, setDateTitle] = useState("");
  const [dateKind, setDateKind] = useState<"event" | "deadline">("event");
  const [dateParent, setDateParent] = useState("");
  const [dateValue, setDateValue] = useState(today);
  const [dateStartTime, setDateStartTime] = useState("");
  const [dateEndTime, setDateEndTime] = useState("");
  const [dateDetails, setDateDetails] = useState("");

  const activeProjects = canonical.projects.filter((project) => project.state === "active");
  const activeAreas = canonical.areas.filter((area) => area.state === "active");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCreateMode(null);
        setOpen((value) => {
          if (!value) {
            paletteOpenerRef.current = document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
          }
          return !value;
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function closePalette() {
    setOpen(false);
    setQuery("");
    restorePaletteOpenerFocus();
  }

  function navigate(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  function startCreate(mode: Exclude<CreateMode, null>) {
    setOpen(false);
    setCreateMode(mode);
  }

  function restorePaletteOpenerFocus() {
    const opener = paletteOpenerRef.current;
    window.requestAnimationFrame(() => {
      if (opener?.isConnected) opener.focus();
    });
  }

  const navigationCommands = useMemo<CommandPaletteItem[]>(() => [
    { id: "command-new-task", label: "New Task", hint: "Create", icon: <CheckSquare2 className="h-4 w-4" />, onSelect: () => startCreate("task") },
    { id: "command-new-date", label: "New Date", hint: "Create", icon: <CalendarPlus className="h-4 w-4" />, onSelect: () => startCreate("date") },
    { id: "nav-home", label: "Home", hint: "Go to", icon: <Home className="h-4 w-4" />, onSelect: () => navigate("/dashboard") },
    { id: "nav-projects", label: "Projects", hint: "Go to", icon: <FolderKanban className="h-4 w-4" />, onSelect: () => navigate("/projects") },
    { id: "nav-areas", label: "Areas", hint: "Go to", icon: <Layers3 className="h-4 w-4" />, onSelect: () => navigate("/areas") },
    { id: "nav-dates", label: "Dates", hint: "Go to", icon: <CalendarDays className="h-4 w-4" />, onSelect: () => navigate("/dates") },
    { id: "nav-search", label: "Search", hint: "Go to", icon: <Search className="h-4 w-4" />, onSelect: () => navigate("/search") },
    { id: "nav-lifeos", label: "LifeOS", hint: "Go to", icon: <Boxes className="h-4 w-4" />, onSelect: () => navigate("/lifeos") },
    { id: "nav-settings", label: "Settings", hint: "Go to", icon: <Settings className="h-4 w-4" />, onSelect: () => navigate("/settings") }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const paletteItems = useMemo<CommandPaletteItem[]>(() => {
    const q = query.trim().toLowerCase();
    const commands = q
      ? navigationCommands.filter((item) => item.label.toLowerCase().includes(q) || item.hint?.toLowerCase().includes(q))
      : navigationCommands;

    const matches = searchCanonicalResults(searchIndex, query, 12).map<CommandPaletteItem>((result) => ({
      id: `result-${result.key}`,
      label: result.title,
      hint: result.typeLabel,
      icon: resultIcon(result.kind),
      onSelect: () => {
        const params = new URLSearchParams();
        params.set("q", query.trim() || result.title);
        params.set("selected", result.key);
        navigate(`/search?${params.toString()}`);
      }
    }));

    return [...commands, ...matches].slice(0, 20);
  }, [navigationCommands, query, searchIndex]);

  function resetTask() {
    setTaskTitle("");
    setTaskParent("");
    setPlannedDate("");
    setScheduledTime("");
  }

  function closeTaskCreate() {
    resetTask();
    setCreateMode(null);
    restorePaletteOpenerFocus();
  }

  function createTask() {
    const title = taskTitle.trim();
    if (!title || !taskParent) return;
    const [type, id] = taskParent.split(":");
    addTask({
      title,
      parent: type === "project" ? { type: "project", projectId: id } : { type: "area", areaId: id },
      plannedDate: plannedDate || null,
      scheduledTime: plannedDate ? scheduledTime || null : null
    });
    closeTaskCreate();
  }

  function resetDate() {
    setDateTitle("");
    setDateKind("event");
    setDateParent("");
    setDateValue(localDateKey());
    setDateStartTime("");
    setDateEndTime("");
    setDateDetails("");
  }

  function closeDateCreate() {
    resetDate();
    setCreateMode(null);
    restorePaletteOpenerFocus();
  }

  function createDate() {
    const title = dateTitle.trim();
    if (!title || !dateParent || !dateValue) return;
    const [type, id] = dateParent.split(":");
    addDate({
      title,
      kind: dateKind,
      date: dateValue,
      startTime: dateStartTime || null,
      endTime: dateKind === "event" ? dateEndTime || null : null,
      details: dateDetails.trim(),
      parent: type === "project" ? { type: "project", projectId: id } : { type: "area", areaId: id }
    });
    closeDateCreate();
  }

  return (
    <>
      <CommandPalette
        open={open}
        query={query}
        onQueryChange={setQuery}
        items={paletteItems}
        onClose={closePalette}
      />

      <DetailSheet
        open={createMode === "task"}
        title="New Task"
        description="Create an Open Task in a Project or Area."
        onClose={closeTaskCreate}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeTaskCreate} className="cos-btn cos-btn-ghost px-4 py-2 text-sm">Cancel</button>
            <button type="button" onClick={createTask} disabled={!taskTitle.trim() || !taskParent} className="cos-btn cos-btn-primary px-4 py-2 text-sm disabled:opacity-50">Create Task</button>
          </div>
        }
      >
        <div data-testid="palette-task-create" className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Title</span>
            <input autoFocus value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Task title" className="cos-input w-full px-3 py-2 text-sm" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Context</span>
            <select value={taskParent} onChange={(event) => setTaskParent(event.target.value)} className="cos-input w-full px-3 py-2 text-sm">
              <option value="">Choose Project or Area…</option>
              {activeProjects.length ? <optgroup label="Projects">{activeProjects.map((project) => <option key={project.id} value={`project:${project.id}`}>{project.name}</option>)}</optgroup> : null}
              {activeAreas.length ? <optgroup label="Areas">{activeAreas.map((area) => <option key={area.id} value={`area:${area.id}`}>{area.name}</option>)}</optgroup> : null}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Planned day</span>
              <input type="date" value={plannedDate} onChange={(event) => { setPlannedDate(event.target.value); if (!event.target.value) setScheduledTime(""); }} className="cos-input w-full px-3 py-2 text-sm" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Scheduled time</span>
              <input type="time" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} disabled={!plannedDate} className="cos-input w-full px-3 py-2 text-sm disabled:opacity-45" />
            </label>
          </div>
        </div>
      </DetailSheet>

      <DetailSheet
        open={createMode === "date"}
        title="New Date"
        description="Create an Event or external Deadline in a Project or Area."
        onClose={closeDateCreate}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeDateCreate} className="cos-btn cos-btn-ghost px-4 py-2 text-sm">Cancel</button>
            <button type="button" onClick={createDate} disabled={!dateTitle.trim() || !dateParent || !dateValue} className="cos-btn cos-btn-primary px-4 py-2 text-sm disabled:opacity-50">Create Date</button>
          </div>
        }
      >
        <div data-testid="palette-date-create" className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Title</span>
            <input autoFocus value={dateTitle} onChange={(event) => setDateTitle(event.target.value)} placeholder="Date title" className="cos-input w-full px-3 py-2 text-sm" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Kind</span>
              <select
                value={dateKind}
                onChange={(event) => {
                  const next = event.target.value as "event" | "deadline";
                  setDateKind(next);
                  if (next === "deadline") setDateEndTime("");
                }}
                className="cos-input w-full px-3 py-2 text-sm"
              >
                <option value="event">Event</option>
                <option value="deadline">Deadline</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Context</span>
              <select value={dateParent} onChange={(event) => setDateParent(event.target.value)} className="cos-input w-full px-3 py-2 text-sm">
                <option value="">Choose Project or Area…</option>
                {activeProjects.length ? <optgroup label="Projects">{activeProjects.map((project) => <option key={project.id} value={`project:${project.id}`}>{project.name}</option>)}</optgroup> : null}
                {activeAreas.length ? <optgroup label="Areas">{activeAreas.map((area) => <option key={area.id} value={`area:${area.id}`}>{area.name}</option>)}</optgroup> : null}
              </select>
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Date</span>
            <input type="date" value={dateValue} onChange={(event) => setDateValue(event.target.value)} className="cos-input w-full px-3 py-2 text-sm" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[var(--cos-text-muted)]">{dateKind === "event" ? "Start" : "Time"}</span>
              <input type="time" value={dateStartTime} onChange={(event) => setDateStartTime(event.target.value)} className="cos-input w-full px-3 py-2 text-sm" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[var(--cos-text-muted)]">End</span>
              <input type="time" value={dateEndTime} onChange={(event) => setDateEndTime(event.target.value)} disabled={dateKind === "deadline"} className="cos-input w-full px-3 py-2 text-sm disabled:opacity-45" />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Details</span>
            <textarea value={dateDetails} onChange={(event) => setDateDetails(event.target.value)} rows={3} className="cos-input w-full resize-y px-3 py-2 text-sm" />
          </label>
        </div>
      </DetailSheet>
    </>
  );
}
