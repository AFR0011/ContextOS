import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  GripVertical,
  Trash2,
  ArrowUp,
  ArrowDown,
  Copy as DuplicateIcon,
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Minus,
  Check,
} from "lucide-react";
import { EditorBlock, BlockType, BlockMarkdownEditorProps } from "../lib/editorTypes";
import {
  parseMarkdownToBlocks,
  serializeBlocksToMarkdown,
  createEmptyBlock,
  changeBlockType,
  generateId,
} from "../lib/markdownBlocks";
import { SlashCommandMenu, COMMANDS, CommandItem } from "./SlashCommandMenu";

// Auto-growing Textarea Component
interface AutoGrowingTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onResize?: () => void;
}

const AutoGrowingTextarea = React.forwardRef<HTMLTextAreaElement, AutoGrowingTextareaProps>(
  ({ onChange, ...props }, ref) => {
    const localRef = useRef<HTMLTextAreaElement | null>(null);

    const setRefs = (element: HTMLTextAreaElement | null) => {
      localRef.current = element;
      if (typeof ref === "function") {
        ref(element);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = element;
      }
    };

    const adjustHeight = () => {
      const textarea = localRef.current;
      if (textarea) {
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    };

    useEffect(() => {
      adjustHeight();
    }, [props.value]);

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      adjustHeight();
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <textarea
        ref={setRefs}
        onChange={handleTextareaChange}
        rows={1}
        {...props}
      />
    );
  }
);
AutoGrowingTextarea.displayName = "AutoGrowingTextarea";

