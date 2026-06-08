"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  Eraser,
  GripVertical,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListCollapse,
  ListOrdered,
  Minus,
  Plus,
  Quote,
  Send,
  Trash2,
  Type
} from "lucide-react";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import type { BlockMarkdownEditorProps, BlockType, CaptureCommand, EditorBlock } from "./editorTypes";
import {
  changeBlockType,
  createEmptyBlock,
  generateId,
  headingLevel,
  hiddenBlockIdsForCollapsedToggles,
  isToggleHeadingType,
  markdownShortcutToBlock,
  parseMarkdownToBlocks,
  serializeBlocksToMarkdown,
  toggleGroupEndIndex
} from "./markdownBlocks";
import {
  CAPTURE_COMMANDS,
  FORMAT_COMMANDS,
  SlashCommandMenu,
  type CommandItem
} from "./SlashCommandMenu";

interface AutoGrowingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onResize?: () => void;
}

const AutoGrowingTextarea = forwardRef<HTMLTextAreaElement, AutoGrowingTextareaProps>(
  ({ onChange, ...props }, ref) => {
    const localRef = useRef<HTMLTextAreaElement | null>(null);

    const setRefs = (element: HTMLTextAreaElement | null) => {
      localRef.current = element;
      if (typeof ref === "function") ref(element);
      else if (ref) ref.current = element;
    };

    const adjustHeight = () => {
      const textarea = localRef.current;
      if (!textarea) return;
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    };

    useEffect(() => {
      adjustHeight();
    }, [props.value]);

    return (
      <textarea
        ref={setRefs}
        rows={1}
        {...props}
        onChange={(event) => {
          adjustHeight();
          onChange?.(event);
        }}
      />
    );
  }
);
AutoGrowingTextarea.displayName = "AutoGrowingTextarea";

interface SlashCommandState {
  blockId: string;
  query: string;
  triggerIndex: number;
}

const transformItems: { type: BlockType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: "paragraph", label: "Text", icon: Type },
  { type: "heading1", label: "Heading 1", icon: Heading1 },
  { type: "heading2", label: "Heading 2", icon: Heading2 },
  { type: "heading3", label: "Heading 3", icon: Heading3 },
  { type: "toggleHeading1", label: "Toggle Heading 1", icon: ListCollapse },
  { type: "toggleHeading2", label: "Toggle Heading 2", icon: ListCollapse },
  { type: "toggleHeading3", label: "Toggle Heading 3", icon: ListCollapse },
  { type: "bullet", label: "Bullet list", icon: List },
  { type: "numbered", label: "Numbered list", icon: ListOrdered },
  { type: "todo", label: "To-do list", icon: CheckSquare },
  { type: "quote", label: "Quote", icon: Quote },
  { type: "code", label: "Code block", icon: Code2 },
  { type: "divider", label: "Divider", icon: Minus }
];

function commandBody(text: string, command: string, triggerIndex = 0) {
  const afterSlash = text.slice(triggerIndex).trim();
  const exact = afterSlash.toLowerCase();
  if (exact === command) return "";
  if (exact.startsWith(`${command} `)) return afterSlash.slice(command.length).trim();
  return afterSlash.replace(/^\/[a-z0-9-]+/i, "").trim();
}

function captureReplacement(capture: CaptureCommand, body: string, block: EditorBlock): EditorBlock {
  if (capture === "task" || capture === "deadline") {
    return {
      ...changeBlockType(block, "todo"),
      text: body,
      checked: false
    };
  }

  if (capture === "project") {
    return {
      ...changeBlockType(block, "heading2"),
      text: body
    };
  }

  return {
    ...changeBlockType(block, "paragraph"),
    text: body
  };
}

function commandForLine(text: string, commands: CommandItem[]) {
  const trimmed = text.trim().toLowerCase();
  return commands.find((command) => trimmed === command.command || trimmed.startsWith(`${command.command} `));
}

