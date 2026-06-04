"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  CheckSquare,
  Code2,
  FileText,
  Heading1,
  Heading2,
  List,
  Quote,
  Send,
  SquarePen,
  Type,
  Zap,
  type LucideIcon
} from "lucide-react";

type BlockKind = "paragraph" | "h1" | "h2" | "bullet" | "checkbox" | "quote" | "code-fence";
type CaptureCommand = "task" | "note" | "project" | "deadline" | "status";

interface MarkdownEditorProps {
  value: string;
  placeholder: string;
  className?: string;
  dataTestId?: string;
  minLines?: number;
  onSave: (value: string) => void;
  onCaptureLine?: (line: string) => void;
}

interface ParsedBlock {
  kind: BlockKind;
  text: string;
  checked?: boolean;
}

interface SlashCommand {
  command: string;
  label: string;
  icon: LucideIcon;
  kind: "format" | "capture";
  capture?: CaptureCommand;
}

const formatCommands: SlashCommand[] = [
  { command: "/text", label: "Text", icon: Type, kind: "format" },
  { command: "/h1", label: "Heading", icon: Heading1, kind: "format" },
  { command: "/h2", label: "Subheading", icon: Heading2, kind: "format" },
  { command: "/todo", label: "Checkbox", icon: CheckSquare, kind: "format" },
  { command: "/bullet", label: "List", icon: List, kind: "format" },
  { command: "/quote", label: "Quote", icon: Quote, kind: "format" },
  { command: "/code", label: "Code", icon: Code2, kind: "format" }
];

const captureCommands: SlashCommand[] = [
  { command: "/task", label: "Task", icon: CheckSquare, kind: "capture", capture: "task" },
  { command: "/note", label: "Note", icon: FileText, kind: "capture", capture: "note" },
  { command: "/project", label: "Project", icon: SquarePen, kind: "capture", capture: "project" },
  { command: "/deadline", label: "Deadline", icon: Calendar, kind: "capture", capture: "deadline" },
  { command: "/status", label: "Status", icon: Zap, kind: "capture", capture: "status" }
];

function parseBlock(line: string): ParsedBlock {
  const checkbox = line.match(/^- \[( |x|X)\]\s?(.*)$/);
  if (checkbox) return { kind: "checkbox", checked: checkbox[1].toLowerCase() === "x", text: checkbox[2] ?? "" };
  if (line.startsWith("## ")) return { kind: "h2", text: line.slice(3) };
  if (line.startsWith("# ")) return { kind: "h1", text: line.slice(2) };
  if (line.startsWith("- ")) return { kind: "bullet", text: line.slice(2) };
  if (line.startsWith("> ")) return { kind: "quote", text: line.slice(2) };
  if (line.startsWith("```")) return { kind: "code-fence", text: line.slice(3) };
  return { kind: "paragraph", text: line };
}

function lineFromBlock(block: ParsedBlock, text: string) {
  if (block.kind === "h1") return `# ${text}`;
  if (block.kind === "h2") return `## ${text}`;
  if (block.kind === "bullet") return `- ${text}`;
  if (block.kind === "checkbox") return `- [${block.checked ? "x" : " "}] ${text}`;
  if (block.kind === "quote") return `> ${text}`;
  if (block.kind === "code-fence") return `\`\`\`${text}`;
  return text;
}

function stripSlashBody(line: string, command: string) {
  const trimmed = line.trim();
  if (trimmed.toLowerCase().startsWith(`${command} `)) return trimmed.slice(command.length).trim();
  if (trimmed.toLowerCase() === command) return "";
  return trimmed.replace(/^\/[a-z0-9-]+/i, "").trim();
}

function formatSlashLine(line: string, command: SlashCommand) {
  const body = stripSlashBody(line, command.command);
  if (command.command === "/h1") return [`# ${body}`];
  if (command.command === "/h2") return [`## ${body}`];
  if (command.command === "/todo") return [`- [ ] ${body}`];
  if (command.command === "/bullet") return [`- ${body}`];
  if (command.command === "/quote") return [`> ${body}`];
  if (command.command === "/code") return ["```", body, "```"];
  return [body];
}