export const BlockMarkdownEditor: React.FC<BlockMarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = "Start writing...",
  mode = "full",
  minLines = 3,
  className = "",
  dataTestId = "block-markdown-editor",
  disabled = false,
  autosaveLabel,
}) => {
  const [blocks, setBlocks] = useState<EditorBlock[]>(() => parseMarkdownToBlocks(value));
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [actionMenuBlockId, setActionMenuBlockId] = useState<string | null>(null);
  const [showSavedNotification, setShowSavedNotification] = useState(false);

  // Ref to track the last serialized Markdown to prevent infinite loops
  const lastSerializedRef = useRef<string>(value);
  
  // Ref to track pending cursor position after block actions (like Backspace merge)
  const pendingCursorPos = useRef<number | null>(null);
  
  // Refs for each block's textarea/input element to manage programmatical focus
  const blockRefs = useRef<{ [id: string]: HTMLElement | null }>({});

  // State for the Slash Command Menu
  interface SlashCommandState {
    blockId: string;
    query: string;
    triggerIndex: number;
  }
  const [slashCommand, setSlashCommand] = useState<SlashCommandState | null>(null);
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);

  // Sync external value changes into internal blocks state
  useEffect(() => {
    if (value !== lastSerializedRef.current) {
      const parsed = parseMarkdownToBlocks(value);
      setBlocks(parsed);
      lastSerializedRef.current = value;
    }
  }, [value]);

  // Synchronize internal blocks back to parent onChange
  const updateParent = (newBlocks: EditorBlock[]) => {
    const serialized = serializeBlocksToMarkdown(newBlocks);
    lastSerializedRef.current = serialized;
    onChange(serialized);
  };

  // Focus management effect
  useEffect(() => {
    if (focusedBlockId) {
      const el = blockRefs.current[focusedBlockId];
      if (el) {
        el.focus();
        if (el instanceof HTMLTextAreaElement && pendingCursorPos.current !== null) {
          try {
            el.setSelectionRange(pendingCursorPos.current, pendingCursorPos.current);
          } catch (e) {
            // Ignore range errors for non-text inputs
          }
          pendingCursorPos.current = null;
        }
      }
    }
  }, [focusedBlockId, blocks]);

  // Handle Ctrl/Cmd+Enter for "Saved locally" notification
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        setShowSavedNotification(true);
        const timer = setTimeout(() => setShowSavedNotification(false), 1500);
        return () => clearTimeout(timer);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Filter commands for slash menu
  const getFilteredCommands = (query: string): CommandItem[] => {
    const q = query.toLowerCase();
    return COMMANDS.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        cmd.searchKeys.some((key) => key.includes(q))
    );
  };

  const filteredCommands = slashCommand ? getFilteredCommands(slashCommand.query) : [];

  // Apply a selected slash command to a block
  const handleSelectCommand = (blockId: string, type: BlockType) => {
    if (!slashCommand) return;

    const updatedBlocks = blocks.map((block) => {
      if (block.id === blockId) {
        // Strip the slash command text
        const text = block.text;
        const beforeSlash = text.substring(0, slashCommand.triggerIndex);
        const updatedText = beforeSlash.trim();

        let updated = changeBlockType(block, type);
        updated.text = updatedText;
        return updated;
      }
      return block;
    });

    setBlocks(updatedBlocks);
    updateParent(updatedBlocks);
    setSlashCommand(null);
    setSlashSelectedIndex(0);
    setFocusedBlockId(blockId);
  };

  // Block change handlers
  const handleBlockTextChange = (blockId: string, newText: string, selectionStart: number) => {
    // Update block text
    const updatedBlocks = blocks.map((b) => (b.id === blockId ? { ...b, text: newText } : b));
    setBlocks(updatedBlocks);
    updateParent(updatedBlocks);

    // Check for Slash Command trigger "/"
    const textBeforeCursor = newText.substring(0, selectionStart);
    const lastSlashIndex = textBeforeCursor.lastIndexOf("/");

    if (
      lastSlashIndex !== -1 &&
      (lastSlashIndex === 0 || textBeforeCursor[lastSlashIndex - 1] === " " || textBeforeCursor[lastSlashIndex - 1] === "\n")
    ) {
      const query = textBeforeCursor.substring(lastSlashIndex + 1);
      // No spaces allowed in command query
      if (!query.includes(" ")) {
        setSlashCommand({
          blockId,
          query,
          triggerIndex: lastSlashIndex,
        });
        setSlashSelectedIndex(0);
        return;
      }
    }
    setSlashCommand(null);
  };

  const handleToggleTodo = (blockId: string) => {
    const updated = blocks.map((b) =>
      b.id === blockId ? { ...b, checked: !b.checked } : b
    );
    setBlocks(updated);
    updateParent(updated);
  };

  const handleChangeCodeLang = (blockId: string, lang: string) => {
    const updated = blocks.map((b) =>
      b.id === blockId ? { ...b, language: lang } : b
    );
    setBlocks(updated);
    updateParent(updated);
  };

  // Block manipulation helpers
  const handleInsertBlockBelow = (blockId: string, type: BlockType = "paragraph") => {
    const blockIndex = blocks.findIndex((b) => b.id === blockId);
    if (blockIndex === -1) return;

    const newBlock = {
      id: generateId(),
      type,
      text: "",
      checked: type === "todo" ? false : undefined,
      language: type === "code" ? "ts" : undefined,
    };

    const updated = [...blocks];
    updated.splice(blockIndex + 1, 0, newBlock);
    
    setBlocks(updated);
    updateParent(updated);
    setFocusedBlockId(newBlock.id);
  };

  const handleDeleteBlock = (blockId: string) => {
    if (blocks.length <= 1) {
      // Don't delete the only block, just turn it into an empty paragraph
      const resetBlock = createEmptyBlock();
      setBlocks([resetBlock]);
      updateParent([resetBlock]);
      setFocusedBlockId(resetBlock.id);
      return;
    }

    const blockIndex = blocks.findIndex((b) => b.id === blockId);
    if (blockIndex === -1) return;

    const updated = blocks.filter((b) => b.id !== blockId);
    setBlocks(updated);
    updateParent(updated);

    // Focus previous block, or next block if it was the first one
    const newFocusIndex = blockIndex > 0 ? blockIndex - 1 : 0;
    const focusBlock = updated[newFocusIndex];
    if (focusBlock) {
      setFocusedBlockId(focusBlock.id);
      // Place cursor at the end of the focused block
      pendingCursorPos.current = focusBlock.text.length;
    }
  };

  const handleMoveBlock = (blockId: string, direction: "up" | "down") => {
    const index = blocks.findIndex((b) => b.id === blockId);
    if (index === -1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;

    const updated = [...blocks];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setBlocks(updated);
    updateParent(updated);
    setFocusedBlockId(blockId);
  };

  const handleDuplicateBlock = (blockId: string) => {
    const index = blocks.findIndex((b) => b.id === blockId);
    if (index === -1) return;

    const blockToDup = blocks[index];
    const newBlock = {
      ...blockToDup,
      id: generateId(),
    };

    const updated = [...blocks];
    updated.splice(index + 1, 0, newBlock);

    setBlocks(updated);
    updateParent(updated);
    setFocusedBlockId(newBlock.id);
  };

  // Keyboard navigation and layout split/merging
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    block: EditorBlock,
    index: number
  ) => {
    const textarea = e.currentTarget;
    const selectionStart = textarea.selectionStart;
    const textLength = textarea.value.length;

    // 1. Slash Command Menu Keyboard Navigation
    if (slashCommand && slashCommand.blockId === block.id) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashSelectedIndex(
          (prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length)
        );
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands.length > 0) {
          const selected = filteredCommands[slashSelectedIndex];
          handleSelectCommand(block.id, selected.type);
        } else {
          setSlashCommand(null);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSlashCommand(null);
        return;
      }
    }

    // 2. Standard Editor Keyboard Navigation & Actions
    if (e.key === "Enter" && !e.shiftKey) {
      // Code block: Let enter insert a newline instead of splitting blocks
      if (block.type === "code") {
        return;
      }

      e.preventDefault();

      // If list item is empty, pressing Enter converts it back to a paragraph
      const isList = block.type === "bullet" || block.type === "numbered" || block.type === "todo";
      if (isList && block.text.trim() === "") {
        const updated = blocks.map((b) =>
          b.id === block.id ? changeBlockType(b, "paragraph") : b
        );
        setBlocks(updated);
        updateParent(updated);
        setFocusedBlockId(block.id);
        return;
      }

      // Otherwise, split the block at cursor position!
      const textBefore = block.text.substring(0, selectionStart);
      const textAfter = block.text.substring(selectionStart);

      // New block inherits same list type if current block is a list
      const nextType: BlockType = isList ? block.type : "paragraph";

      const newBlock: EditorBlock = {
        id: generateId(),
        type: nextType,
        text: textAfter,
        checked: nextType === "todo" ? false : undefined,
        language: undefined,
      };

      const updatedBlocks = [...blocks];
      // Update current block to keep textBefore
      updatedBlocks[index] = { ...block, text: textBefore };
      // Insert new block
      updatedBlocks.splice(index + 1, 0, newBlock);

      setBlocks(updatedBlocks);
      updateParent(updatedBlocks);
      setFocusedBlockId(newBlock.id);
      pendingCursorPos.current = 0;
      return;
    }

    if (e.key === "Backspace") {
      if (selectionStart === 0 && textarea.selectionEnd === 0) {
        e.preventDefault();

        // If the block is not a paragraph, convert it to paragraph first
        if (block.type !== "paragraph") {
          const updated = blocks.map((b) =>
            b.id === block.id ? changeBlockType(b, "paragraph") : b
          );
          setBlocks(updated);
          updateParent(updated);
          setFocusedBlockId(block.id);
          return;
        }

        // If it is already a paragraph and there is a previous block, merge with it
        if (index > 0) {
          const prevBlock = blocks[index - 1];
          
          // Dividers have no text, so just delete the divider
          if (prevBlock.type === "divider") {
            const updated = blocks.filter((b) => b.id !== prevBlock.id);
            setBlocks(updated);
            updateParent(updated);
            setFocusedBlockId(block.id);
            return;
          }

          const prevTextLength = prevBlock.text.length;
          const mergedText = prevBlock.text + block.text;

          const updated = [...blocks];
          // Update previous block text with merged text
          updated[index - 1] = { ...prevBlock, text: mergedText };
          // Remove current block
          updated.splice(index, 1);

          setBlocks(updated);
          updateParent(updated);
          setFocusedBlockId(prevBlock.id);
          pendingCursorPos.current = prevTextLength;
        }
      }
      return;
    }

    if (e.key === "ArrowUp") {
      // Focus previous block if cursor is at the beginning
      if (selectionStart === 0 && index > 0) {
        e.preventDefault();
        const prevBlock = blocks[index - 1];
        setFocusedBlockId(prevBlock.id);
        pendingCursorPos.current = prevBlock.text.length;
      }
      return;
    }

    if (e.key === "ArrowDown") {
      // Focus next block if cursor is at the end
      if (selectionStart === textLength && index < blocks.length - 1) {
        e.preventDefault();
        const nextBlock = blocks[index + 1];
        setFocusedBlockId(nextBlock.id);
        pendingCursorPos.current = 0;
      }
      return;
    }

    // 3. Tab and Shift+Tab indentation/outdentation
    if (e.key === "Tab") {
      e.preventDefault();
      const isList = block.type === "bullet" || block.type === "numbered" || block.type === "todo";

      if (e.shiftKey) {
        // Shift+Tab: Outdent
        if (isList) {
          // In this simplified version, outdent converts list to paragraph
          const updated = blocks.map((b) =>
            b.id === block.id ? changeBlockType(b, "paragraph") : b
          );
          setBlocks(updated);
          updateParent(updated);
          setFocusedBlockId(block.id);
        }
      } else {
        // Tab: Indent
        if (block.type === "paragraph") {
          // Convert paragraph to bullet list
          const updated = blocks.map((b) =>
            b.id === block.id ? changeBlockType(b, "bullet") : b
          );
          setBlocks(updated);
          updateParent(updated);
          setFocusedBlockId(block.id);
        } else if (block.type === "bullet") {
          // Convert bullet to numbered list
          const updated = blocks.map((b) =>
            b.id === block.id ? changeBlockType(b, "numbered") : b
          );
          setBlocks(updated);
          updateParent(updated);
          setFocusedBlockId(block.id);
        } else if (block.type === "numbered") {
          // Convert numbered to todo list
          const updated = blocks.map((b) =>
            b.id === block.id ? changeBlockType(b, "todo") : b
          );
          setBlocks(updated);
          updateParent(updated);
          setFocusedBlockId(block.id);
        }
      }
    }
  };

  // Paste handler for blocks
  const handlePaste = (
    e: React.ClipboardEvent<HTMLTextAreaElement>,
    block: EditorBlock,
    index: number
  ) => {
    // In code blocks, let default pasting happen to preserve tabs/newlines raw
    if (block.type === "code") {
      return;
    }

    const pastedText = e.clipboardData.getData("text/plain");
    if (pastedText.includes("\n") || pastedText.includes("\r")) {
      e.preventDefault();

      const pastedBlocks = parseMarkdownToBlocks(pastedText);
      const textarea = e.currentTarget;
      const selectionStart = textarea.selectionStart;
      const selectionEnd = textarea.selectionEnd;
      const currentText = textarea.value;

      const textBefore = currentText.substring(0, selectionStart);
      const textAfter = currentText.substring(selectionEnd);

      const updated = [...blocks];

      if (pastedBlocks.length === 1) {
        updated[index] = {
          ...block,
          text: textBefore + pastedBlocks[0].text + textAfter,
        };
        setBlocks(updated);
        updateParent(updated);
        setFocusedBlockId(block.id);
        pendingCursorPos.current = textBefore.length + pastedBlocks[0].text.length;
      } else {
        const firstPasted = pastedBlocks[0];
        const lastPasted = pastedBlocks[pastedBlocks.length - 1];

        // Merge first pasted block with textBefore
        updated[index] = {
          ...block,
          text: textBefore + firstPasted.text,
          type: firstPasted.type !== "paragraph" ? firstPasted.type : block.type,
        };

        // Create new instances for middle blocks
        const middleBlocks = pastedBlocks.slice(1, pastedBlocks.length - 1).map((b) => ({
          ...b,
          id: generateId(),
        }));

        // Merge last pasted block with textAfter
        const lastNewBlock = {
          ...lastPasted,
          id: generateId(),
          text: lastPasted.text + textAfter,
        };

        // Insert new blocks into the list
        updated.splice(index + 1, 0, ...middleBlocks, lastNewBlock);

        setBlocks(updated);
        updateParent(updated);
        setFocusedBlockId(lastNewBlock.id);
        pendingCursorPos.current = lastPasted.text.length;
      }
    }
  };

  // Divider block keyboard navigation
  const handleDividerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, index: number) => {
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      handleDeleteBlock(blocks[index].id);
    } else if (e.key === "ArrowUp" && index > 0) {
      e.preventDefault();
      setFocusedBlockId(blocks[index - 1].id);
    } else if (e.key === "ArrowDown" && index < blocks.length - 1) {
      e.preventDefault();
      setFocusedBlockId(blocks[index + 1].id);
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleInsertBlockBelow(blocks[index].id, "paragraph");
    }
  };

  // Get block index for numbered list rendering
  let numberedItemIndex = 1;

  return (
    <div
      className={`block-editor relative ${className}`}
      data-testid={dataTestId}
      style={{ minHeight: `${minLines * 28}px` }}
    >
      {/* Saved Locally Notification */}
      {showSavedNotification && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full shadow-sm z-50 text-xs font-semibold animate-bounce">
          <Check className="w-3.5 h-3.5" />
          <span>Saved locally</span>
        </div>
      )}

      {blocks.map((block, index) => {
        const isFocused = focusedBlockId === block.id;

        // Reset or increment numbered list index for display
        if (block.type === "numbered") {
          if (index === 0 || blocks[index - 1].type !== "numbered") {
            numberedItemIndex = 1;
          }
        }

        // Placeholder text
        let placeholderText = placeholder;
        if (isFocused && block.text === "") {
          if (block.type === "paragraph") placeholderText = "Type '/' for commands...";
          else if (block.type === "heading1") placeholderText = "Heading 1";
          else if (block.type === "heading2") placeholderText = "Heading 2";
          else if (block.type === "heading3") placeholderText = "Heading 3";
          else if (block.type === "quote") placeholderText = "Quote";
          else if (block.type === "code") placeholderText = "Write some code...";
        } else {
          placeholderText = "";
        }

        const isCompact = mode === "compact";
        
        // Block type-specific class names
        let inputClassName = "block-input";
        if (block.type === "heading1") {
          inputClassName += isCompact ? " block-input-heading2" : " block-input-heading1";
        } else if (block.type === "heading2") {
          inputClassName += isCompact ? " block-input-heading3" : " block-input-heading2";
        } else if (block.type === "heading3") {
          inputClassName += " block-input-heading3";
        } else if (block.type === "quote") {
          inputClassName += " block-input-quote";
        } else if (block.type === "code") {
          inputClassName += " block-input-code";
        } else if (block.type === "todo" && block.checked) {
          inputClassName += " block-input-todo-checked";
        }

        const renderPrefix = () => {
          if (block.type === "bullet") {
            return <div className="block-prefix-bullet">•</div>;
          }
          if (block.type === "numbered") {
            const currentNum = numberedItemIndex;
            numberedItemIndex++;
            return <div className="block-prefix-numbered">{currentNum}.</div>;
          }
          if (block.type === "todo") {
            return (
              <div className="block-prefix-todo">
                <input
                  type="checkbox"
                  checked={block.checked || false}
                  onChange={() => handleToggleTodo(block.id)}
                  className="todo-checkbox cursor-pointer"
                  disabled={disabled}
                  aria-label="Toggle todo status"
                />
              </div>
            );
          }
          return null;
        };

        return (
          <div
            key={block.id}
            className={`block-row group ${isFocused ? "block-row-focused" : ""}`}
            onMouseLeave={() => setActionMenuBlockId(null)}
          >
            {/* Hover Side Controls */}
            {!disabled && (
              <div className="block-controls">
                <button
                  type="button"
                  onClick={() => handleInsertBlockBelow(block.id, "paragraph")}
                  className="control-btn"
                  title="Add block below"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setActionMenuBlockId(actionMenuBlockId === block.id ? null : block.id)
                    }
                    className="control-btn"
                    title="Block actions"
                  >
                    <GripVertical className="w-3.5 h-3.5" />
                  </button>

                  {/* Block Action Dropdown Menu */}
                  {actionMenuBlockId === block.id && (
                    <div className="absolute left-0 mt-1 w-48 bg-white border border-neutral-200 rounded-lg shadow-xl z-50 py-1 font-sans text-sm text-neutral-700 animate-fade-in">
                      <button
                        type="button"
                        onClick={() => {
                          handleMoveBlock(block.id, "up");
                          setActionMenuBlockId(null);
                        }}
                        disabled={index === 0}
                        className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-transparent text-left cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                        <span>Move up</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleMoveBlock(block.id, "down");
                          setActionMenuBlockId(null);
                        }}
                        disabled={index === blocks.length - 1}
                        className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-transparent text-left cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                        <span>Move down</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleDuplicateBlock(block.id);
                          setActionMenuBlockId(null);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-neutral-50 text-left cursor-pointer"
                      >
                        <DuplicateIcon className="w-3.5 h-3.5" />
                        <span>Duplicate</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleDeleteBlock(block.id);
                          setActionMenuBlockId(null);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-red-50 text-red-600 text-left cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>

                      <div className="border-t border-neutral-100 my-1"></div>
                      <div className="px-3 py-1 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                        Transform to
                      </div>

                      {[
                        { type: "paragraph", label: "Text", icon: Type },
                        { type: "heading1", label: "Heading 1", icon: Heading1 },
                        { type: "heading2", label: "Heading 2", icon: Heading2 },
                        { type: "heading3", label: "Heading 3", icon: Heading3 },
                        { type: "bullet", label: "Bullet list", icon: List },
                        { type: "numbered", label: "Numbered list", icon: ListOrdered },
                        { type: "todo", label: "To-do list", icon: CheckSquare },
                        { type: "quote", label: "Quote", icon: Quote },
                        { type: "code", label: "Code block", icon: Code },
                        { type: "divider", label: "Divider", icon: Minus },
                      ].map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => {
                            const updated = blocks.map((b) =>
                              b.id === block.id ? changeBlockType(b, item.type as BlockType) : b
                            );
                            setBlocks(updated);
                            updateParent(updated);
                            setActionMenuBlockId(null);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-neutral-50 text-left cursor-pointer"
                        >
                          <item.icon className="w-3.5 h-3.5 text-neutral-400" />
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Block Body */}
            <div className="block-content">
              {renderPrefix()}

              <div className="flex-1 relative">
                {block.type === "divider" ? (
                  // Divider Block Focusable Element
                  <div
                    ref={(el) => {
                      blockRefs.current[block.id] = el;
                    }}
                    tabIndex={disabled ? -1 : 0}
                    onKeyDown={(e) => handleDividerKeyDown(e, index)}
                    onFocus={() => setFocusedBlockId(block.id)}
                    className="block-divider-wrapper outline-none focus:bg-blue-50/50 rounded cursor-pointer"
                    aria-label="Horizontal divider, press backspace to delete"
                  >
                    <hr className="block-divider-line" />
                  </div>
                ) : block.type === "code" ? (
                  // Code Block with Language Selector
                  <div className="w-full flex flex-col rounded-lg border border-neutral-200 overflow-hidden">
                    <div className="code-block-header">
                      <select
                        value={block.language || "ts"}
                        onChange={(e) => handleChangeCodeLang(block.id, e.target.value)}
                        className="code-block-lang-select"
                        disabled={disabled}
                        aria-label="Select code language"
                      >
                        <option value="typescript">TypeScript</option>
                        <option value="javascript">JavaScript</option>
                        <option value="html">HTML</option>
                        <option value="css">CSS</option>
                        <option value="python">Python</option>
                        <option value="rust">Rust</option>
                        <option value="markdown">Markdown</option>
                        <option value="json">JSON</option>
                      </select>
                      <span className="text-[10px] uppercase font-bold text-neutral-400">code block</span>
                    </div>
                    <AutoGrowingTextarea
                      ref={(el) => {
                        blockRefs.current[block.id] = el;
                      }}
                      value={block.text}
                      onChange={(e) =>
                        handleBlockTextChange(block.id, e.target.value, e.target.selectionStart)
                      }
                      onKeyDown={(e) => handleKeyDown(e, block, index)}
                      placeholder={placeholderText}
                      className={inputClassName}
                      disabled={disabled}
                      aria-label="Code block editor"
                    />
                  </div>
                ) : (
                  // General Text Block
                  <AutoGrowingTextarea
                    ref={(el) => {
                      blockRefs.current[block.id] = el;
                    }}
                    value={block.text}
                    onChange={(e) =>
                      handleBlockTextChange(block.id, e.target.value, e.target.selectionStart)
                    }
                    onKeyDown={(e) => handleKeyDown(e, block, index)}
                    onPaste={(e) => handlePaste(e, block, index)}
                    onFocus={() => setFocusedBlockId(block.id)}
                    placeholder={placeholderText}
                    className={inputClassName}
                    disabled={disabled}
                    aria-label={`${block.type} block editor`}
                  />
                )}

                {/* Floating Slash Command Menu */}
                {slashCommand && slashCommand.blockId === block.id && isFocused && (
                  <SlashCommandMenu
                    selectedIndex={slashSelectedIndex}
                    filteredCommands={filteredCommands}
                    onSelect={(type) => handleSelectCommand(block.id, type)}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Subtle autosave or min-lines display */}
      {autosaveLabel && (
        <div className="text-right text-xs text-neutral-400 mt-2 select-none font-medium italic">
          {autosaveLabel}
        </div>
      )}
    </div>
  );
};