function blockInputClass(block: EditorBlock, mode: "full" | "compact") {
  const base = "min-h-8 w-full resize-none overflow-hidden bg-transparent px-2 py-1 text-sm leading-6 text-[var(--cos-text)] outline-none placeholder:text-[var(--cos-text-subtle)]";

  if (block.type === "heading1") {
    return `${base} ${mode === "compact" ? "text-base" : "text-xl"} font-bold leading-tight text-[var(--cos-text-strong)]`;
  }
  if (block.type === "heading2") {
    return `${base} ${mode === "compact" ? "text-sm" : "text-lg"} font-bold leading-tight text-[var(--cos-text-strong)]`;
  }
  if (block.type === "heading3") {
    return `${base} text-base font-semibold leading-tight text-[var(--cos-text-strong)]`;
  }
  if (isToggleHeadingType(block.type)) {
    const level = headingLevel(block.type);
    const size = level === 1 && mode !== "compact" ? "text-xl" : level === 2 && mode !== "compact" ? "text-lg" : "text-base";
    return `${base} ${size} font-bold leading-tight text-[var(--cos-text-strong)]`;
  }
  if (block.type === "quote") {
    return `${base} border-l-4 border-[var(--cos-primary-border)] bg-[var(--cos-bg-soft)] pl-3 italic text-[var(--cos-text-muted)]`;
  }
  if (block.type === "code") {
    return `${base} rounded-b-lg border border-t-0 border-[var(--cos-border)] bg-[var(--cos-bg-inset)] px-3 py-2 font-mono text-xs`;
  }
  if (block.type === "todo" && block.checked) {
    return `${base} text-[var(--cos-text-subtle)] line-through`;
  }

  return base;
}

function placeholderFor(block: EditorBlock, fallback: string) {
  if (block.type === "paragraph") return "Type / for blocks...";
  if (block.type === "heading1") return "Heading 1";
  if (block.type === "heading2") return "Heading 2";
  if (block.type === "heading3") return "Heading 3";
  if (block.type === "toggleHeading1") return "Toggle Heading 1";
  if (block.type === "toggleHeading2") return "Toggle Heading 2";
  if (block.type === "toggleHeading3") return "Toggle Heading 3";
  if (block.type === "quote") return "Quote";
  if (block.type === "code") return "Write code...";
  return fallback;
}

