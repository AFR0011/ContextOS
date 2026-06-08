"use client";

import type { ComponentType } from "react";
import {
  Calendar,
  CheckSquare,
  Code2,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListCollapse,
  ListOrdered,
  Minus,
  Quote,
  SquarePen,
  Type,
  Zap
} from "lucide-react";
import type { BlockType, CaptureCommand } from "./editorTypes";

export interface CommandItem {
  command: string;
  label: string;
  description: string;
  searchKeys: string[];
  icon: ComponentType<{ className?: string }>;
  kind: "format" | "capture";
  type?: BlockType;
  capture?: CaptureCommand;
}

export const FORMAT_COMMANDS: CommandItem[] = [
  {
    command: "/text",
    type: "paragraph",
    label: "Text",
    description: "Plain writing block",
    searchKeys: ["text", "paragraph", "p", "normal"],
    icon: Type,
    kind: "format"
  },
  {
    command: "/h1",
    type: "heading1",
    label: "Heading 1",
    description: "Top-level section heading",
    searchKeys: ["h1", "heading1", "large", "title"],
    icon: Heading1,
    kind: "format"
  },
  {
    command: "/h2",
    type: "heading2",
    label: "Heading 2",
    description: "Medium section heading",
    searchKeys: ["h2", "heading2", "medium", "subtitle"],
    icon: Heading2,
    kind: "format"
  },
  {
    command: "/h3",
    type: "heading3",
    label: "Heading 3",
    description: "Small section heading",
    searchKeys: ["h3", "heading3", "small", "subheading"],
    icon: Heading3,
    kind: "format"
  },
  {
    command: "/toggle-h1",
    type: "toggleHeading1",
    label: "Toggle Heading 1",
    description: "Collapsible top-level section",
    searchKeys: ["toggle", "toggleh1", "th1", "details", "collapse", "h1"],
    icon: ListCollapse,
    kind: "format"
  },
  {
    command: "/toggle-h2",
    type: "toggleHeading2",
    label: "Toggle Heading 2",
    description: "Collapsible medium section",
    searchKeys: ["toggle", "toggleh2", "th2", "details", "collapse", "h2"],
    icon: ListCollapse,
    kind: "format"
  },
  {
    command: "/toggle-h3",
    type: "toggleHeading3",
    label: "Toggle Heading 3",
    description: "Collapsible small section",
    searchKeys: ["toggle", "toggleh3", "th3", "details", "collapse", "h3"],
    icon: ListCollapse,
    kind: "format"
  },
  {
    command: "/bullet",
    type: "bullet",
    label: "Bullet list",
    description: "Simple unordered list",
    searchKeys: ["bullet", "list", "unordered", "ul", "-"],
    icon: List,
    kind: "format"
  },
  {
    command: "/number",
    type: "numbered",
    label: "Numbered list",
    description: "Sequential ordered list",
    searchKeys: ["number", "numbered", "list", "ordered", "ol", "1"],
    icon: ListOrdered,
    kind: "format"
  },
  {
    command: "/todo",
    type: "todo",
    label: "To-do list",
    description: "Checklist item",
    searchKeys: ["todo", "task", "checkbox", "check", "completed", "[ ]"],
    icon: CheckSquare,
    kind: "format"
  },
  {
    command: "/quote",
    type: "quote",
    label: "Quote",
    description: "Indented quote block",
    searchKeys: ["quote", "blockquote", "cite", ">"],
    icon: Quote,
    kind: "format"
  },
  {
    command: "/code",
    type: "code",
    label: "Code block",
    description: "Multiline fenced code",
    searchKeys: ["code", "pre", "javascript", "typescript", "ts", "js", "coding"],
    icon: Code2,
    kind: "format"
  },
  {
    command: "/divider",
    type: "divider",
    label: "Divider",
    description: "Horizontal separator",
    searchKeys: ["divider", "line", "separator", "hr", "---"],
    icon: Minus,
    kind: "format"
  }
];

export const CAPTURE_COMMANDS: CommandItem[] = [
  {
    command: "/task",
    label: "Task",
    description: "Capture a structured task",
    searchKeys: ["task", "todo", "capture"],
    icon: CheckSquare,
    kind: "capture",
    capture: "task"
  },
  {
    command: "/note",
    label: "Note",
    description: "Capture a note",
    searchKeys: ["note", "resource", "capture"],
    icon: FileText,
    kind: "capture",
    capture: "note"
  },
  {
    command: "/project",
    label: "Project",
    description: "Capture a project",
    searchKeys: ["project", "outcome", "capture"],
    icon: SquarePen,
    kind: "capture",
    capture: "project"
  },
  {
    command: "/deadline",
    label: "Deadline",
    description: "Capture a dated item",
    searchKeys: ["deadline", "date", "calendar", "capture"],
    icon: Calendar,
    kind: "capture",
    capture: "deadline"
  },
  {
    command: "/status",
    label: "Status",
    description: "Capture a project status note",
    searchKeys: ["status", "update", "capture"],
    icon: Zap,
    kind: "capture",
    capture: "status"
  }
];

interface SlashCommandMenuProps {
  selectedIndex: number;
  onSelect: (command: CommandItem) => void;
  filteredCommands: CommandItem[];
}

export function SlashCommandMenu({ selectedIndex, onSelect, filteredCommands }: SlashCommandMenuProps) {
  if (!filteredCommands.length) {
    return (
      <div className="absolute left-2 top-full z-30 mt-1 w-72 rounded-lg border border-[var(--cos-border)] bg-[var(--cos-bg-elevated)] p-2 text-xs shadow-[var(--cos-shadow-md)]">
        <div className="px-2 py-1 font-semibold uppercase tracking-[0.14em] text-[var(--cos-text-subtle)]">Basic Blocks</div>
        <div className="px-2 py-3 text-center text-[var(--cos-text-muted)]">No matching blocks found</div>
      </div>
    );
  }

  return (
    <div className="absolute left-2 top-full z-30 mt-1 max-h-80 w-72 overflow-y-auto rounded-lg border border-[var(--cos-border)] bg-[var(--cos-bg-elevated)] p-1 shadow-[var(--cos-shadow-md)]">
      <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--cos-text-subtle)]">Basic Blocks</div>
      {filteredCommands.map((command, index) => {
        const Icon = command.icon;
        const active = index === selectedIndex;
        return (
          <button
            key={command.command}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(command)}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left ${active ? "bg-[var(--cos-primary-soft)] text-[var(--cos-primary-text)]" : "text-[var(--cos-text)] hover:bg-[var(--cos-bg-soft)]"}`}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[var(--cos-bg-inset)] text-[var(--cos-primary)]">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{command.label}</span>
              <span className="block truncate text-xs text-[var(--cos-text-muted)]">{command.description}</span>
            </span>
            <span className="text-[10px] font-semibold text-[var(--cos-text-subtle)]">{command.command}</span>
          </button>
        );
      })}
    </div>
  );
}