function captureReplacement(command: CaptureCommand, body: string) {
  if (command === "task" || command === "deadline") return `- [ ] ${body}`;
  if (command === "project") return `## ${body}`;
  return body;
}

function blockPlaceholder(kind: BlockKind, fallback: string, isFirstLine: boolean) {
  if (kind === "h1") return "Heading";
  if (kind === "h2") return "Subheading";
  if (kind === "bullet") return "List item";
  if (kind === "checkbox") return "To-do";
  if (kind === "quote") return "Quote";
  if (kind === "code-fence") return "Code fence";
  return isFirstLine ? fallback : "Type / for commands";
}

function slashQuery(line: string) {
  const trimmed = line.trimStart();
  if (!trimmed.startsWith("/")) return null;
  return trimmed.slice(1).split(/\s+/)[0].toLowerCase();
}

export function MarkdownEditor({
  value,
  placeholder,
  className = "",
  dataTestId,
  minLines = 1,
  onSave,
  onCaptureLine
}: MarkdownEditorProps) {
  const [draft, setDraft] = useState(value);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [capturedFlash, setCapturedFlash] = useState(false);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const dirty = draft !== value;

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const lines = useMemo(() => {
    const parsed = draft.split("\n");
    while (parsed.length < minLines) parsed.push("");
    return parsed;
  }, [draft, minLines]);

  const commands = onCaptureLine ? [...formatCommands, ...captureCommands] : formatCommands;

  function focusLine(index: number) {
    window.setTimeout(() => inputRefs.current[index]?.focus(), 0);
  }

  function commit(nextDraft = draft) {
    if (nextDraft === value) return;
    onSave(nextDraft);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1200);
  }

  function replaceLines(nextLines: string[], options?: { commit?: boolean; focusIndex?: number }) {
    const nextDraft = nextLines.join("\n");
    setDraft(nextDraft);
    if (options?.commit) commit(nextDraft);
    if (options?.focusIndex !== undefined) focusLine(options.focusIndex);
  }

  function updateLine(index: number, nextLine: string) {
    replaceLines(lines.map((line, lineIndex) => (lineIndex === index ? nextLine : line)));
  }

  function insertLineAfter(index: number) {
    const nextLines = [...lines.slice(0, index + 1), "", ...lines.slice(index + 1)];
    replaceLines(nextLines, { focusIndex: index + 1 });
  }

  function removeLine(index: number) {
    if (lines.length <= 1) return;
    const nextLines = lines.filter((_, lineIndex) => lineIndex !== index);
    replaceLines(nextLines, { focusIndex: Math.max(0, index - 1) });
  }

  function applyCommand(index: number, command: SlashCommand) {
    const currentLine = lines[index] ?? "";
    if (command.kind === "capture" && command.capture && onCaptureLine) {
      const body = stripSlashBody(currentLine, command.command);
      if (!body) return;
      onCaptureLine(`${command.command} ${body}`);
      const nextLines = lines.map((line, lineIndex) => (lineIndex === index ? captureReplacement(command.capture!, body) : line));
      replaceLines(nextLines, { focusIndex: index });
      setCapturedFlash(true);
      window.setTimeout(() => setCapturedFlash(false), 1200);
      return;
    }

    const formatted = formatSlashLine(currentLine, command);
    const nextLines = [...lines.slice(0, index), ...formatted, ...lines.slice(index + 1)];
    replaceLines(nextLines, { focusIndex: index + Math.min(formatted.length - 1, 1) });
  }

  function matchingCommand(line: string) {
    const trimmed = line.trim().toLowerCase();
    return commands.find((command) => trimmed === command.command || trimmed.startsWith(`${command.command} `));
  }

  function commandMatches(line: string) {
    const query = slashQuery(line);
    if (query === null) return [];
    return commands.filter((command) => command.command.slice(1).startsWith(query)).slice(0, 8);
  }

  return (
    <div data-testid={dataTestId} className={`markdown-editor rounded-lg border border-slate-200 bg-white p-3 shadow-sm ${className}`}>
      <div className="space-y-1">
        {lines.map((line, index) => {
          const block = parseBlock(line);
          const choices = activeIndex === index ? commandMatches(line) : [];
          const lineTestId = dataTestId ? `${dataTestId}-line-${index}` : undefined;
          const textClass =
            block.kind === "h1"
              ? "text-xl font-bold text-slate-950"
              : block.kind === "h2"
                ? "text-base font-semibold text-slate-900"
                : block.kind === "quote"
                  ? "italic text-slate-700"
                  : block.kind === "code-fence"
                    ? "font-mono text-xs text-slate-600"
                    : block.kind === "checkbox" && block.checked
                      ? "text-slate-400 line-through"
                      : "text-slate-800";

          return (
            <div key={`${index}-${lineTestId ?? "line"}`} data-markdown-line={index} className="markdown-block group relative rounded-md px-2 py-1 transition-colors hover:bg-slate-50 focus-within:bg-slate-50">
              <div className="flex min-h-8 items-center gap-2">
                {block.kind === "bullet" ? <span className="w-4 text-center text-slate-400">-</span> : null}
                {block.kind === "quote" ? <span className="h-6 w-1 rounded-full bg-indigo-200" /> : null}
                {block.kind === "checkbox" ? (
                  <input
                    type="checkbox"
                    checked={Boolean(block.checked)}
                    onChange={(event) => updateLine(index, lineFromBlock({ ...block, checked: event.target.checked }, block.text))}
                    className="h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600"
                    aria-label="Toggle markdown checkbox"
                  />
                ) : null}
                {block.kind === "code-fence" ? <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">```</span> : null}
                <input
                  ref={(element) => {
                    inputRefs.current[index] = element;
                  }}
                  data-testid={lineTestId}
                  value={block.text}
                  onFocus={() => setActiveIndex(index)}
                  onChange={(event) => updateLine(index, lineFromBlock(block, event.target.value))}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                      event.preventDefault();
                      commit();
                      return;
                    }
                    if (event.key === "Enter") {
                      event.preventDefault();
                      const command = matchingCommand(line);
                      if (command) {
                        applyCommand(index, command);
                      } else {
                        insertLineAfter(index);
                      }
                    }
                    if (event.key === "Backspace" && !block.text && !line.trim()) {
                      event.preventDefault();
                      removeLine(index);
                    }
                    if (event.key === "Escape") {
                      setDraft(value);
                      setActiveIndex(null);
                    }
                  }}
                  placeholder={blockPlaceholder(block.kind, placeholder, index === 0)}
                  className={`markdown-line-input min-w-0 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-slate-400 ${textClass}`}
                />
              </div>
              {choices.length ? (
                <div className="absolute left-2 top-full z-20 mt-1 grid w-64 gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                  {choices.map((command) => {
                    const Icon = command.icon;
                    return (
                      <button
                        key={command.command}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => applyCommand(index, command)}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="w-16 text-slate-400">{command.command}</span>
                        <span>{command.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-2 text-[11px]">
        {capturedFlash ? <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700">Captured</span> : null}
        {dirty ? <span className="text-amber-600">Unsaved changes</span> : savedFlash ? <span className="text-emerald-600">Saved</span> : null}
        <button
          type="button"
          disabled={!dirty}
          onClick={() => commit()}
          className="inline-flex items-center gap-1 rounded px-2 py-1 font-semibold text-indigo-600 hover:bg-indigo-50 disabled:text-slate-300 disabled:hover:bg-transparent"
        >
          <Send className="h-3.5 w-3.5" />
          Save
        </button>
      </div>
    </div>
  );
}