export function BlockMarkdownEditor({
  value,
  onChange,
  onSave,
  placeholder = "Start writing...",
  mode = "full",
  minLines = 1,
  className = "",
  dataTestId = "block-markdown-editor",
  disabled = false,
  hideSaveButton = false,
  footer,
  onCaptureLine,
  blocks: controlledBlocks,
  onBlocksChange,
  validationMessages = {},
  defaultBlockType = "paragraph"
}: BlockMarkdownEditorProps) {
  const isControlled = controlledBlocks !== undefined;
  const [blocks, setBlocks] = useState<EditorBlock[]>(() => controlledBlocks ?? parseMarkdownToBlocks(value));
  const [draftMarkdown, setDraftMarkdown] = useState(value);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [actionMenuBlockId, setActionMenuBlockId] = useState<string | null>(null);
  const [slashCommand, setSlashCommand] = useState<SlashCommandState | null>(null);
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const [savedFlash, setSavedFlash] = useState(false);
  const [capturedFlash, setCapturedFlash] = useState(false);
  const lastEmittedRef = useRef(value);
  const pendingCursorPos = useRef<number | null>(null);
  const blockRefs = useRef<Record<string, HTMLElement | null>>({});

  const commands = useMemo(() => (onCaptureLine ? [...FORMAT_COMMANDS, ...CAPTURE_COMMANDS] : FORMAT_COMMANDS), [onCaptureLine]);
  const hiddenIds = useMemo(() => hiddenBlockIdsForCollapsedToggles(blocks), [blocks]);
  const dirty = draftMarkdown !== value;

  useEffect(() => {
    if (isControlled) return;
    if (value === lastEmittedRef.current) {
      setDraftMarkdown(value);
      return;
    }
    setBlocks(parseMarkdownToBlocks(value));
    setDraftMarkdown(value);
    lastEmittedRef.current = value;
  }, [isControlled, value]);

  useEffect(() => {
    if (!isControlled || !controlledBlocks) return;
    setBlocks(controlledBlocks);
    const serialized = serializeBlocksToMarkdown(controlledBlocks);
    setDraftMarkdown(serialized);
    lastEmittedRef.current = serialized;
  }, [controlledBlocks, isControlled]);

  useEffect(() => {
    if (!focusedBlockId) return;
    const element = blockRefs.current[focusedBlockId];
    if (!element) return;
    element.focus();
    if (element instanceof HTMLTextAreaElement && pendingCursorPos.current !== null) {
      element.setSelectionRange(pendingCursorPos.current, pendingCursorPos.current);
      pendingCursorPos.current = null;
    }
  }, [focusedBlockId, blocks]);

  const filteredCommands = useMemo(() => {
    if (!slashCommand) return [];
    const query = slashCommand.query.toLowerCase();
    return commands.filter((command) => {
      const bareCommand = command.command.slice(1);
      return (
        command.label.toLowerCase().includes(query) ||
        command.description.toLowerCase().includes(query) ||
        bareCommand.includes(query) ||
        command.searchKeys.some((key) => key.includes(query))
      );
    });
  }, [commands, slashCommand]);

  function updateParent(nextBlocks: EditorBlock[]) {
    const serialized = serializeBlocksToMarkdown(nextBlocks);
    lastEmittedRef.current = serialized;
    setDraftMarkdown(serialized);
    if (!isControlled) onChange?.(serialized);
    onBlocksChange?.(nextBlocks);
  }

  function commit(nextMarkdown = draftMarkdown) {
    if (!onSave || nextMarkdown === value) return;
    onSave(nextMarkdown);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1200);
  }

  function setNextBlocks(nextBlocks: EditorBlock[], focusId?: string, cursorPos?: number | null) {
    setBlocks(nextBlocks);
    updateParent(nextBlocks);
    if (focusId) setFocusedBlockId(focusId);
    if (cursorPos !== undefined) pendingCursorPos.current = cursorPos;
  }

  function applyCommandToBlock(blockId: string, command: CommandItem, triggerIndex = 0) {
    const nextBlocks = blocks.map((block) => {
      if (block.id !== blockId) return block;
      const body = commandBody(block.text, command.command, triggerIndex);
      const beforeSlash = block.text.slice(0, triggerIndex).trim();

      if (command.kind === "capture" && command.capture && onCaptureLine) {
        if (!body) return block;
        onCaptureLine(`${command.command} ${body}`);
        setCapturedFlash(true);
        window.setTimeout(() => setCapturedFlash(false), 1200);
        return captureReplacement(command.capture, body, block);
      }

      if (!command.type) return block;
      const transformed = changeBlockType(block, command.type);
      return {
        ...transformed,
        text: body || beforeSlash,
        checked: command.type === "todo" ? false : transformed.checked,
        open: isToggleHeadingType(command.type) ? true : transformed.open
      };
    });

    setSlashCommand(null);
    setSlashSelectedIndex(0);
    setNextBlocks(nextBlocks, blockId);
  }

  function handleBlockTextChange(blockId: string, newText: string, selectionStart: number) {
    let nextSelectionStart = selectionStart;
    const nextBlocks = blocks.map((block) => {
      if (block.id !== blockId) return block;
      const shortcut = markdownShortcutToBlock(block, newText);
      if (shortcut) {
        nextSelectionStart = shortcut.text.length;
        return shortcut;
      }
      return { ...block, text: newText };
    });

    setBlocks(nextBlocks);
    updateParent(nextBlocks);

    const textBeforeCursor = newText.slice(0, nextSelectionStart);
    const lastSlashIndex = textBeforeCursor.lastIndexOf("/");
    if (
      lastSlashIndex !== -1 &&
      (lastSlashIndex === 0 || textBeforeCursor[lastSlashIndex - 1] === " " || textBeforeCursor[lastSlashIndex - 1] === "\n")
    ) {
      const query = textBeforeCursor.slice(lastSlashIndex + 1);
      if (!query.includes(" ")) {
        setSlashCommand({ blockId, query, triggerIndex: lastSlashIndex });
        setSlashSelectedIndex(0);
        return;
      }
    }

    setSlashCommand(null);
  }

  function handleToggleTodo(blockId: string) {
    const nextBlocks = blocks.map((block) => (block.id === blockId ? { ...block, checked: !block.checked } : block));
    setNextBlocks(nextBlocks, blockId);
  }

  function handleToggleOpen(blockId: string) {
    const nextBlocks = blocks.map((block) => (block.id === blockId ? { ...block, open: block.open === false } : block));
    setNextBlocks(nextBlocks, blockId);
  }

  function handleChangeCodeLang(blockId: string, language: string) {
    const nextBlocks = blocks.map((block) => (block.id === blockId ? { ...block, language } : block));
    setNextBlocks(nextBlocks, blockId);
  }

  function handleInsertBlockBelow(blockId: string, type: BlockType = defaultBlockType) {
    const blockIndex = blocks.findIndex((block) => block.id === blockId);
    if (blockIndex === -1) return;
    const targetIndex = blocks[blockIndex].open === false && isToggleHeadingType(blocks[blockIndex].type)
      ? toggleGroupEndIndex(blocks, blockIndex)
      : blockIndex + 1;
    const newBlock = {
      id: generateId(),
      type,
      text: "",
      checked: type === "todo" ? false : undefined,
      language: type === "code" ? "ts" : undefined,
      open: isToggleHeadingType(type) ? true : undefined
    };
    const nextBlocks = [...blocks];
    nextBlocks.splice(targetIndex, 0, newBlock);
    setNextBlocks(nextBlocks, newBlock.id, 0);
  }

  function handleDeleteBlock(blockId: string) {
    if (blocks.length <= 1) {
      const resetBlock = createEmptyBlock(defaultBlockType);
      setNextBlocks([resetBlock], resetBlock.id, 0);
      return;
    }

    const blockIndex = blocks.findIndex((block) => block.id === blockId);
    if (blockIndex === -1) return;
    const nextBlocks = blocks.filter((block) => block.id !== blockId);
    const focusIndex = Math.max(0, blockIndex - 1);
    const focusBlock = nextBlocks[focusIndex];
    setNextBlocks(nextBlocks, focusBlock?.id, focusBlock?.text.length ?? 0);
  }

  function handleMoveBlock(blockId: string, direction: "up" | "down") {
    const index = blocks.findIndex((block) => block.id === blockId);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;
    const nextBlocks = [...blocks];
    [nextBlocks[index], nextBlocks[targetIndex]] = [nextBlocks[targetIndex], nextBlocks[index]];
    setNextBlocks(nextBlocks, blockId);
  }

  function handleDuplicateBlock(blockId: string) {
    const index = blocks.findIndex((block) => block.id === blockId);
    if (index === -1) return;
    const duplicate = { ...blocks[index], id: generateId(), entityRef: undefined };
    const nextBlocks = [...blocks];
    nextBlocks.splice(index + 1, 0, duplicate);
    setNextBlocks(nextBlocks, duplicate.id);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>, block: EditorBlock, index: number) {
    const textarea = event.currentTarget;
    const selectionStart = textarea.selectionStart;
    const textLength = textarea.value.length;

    if (slashCommand && slashCommand.blockId === block.id) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSlashSelectedIndex((current) => (current + 1) % Math.max(1, filteredCommands.length));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSlashSelectedIndex((current) => (current - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const selected = filteredCommands[slashSelectedIndex];
        if (selected) applyCommandToBlock(block.id, selected, slashCommand.triggerIndex);
        else setSlashCommand(null);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setSlashCommand(null);
        return;
      }
    }

    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      commit();
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      if (block.type === "code") return;
      event.preventDefault();

      const typedCommand = commandForLine(block.text, commands);
      if (typedCommand) {
        applyCommandToBlock(block.id, typedCommand, 0);
        return;
      }

      const isList = block.type === "bullet" || block.type === "numbered" || block.type === "todo";
      if (isList && block.text.trim() === "") {
        const nextBlocks = blocks.map((item) => (item.id === block.id ? changeBlockType(item, "paragraph") : item));
        setNextBlocks(nextBlocks, block.id, 0);
        return;
      }

      const textBefore = block.text.slice(0, selectionStart);
      const textAfter = block.text.slice(selectionStart);
      const nextType: BlockType = isList ? block.type : "paragraph";
      const newBlock: EditorBlock = {
        id: generateId(),
        type: nextType,
        text: textAfter,
        checked: nextType === "todo" ? false : undefined
      };
      const nextBlocks = [...blocks];
      nextBlocks[index] = { ...block, text: textBefore };
      nextBlocks.splice(index + 1, 0, newBlock);
      setNextBlocks(nextBlocks, newBlock.id, 0);
      return;
    }

    if (event.key === "Backspace" && selectionStart === 0 && textarea.selectionEnd === 0) {
      event.preventDefault();
      if (block.type !== "paragraph") {
        const nextBlocks = blocks.map((item) => (item.id === block.id ? changeBlockType(item, "paragraph") : item));
        setNextBlocks(nextBlocks, block.id, 0);
        return;
      }
      if (index > 0) {
        const previousBlock = blocks[index - 1];
        if (previousBlock.type === "divider") {
          const nextBlocks = blocks.filter((item) => item.id !== previousBlock.id);
          setNextBlocks(nextBlocks, block.id, 0);
          return;
        }
        const previousLength = previousBlock.text.length;
        const nextBlocks = [...blocks];
        nextBlocks[index - 1] = { ...previousBlock, text: previousBlock.text + block.text };
        nextBlocks.splice(index, 1);
        setNextBlocks(nextBlocks, previousBlock.id, previousLength);
      }
      return;
    }

    if (event.key === "ArrowUp" && selectionStart === 0 && index > 0) {
      event.preventDefault();
      const previousBlock = blocks[index - 1];
      setFocusedBlockId(previousBlock.id);
      pendingCursorPos.current = previousBlock.text.length;
      return;
    }

    if (event.key === "ArrowDown" && selectionStart === textLength && index < blocks.length - 1) {
      event.preventDefault();
      const nextBlock = blocks[index + 1];
      setFocusedBlockId(nextBlock.id);
      pendingCursorPos.current = 0;
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      const isList = block.type === "bullet" || block.type === "numbered" || block.type === "todo";
      if (event.shiftKey && isList) {
        const nextBlocks = blocks.map((item) => (item.id === block.id ? changeBlockType(item, "paragraph") : item));
        setNextBlocks(nextBlocks, block.id);
      } else if (!event.shiftKey) {
        const nextType = block.type === "paragraph" ? "bullet" : block.type === "bullet" ? "numbered" : block.type === "numbered" ? "todo" : null;
        if (nextType) {
          const nextBlocks = blocks.map((item) => (item.id === block.id ? changeBlockType(item, nextType) : item));
          setNextBlocks(nextBlocks, block.id);
        }
      }
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>, block: EditorBlock, index: number) {
    if (block.type === "code") return;
    const pastedText = event.clipboardData.getData("text/plain");
    if (!/[\r\n]/.test(pastedText)) return;

    event.preventDefault();
    const pastedBlocks = parseMarkdownToBlocks(pastedText);
    const textarea = event.currentTarget;
    const textBefore = textarea.value.slice(0, textarea.selectionStart);
    const textAfter = textarea.value.slice(textarea.selectionEnd);
    const nextBlocks = [...blocks];

    if (pastedBlocks.length === 1) {
      nextBlocks[index] = { ...block, text: textBefore + pastedBlocks[0].text + textAfter };
      setNextBlocks(nextBlocks, block.id, textBefore.length + pastedBlocks[0].text.length);
      return;
    }

    const [firstPasted, ...restPasted] = pastedBlocks;
    const middleBlocks = restPasted.slice(0, -1).map((item) => ({ ...item, id: generateId() }));
    const lastPasted = restPasted[restPasted.length - 1];
    const lastBlock = {
      ...lastPasted,
      id: generateId(),
      text: lastPasted.text + textAfter
    };

    nextBlocks[index] = {
      ...block,
      type: firstPasted.type === "paragraph" ? block.type : firstPasted.type,
      text: textBefore + firstPasted.text,
      checked: firstPasted.checked,
      language: firstPasted.language,
      open: firstPasted.open
    };
    nextBlocks.splice(index + 1, 0, ...middleBlocks, lastBlock);
    setNextBlocks(nextBlocks, lastBlock.id, lastPasted.text.length);
  }

  function handleDividerKeyDown(event: React.KeyboardEvent<HTMLDivElement>, index: number) {
    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      handleDeleteBlock(blocks[index].id);
    } else if (event.key === "ArrowUp" && index > 0) {
      event.preventDefault();
      setFocusedBlockId(blocks[index - 1].id);
    } else if (event.key === "ArrowDown" && index < blocks.length - 1) {
      event.preventDefault();
      setFocusedBlockId(blocks[index + 1].id);
    } else if (event.key === "Enter") {
      event.preventDefault();
      handleInsertBlockBelow(blocks[index].id);
    }
  }

  let numberedItemIndex = 1;

  return (
    <div
      data-testid={dataTestId}
      className={`block-markdown-editor cos-surface overflow-visible p-3 ${className}`}
      style={{ minHeight: `${minLines * 32}px` }}
    >
      <div className="space-y-1">
        {blocks.map((block, index) => {
          if (hiddenIds.has(block.id)) return null;
          const isFocused = focusedBlockId === block.id;
          const lineTestId = `${dataTestId}-line-${index}`;
          const inputClassName = blockInputClass(block, mode);
          const validationMessage = validationMessages[block.id];

          if (block.type === "numbered" && (index === 0 || blocks[index - 1].type !== "numbered")) {
            numberedItemIndex = 1;
          }

          const renderPrefix = () => {
            if (isToggleHeadingType(block.type)) {
              const Icon = block.open === false ? ChevronRight : ChevronDown;
              return (
                <button
                  type="button"
                  onClick={() => handleToggleOpen(block.id)}
                  className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-md text-[var(--cos-text-muted)] hover:bg-[var(--cos-bg-inset)] hover:text-[var(--cos-primary-text)]"
                  aria-label={block.open === false ? "Expand toggle heading" : "Collapse toggle heading"}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            }
            if (block.type === "bullet") return <span className="grid h-8 w-7 shrink-0 place-items-center text-[var(--cos-text-subtle)]">-</span>;
            if (block.type === "numbered") {
              const current = numberedItemIndex;
              numberedItemIndex += 1;
              return <span className="grid h-8 w-7 shrink-0 place-items-center text-xs font-medium tabular-nums text-[var(--cos-text-subtle)]">{current}.</span>;
            }
            if (block.type === "todo") {
              return (
                <span className="grid h-8 w-7 shrink-0 place-items-center">
                  <input
                    type="checkbox"
                    checked={Boolean(block.checked)}
                    onChange={() => handleToggleTodo(block.id)}
                    className="h-4 w-4 rounded border-[var(--cos-border-strong)] accent-[var(--cos-primary)]"
                    disabled={disabled}
                    aria-label="Toggle markdown checkbox"
                  />
                </span>
              );
            }
            return null;
          };

          return (
            <div
              key={block.id}
              className={`group relative rounded-md ${isFocused ? "bg-[var(--cos-bg-soft)]" : "hover:bg-[var(--cos-bg-soft)] focus-within:bg-[var(--cos-bg-soft)]"}`}
              onMouseLeave={() => setActionMenuBlockId(null)}
            >
              {!disabled ? (
                <div className="absolute -left-12 top-1 hidden items-center gap-1 opacity-0 transition-opacity group-hover:flex group-hover:opacity-100 group-focus-within:flex group-focus-within:opacity-100 md:flex">
                  <button
                    type="button"
                    onClick={() => handleInsertBlockBelow(block.id)}
                    className="grid h-5 w-5 place-items-center rounded text-[var(--cos-text-subtle)] hover:bg-[var(--cos-bg-inset)] hover:text-[var(--cos-text)]"
                    title="Add block below"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActionMenuBlockId(actionMenuBlockId === block.id ? null : block.id)}
                      className="grid h-5 w-5 place-items-center rounded text-[var(--cos-text-subtle)] hover:bg-[var(--cos-bg-inset)] hover:text-[var(--cos-text)]"
                      title="Block actions"
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </button>
                    {actionMenuBlockId === block.id ? (
                      <div className="absolute left-0 top-full z-40 mt-1 w-56 rounded-lg border border-[var(--cos-border)] bg-[var(--cos-bg-elevated)] p-1 text-sm shadow-[var(--cos-shadow-md)]">
                        <button type="button" onClick={() => { handleMoveBlock(block.id, "up"); setActionMenuBlockId(null); }} disabled={index === 0} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[var(--cos-text)] hover:bg-[var(--cos-bg-soft)] disabled:opacity-40">
                          <ArrowUp className="h-3.5 w-3.5" /> Move up
                        </button>
                        <button type="button" onClick={() => { handleMoveBlock(block.id, "down"); setActionMenuBlockId(null); }} disabled={index === blocks.length - 1} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[var(--cos-text)] hover:bg-[var(--cos-bg-soft)] disabled:opacity-40">
                          <ArrowDown className="h-3.5 w-3.5" /> Move down
                        </button>
                        <button type="button" onClick={() => { handleDuplicateBlock(block.id); setActionMenuBlockId(null); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[var(--cos-text)] hover:bg-[var(--cos-bg-soft)]">
                          <Copy className="h-3.5 w-3.5" /> Duplicate
                        </button>
                        <button type="button" onClick={() => { handleDeleteBlock(block.id); setActionMenuBlockId(null); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[var(--cos-danger-text)] hover:bg-[var(--cos-danger-soft)]">
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                        <div className="my-1 border-t border-[var(--cos-border-soft)]" />
                        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--cos-text-subtle)]">Transform to</div>
                        {transformItems.map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.type}
                              type="button"
                              onClick={() => {
                                const nextBlocks = blocks.map((candidate) => (candidate.id === block.id ? changeBlockType(candidate, item.type) : candidate));
                                setActionMenuBlockId(null);
                                setNextBlocks(nextBlocks, block.id);
                              }}
                              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[var(--cos-text)] hover:bg-[var(--cos-bg-soft)]"
                            >
                              <Icon className="h-3.5 w-3.5 text-[var(--cos-text-subtle)]" />
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="flex items-start">
                {renderPrefix()}
                <div className="relative min-w-0 flex-1">
                  {block.type === "divider" ? (
                    <div
                      ref={(element) => {
                        blockRefs.current[block.id] = element;
                      }}
                      tabIndex={disabled ? -1 : 0}
                      data-testid={lineTestId}
                      onFocus={() => setFocusedBlockId(block.id)}
                      onKeyDown={(event) => handleDividerKeyDown(event, index)}
                      className="flex h-8 items-center rounded px-2 outline-none focus:bg-[var(--cos-primary-soft)]"
                      aria-label="Horizontal divider block"
                    >
                      <hr className="w-full border-[var(--cos-border)]" />
                    </div>
                  ) : block.type === "code" ? (
                    <div className="rounded-lg border border-[var(--cos-border)] bg-[var(--cos-bg-inset)]">
                      <div className="flex items-center justify-between border-b border-[var(--cos-border)] px-3 py-1.5">
                        <select
                          value={block.language || "ts"}
                          onChange={(event) => handleChangeCodeLang(block.id, event.target.value)}
                          className="bg-transparent font-mono text-xs font-semibold text-[var(--cos-text-muted)] outline-none"
                          disabled={disabled}
                          aria-label="Select code language"
                        >
                          <option value="ts">TypeScript</option>
                          <option value="js">JavaScript</option>
                          <option value="html">HTML</option>
                          <option value="css">CSS</option>
                          <option value="python">Python</option>
                          <option value="json">JSON</option>
                          <option value="markdown">Markdown</option>
                        </select>
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--cos-text-subtle)]">code</span>
                      </div>
                      <AutoGrowingTextarea
                        ref={(element) => {
                          blockRefs.current[block.id] = element;
                        }}
                        data-testid={lineTestId}
                        value={block.text}
                        onFocus={() => setFocusedBlockId(block.id)}
                        onChange={(event) => handleBlockTextChange(block.id, event.target.value, event.target.selectionStart)}
                        onKeyDown={(event) => handleKeyDown(event, block, index)}
                        placeholder={isFocused ? placeholderFor(block, placeholder) : ""}
                        className={inputClassName}
                        disabled={disabled}
                        aria-invalid={Boolean(validationMessage)}
                      />
                    </div>
                  ) : (
                    <AutoGrowingTextarea
                      ref={(element) => {
                        blockRefs.current[block.id] = element;
                      }}
                      data-testid={lineTestId}
                      value={block.text}
                      onFocus={() => setFocusedBlockId(block.id)}
                      onChange={(event) => handleBlockTextChange(block.id, event.target.value, event.target.selectionStart)}
                      onKeyDown={(event) => handleKeyDown(event, block, index)}
                      onPaste={(event) => handlePaste(event, block, index)}
                      placeholder={isFocused || block.text === "" ? placeholderFor(block, placeholder) : ""}
                      className={inputClassName}
                      disabled={disabled}
                      aria-invalid={Boolean(validationMessage)}
                    />
                  )}

                  {slashCommand && slashCommand.blockId === block.id && isFocused ? (
                    <SlashCommandMenu
                      selectedIndex={slashSelectedIndex}
                      filteredCommands={filteredCommands}
                      onSelect={(command) => applyCommandToBlock(block.id, command, slashCommand.triggerIndex)}
                    />
                  ) : null}
                  {validationMessage ? (
                    <p data-testid={`${lineTestId}-validation`} className="px-2 pb-1 text-[11px] font-medium text-[var(--cos-danger-text)]">
                      {validationMessage}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex min-h-9 flex-wrap items-center justify-end gap-2 border-t border-[var(--cos-border-soft)] pt-2 text-[11px]">
        {footer ?? (
          <>
            {capturedFlash ? <span className="cos-pill cos-pill-success">Captured</span> : null}
            {dirty ? <span className="text-[var(--cos-warning-text)]">Unsaved changes</span> : savedFlash ? <span className="text-[var(--cos-success-text)]">Saved</span> : null}
            {onSave && !hideSaveButton ? (
              <button
                type="button"
                disabled={!dirty}
                onClick={() => commit()}
                className="inline-flex min-h-8 items-center gap-1 rounded-md px-2 py-1 font-semibold text-[var(--cos-primary-text)] hover:bg-[var(--cos-primary-soft)] disabled:text-[var(--cos-text-subtle)] disabled:hover:bg-transparent"
              >
                <Send className="h-3.5 w-3.5" />
                Save
              </button>
            ) : null}
            {!onSave && !hideSaveButton ? (
              <span className="inline-flex items-center gap-1 text-[var(--cos-text-subtle)]">
                <Check className="h-3.5 w-3.5" />
                Markdown
              </span>
            ) : null}
            {hideSaveButton ? (
              <span className="inline-flex items-center gap-1 text-[var(--cos-text-subtle)]">
                <Eraser className="h-3.5 w-3.5" />
                Draft
              </span>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
