import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../utils/cn';
import { SlashMenu } from './SlashMenu';
import { EditableDiv } from './EditableDiv';
import {
  type Block,
  type BlockType,
  type SlashMenuState,
  type DragState,
  genId,
  getFilteredCommands,
  getListNumber,
  SAMPLE_BLOCKS,
} from '../types';

// ─── Utility: place caret at a specific text offset ───
function placeCaretAt(el: HTMLElement, offset: number) {
  const range = document.createRange();
  const sel = window.getSelection();
  if (!sel) return;

  const textNode = el.firstChild;
  if (textNode && textNode.nodeType === Node.TEXT_NODE) {
    const safeOffset = Math.min(offset, textNode.textContent?.length || 0);
    range.setStart(textNode, safeOffset);
    range.collapse(true);
  } else {
    range.selectNodeContents(el);
    range.collapse(offset > 0 ? false : true);
  }
  sel.removeAllRanges();
  sel.addRange(range);
}

function placeCaretAtEnd(el: HTMLElement) {
  const range = document.createRange();
  const sel = window.getSelection();
  if (!sel) return;
  range.selectNodeContents(el);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

function placeCaretAtStart(el: HTMLElement) {
  const range = document.createRange();
  const sel = window.getSelection();
  if (!sel) return;
  range.selectNodeContents(el);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function getCursorOffset(el: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  const preRange = document.createRange();
  preRange.selectNodeContents(el);
  preRange.setEnd(range.startContainer, range.startOffset);
  return preRange.toString().length;
}

/**
 * Returns true when the caret sits on the **first visual line** of the
 * element.  Works for single-line AND multi-line / wrapping text.
 */
function isCaretOnFirstLine(el: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return true;

  const range = sel.getRangeAt(0);
  const caretRect = range.getBoundingClientRect();

  // Empty element — trivially on the first (only) line.
  if (caretRect.height === 0 && caretRect.top === 0) return true;

  // Create a range at the very start of the element to get line-top.
  const startRange = document.createRange();
  startRange.selectNodeContents(el);
  startRange.collapse(true); // collapse to start
  const startRect = startRange.getBoundingClientRect();

  // If the start range also reports zero, fall back to element rect.
  const firstLineTop = startRect.height > 0 ? startRect.top : el.getBoundingClientRect().top;

  // Same vertical position (within tolerance) → first line.
  return Math.abs(caretRect.top - firstLineTop) < 4;
}

/**
 * Returns true when the caret sits on the **last visual line** of the element.
 */
function isCaretOnLastLine(el: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return true;

  const range = sel.getRangeAt(0);
  const caretRect = range.getBoundingClientRect();

  if (caretRect.height === 0 && caretRect.top === 0) return true;

  // Create a range at the very end of the element to get line-bottom.
  const endRange = document.createRange();
  endRange.selectNodeContents(el);
  endRange.collapse(false); // collapse to end
  const endRect = endRange.getBoundingClientRect();

  const lastLineBottom = endRect.height > 0 ? endRect.bottom : el.getBoundingClientRect().bottom;

  return Math.abs(caretRect.bottom - lastLineBottom) < 4;
}

// ─── Main Component ───
export const NotionPage: React.FC = () => {
  const [blocks, setBlocks] = useState<Block[]>(() => [...SAMPLE_BLOCKS]);
  const [pageTitle, setPageTitle] = useState('🚀 NotionFlow Editor');
  const [slashMenu, setSlashMenu] = useState<SlashMenuState | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    draggedId: null,
    overId: null,
    position: 'after',
  });
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<{
    id: string;
    position: 'start' | 'end';
    offset?: number;
  } | null>(null);

  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const toggleContentRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // ─── Navigation helpers: find next/prev focusable block, skipping dividers ───
  const findNextEditable = useCallback(
    (fromIndex: number): number => {
      for (let i = fromIndex + 1; i < blocks.length; i++) {
        if (blocks[i].type !== 'divider') return i;
      }
      return -1;
    },
    [blocks]
  );

  const findPrevEditable = useCallback(
    (fromIndex: number): number => {
      for (let i = fromIndex - 1; i >= 0; i--) {
        if (blocks[i].type !== 'divider') return i;
      }
      return -1;
    },
    [blocks]
  );

  // ─── Focus management ───
  useEffect(() => {
    if (!focusTarget) return;
    const { id, position, offset } = focusTarget;

    requestAnimationFrame(() => {
      const el = blockRefs.current.get(id);
      if (el) {
        el.focus();
        if (offset !== undefined) {
          placeCaretAt(el, offset);
        } else if (position === 'end') {
          placeCaretAtEnd(el);
        } else {
          placeCaretAtStart(el);
        }
      }
      setFocusTarget(null);
    });
  }, [focusTarget, blocks]);

  // ─── Block operations ───
  const updateBlockContent = useCallback((id: string, content: string) => {
    setBlocks(prev => prev.map(b => (b.id === id ? { ...b, content } : b)));
  }, []);

  const updateToggleContent = useCallback((id: string, toggleContent: string) => {
    setBlocks(prev => prev.map(b => (b.id === id ? { ...b, toggleContent } : b)));
  }, []);

  const addBlockAfter = useCallback(
    (afterId: string, type: BlockType = 'text', content = '') => {
      const newId = genId();
      setBlocks(prev => {
        const index = prev.findIndex(b => b.id === afterId);
        const newBlocks = [...prev];
        newBlocks.splice(index + 1, 0, {
          id: newId,
          type,
          content,
          ...(type === 'toggle' ? { isOpen: false, toggleContent: '' } : {}),
        });
        return newBlocks;
      });
      if (type !== 'divider') {
        setFocusTarget({ id: newId, position: 'start' });
      }
      return newId;
    },
    []
  );

  const deleteBlock = useCallback(
    (id: string) => {
      setBlocks(prev => {
        if (prev.length <= 1) return prev;
        const index = prev.findIndex(b => b.id === id);
        if (index > 0) {
          setFocusTarget({ id: prev[index - 1].id, position: 'end' });
        } else if (prev.length > 1) {
          setFocusTarget({ id: prev[1].id, position: 'start' });
        }
        return prev.filter(b => b.id !== id);
      });
    },
    []
  );

  const changeBlockType = useCallback((id: string, newType: BlockType, newContent?: string) => {
    setBlocks(prev =>
      prev.map(b => {
        if (b.id !== id) return b;
        const updated: Block = { ...b, type: newType };
        if (newContent !== undefined) updated.content = newContent;
        if (newType === 'toggle') {
          updated.isOpen = false;
          updated.toggleContent = updated.toggleContent || '';
        }
        return updated;
      })
    );
  }, []);

  const toggleBlockOpen = useCallback((id: string) => {
    setBlocks(prev =>
      prev.map(b => (b.id === id ? { ...b, isOpen: !b.isOpen } : b))
    );
  }, []);

  // ─── Slash menu logic ───
  const filteredCommands = slashMenu ? getFilteredCommands(slashMenu.filter) : [];

  const handleSlashSelect = useCallback(
    (index: number) => {
      if (!slashMenu) return;
      const cmd = filteredCommands[index];
      if (!cmd) return;

      const { blockId, slashIndex } = slashMenu;
      const block = blocks.find(b => b.id === blockId);
      if (!block) return;

      // Remove slash text from content
      const textBeforeSlash = block.content.slice(0, slashIndex);

      if (cmd.type === 'divider') {
        changeBlockType(blockId, 'divider', '');
        addBlockAfter(blockId, 'text');
      } else {
        // changeBlockType + content update will flow through EditableDiv's
        // value prop, which will update the DOM only when the value differs
        changeBlockType(blockId, cmd.type, textBeforeSlash);
        // Re-focus the block at the end after the state change
        setFocusTarget({ id: blockId, position: 'end' });
      }

      setSlashMenu(null);
    },
    [slashMenu, filteredCommands, blocks, changeBlockType, addBlockAfter]
  );

  // ─── Drag and Drop ───
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    setTimeout(() => {
      setDragState({ draggedId: id, overId: null, position: 'after' });
    }, 0);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, id: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragState.draggedId === id) return;

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const position = e.clientY < midY ? 'before' : 'after';

      setDragState(prev => ({ ...prev, overId: id, position }));
    },
    [dragState.draggedId]
  );

  const handleDragEnd = useCallback(() => {
    setDragState({ draggedId: null, overId: null, position: 'after' });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const { draggedId, overId, position } = dragState;
      if (!draggedId || !overId || draggedId === overId) {
        handleDragEnd();
        return;
      }

      setBlocks(prev => {
        const draggedIndex = prev.findIndex(b => b.id === draggedId);
        const draggedBlock = prev[draggedIndex];
        const without = prev.filter(b => b.id !== draggedId);
        const targetIndex = without.findIndex(b => b.id === overId);
        const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
        without.splice(insertIndex, 0, draggedBlock);
        return without;
      });

      handleDragEnd();
    },
    [dragState, handleDragEnd]
  );

  // ─── onChange handler (called by EditableDiv) ───
  // This receives the new text and does slash detection
  const handleBlockChange = useCallback(
    (blockId: string, text: string) => {
      updateBlockContent(blockId, text);

      // Detect slash for command menu
      const el = blockRefs.current.get(blockId);
      if (!el) return;
      const cursorPos = getCursorOffset(el);
      const textBeforeCursor = text.slice(0, cursorPos);
      const slashIndex = textBeforeCursor.lastIndexOf('/');

      if (slashIndex !== -1) {
        const textBeforeSlash = textBeforeCursor.slice(0, slashIndex);
        if (slashIndex === 0 || textBeforeSlash.endsWith(' ')) {
          const filter = textBeforeCursor.slice(slashIndex + 1);
          if (!filter.includes(' ') && filter.length <= 25) {
            const rect = el.getBoundingClientRect();
            setSlashMenu({
              blockId,
              filter,
              slashIndex,
              position: { x: rect.left, y: rect.bottom },
              selectedIndex: 0,
            });
            return;
          }
        }
      }
      setSlashMenu(null);
    },
    [updateBlockContent]
  );

  // ─── Key handler ───
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, blockId: string) => {
      // Slash menu navigation
      if (slashMenu && slashMenu.blockId === blockId) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSlashMenu(prev =>
            prev
              ? {
                  ...prev,
                  selectedIndex: Math.min(
                    prev.selectedIndex + 1,
                    filteredCommands.length - 1
                  ),
                }
              : null
          );
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSlashMenu(prev =>
            prev
              ? { ...prev, selectedIndex: Math.max(prev.selectedIndex - 1, 0) }
              : null
          );
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSlashSelect(slashMenu.selectedIndex);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setSlashMenu(null);
          return;
        }
      }

      const el = e.currentTarget;
      const block = blocks.find(b => b.id === blockId);
      if (!block) return;

      // Enter: create new block
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();

        const text = el.textContent || '';
        const cursorPos = getCursorOffset(el);
        const beforeText = text.slice(0, cursorPos);
        const afterText = text.slice(cursorPos);

        // Update current block content (EditableDiv will sync)
        updateBlockContent(blockId, beforeText);

        // Determine new block type (continue list types)
        const continueType: BlockType =
          block.type === 'bulleted-list' || block.type === 'numbered-list'
            ? block.type
            : 'text';

        // If list block is empty, convert to text instead
        if (
          !beforeText &&
          !afterText &&
          (block.type === 'bulleted-list' || block.type === 'numbered-list')
        ) {
          changeBlockType(blockId, 'text');
          return;
        }

        addBlockAfter(blockId, continueType, afterText);
      }

      // Backspace at start of block
      if (e.key === 'Backspace') {
        const cursorPos = getCursorOffset(el);
        const sel = window.getSelection();
        const isCollapsed = sel?.isCollapsed ?? true;

        if (cursorPos === 0 && isCollapsed) {
          e.preventDefault();

          if (block.type !== 'text') {
            // Convert to text, keep content
            changeBlockType(blockId, 'text');
            setFocusTarget({ id: blockId, position: 'start' });
          } else {
            // Merge with previous editable block (skip dividers)
            const index = blocks.findIndex(b => b.id === blockId);

            // Check if the immediately preceding block is a divider — delete it
            if (index > 0 && blocks[index - 1].type === 'divider') {
              deleteBlock(blocks[index - 1].id);
              return;
            }

            const prevIdx = findPrevEditable(index);
            if (prevIdx !== -1) {
              const prevBlock = blocks[prevIdx];
              const mergeOffset = prevBlock.content.length;
              const mergedContent = prevBlock.content + block.content;

              setBlocks(prev => {
                const newBlocks = [...prev];
                newBlocks[prevIdx] = {
                  ...newBlocks[prevIdx],
                  content: mergedContent,
                };
                return newBlocks.filter(b => b.id !== blockId);
              });

              // Focus previous block at the merge point
              setFocusTarget({
                id: prevBlock.id,
                position: 'start',
                offset: mergeOffset,
              });
            }
          }
        }
        // When cursor is NOT at position 0, do nothing — let the browser
        // handle the deletion natively. EditableDiv won't clobber the DOM
        // from the React re-render, so the cursor stays in place.
      }

      // ── Arrow Up: move to previous block ──
      if (e.key === 'ArrowUp') {
        if (isCaretOnFirstLine(el)) {
          e.preventDefault();
          const index = blocks.findIndex(b => b.id === blockId);
          const prevIdx = findPrevEditable(index);
          if (prevIdx !== -1) {
            const prevBlock = blocks[prevIdx];
            // If previous block is a toggle with open content, focus toggle content
            if (prevBlock.type === 'toggle' && prevBlock.isOpen) {
              const tcEl = toggleContentRefs.current.get(prevBlock.id);
              if (tcEl) {
                tcEl.focus();
                placeCaretAtEnd(tcEl);
                return;
              }
            }
            setFocusTarget({ id: prevBlock.id, position: 'end' });
          }
        }
      }

      // ── Arrow Down: move to next block ──
      if (e.key === 'ArrowDown') {
        if (isCaretOnLastLine(el)) {
          e.preventDefault();
          const index = blocks.findIndex(b => b.id === blockId);

          // If current block is a toggle with open content, focus toggle content first
          if (block.type === 'toggle' && block.isOpen) {
            const tcEl = toggleContentRefs.current.get(block.id);
            if (tcEl) {
              tcEl.focus();
              placeCaretAtStart(tcEl);
              return;
            }
          }

          const nextIdx = findNextEditable(index);
          if (nextIdx !== -1) {
            setFocusTarget({ id: blocks[nextIdx].id, position: 'start' });
          }
        }
      }

      // ── ArrowLeft at offset 0: move to end of previous block ──
      if (e.key === 'ArrowLeft') {
        const cursorPos = getCursorOffset(el);
        const sel = window.getSelection();
        if (cursorPos === 0 && sel?.isCollapsed) {
          e.preventDefault();
          const index = blocks.findIndex(b => b.id === blockId);
          const prevIdx = findPrevEditable(index);
          if (prevIdx !== -1) {
            const prevBlock = blocks[prevIdx];
            if (prevBlock.type === 'toggle' && prevBlock.isOpen) {
              const tcEl = toggleContentRefs.current.get(prevBlock.id);
              if (tcEl) {
                tcEl.focus();
                placeCaretAtEnd(tcEl);
                return;
              }
            }
            setFocusTarget({ id: prevBlock.id, position: 'end' });
          }
        }
      }

      // ── ArrowRight at end: move to start of next block ──
      if (e.key === 'ArrowRight') {
        const text = el.textContent || '';
        const cursorPos = getCursorOffset(el);
        const sel = window.getSelection();
        if (cursorPos >= text.length && sel?.isCollapsed) {
          e.preventDefault();
          const index = blocks.findIndex(b => b.id === blockId);

          if (block.type === 'toggle' && block.isOpen) {
            const tcEl = toggleContentRefs.current.get(block.id);
            if (tcEl) {
              tcEl.focus();
              placeCaretAtStart(tcEl);
              return;
            }
          }

          const nextIdx = findNextEditable(index);
          if (nextIdx !== -1) {
            setFocusTarget({ id: blocks[nextIdx].id, position: 'start' });
          }
        }
      }
    },
    [
      slashMenu,
      filteredCommands,
      handleSlashSelect,
      blocks,
      updateBlockContent,
      changeBlockType,
      addBlockAfter,
      deleteBlock,
      findNextEditable,
      findPrevEditable,
    ]
  );

  // ─── Toggle-content arrow-key handler ───
  const handleToggleContentKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, blockId: string) => {
      const el = e.currentTarget;

      // ArrowUp from toggle content → focus toggle header
      if (e.key === 'ArrowUp') {
        if (isCaretOnFirstLine(el)) {
          e.preventDefault();
          setFocusTarget({ id: blockId, position: 'end' });
        }
      }

      // ArrowDown from toggle content → focus next editable block
      if (e.key === 'ArrowDown') {
        if (isCaretOnLastLine(el)) {
          e.preventDefault();
          const index = blocks.findIndex(b => b.id === blockId);
          const nextIdx = findNextEditable(index);
          if (nextIdx !== -1) {
            setFocusTarget({ id: blocks[nextIdx].id, position: 'start' });
          }
        }
      }

      // ArrowLeft at offset 0 → focus toggle header at end
      if (e.key === 'ArrowLeft') {
        const cursorPos = getCursorOffset(el);
        const sel = window.getSelection();
        if (cursorPos === 0 && sel?.isCollapsed) {
          e.preventDefault();
          setFocusTarget({ id: blockId, position: 'end' });
        }
      }

      // ArrowRight at end → focus next editable block at start
      if (e.key === 'ArrowRight') {
        const text = el.textContent || '';
        const cursorPos = getCursorOffset(el);
        const sel = window.getSelection();
        if (cursorPos >= text.length && sel?.isCollapsed) {
          e.preventDefault();
          const index = blocks.findIndex(b => b.id === blockId);
          const nextIdx = findNextEditable(index);
          if (nextIdx !== -1) {
            setFocusTarget({ id: blocks[nextIdx].id, position: 'start' });
          }
        }
      }
    },
    [blocks, findNextEditable]
  );

  // ─── Close slash menu on outside click ───
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (slashMenu) {
        const target = e.target as HTMLElement;
        if (!target.closest('.slash-menu-enter')) {
          setSlashMenu(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [slashMenu]);

  // ─── Blur handler: close slash menu ───
  const handleBlur = useCallback(() => {
    setTimeout(() => {
      const active = document.activeElement;
      if (!active || !active.closest('.slash-menu-enter')) {
        setSlashMenu(null);
      }
    }, 150);
  }, []);

  // ─── Block rendering ───
  const renderBlockContent = (block: Block, index: number) => {
    if (block.type === 'divider') {
      return (
        <div className="py-2 w-full">
          <hr className="border-gray-200" />
        </div>
      );
    }

    const editableRef = (el: HTMLDivElement | null) => {
      if (el) blockRefs.current.set(block.id, el);
      else blockRefs.current.delete(block.id);
    };

    const commonProps = {
      innerRef: editableRef,
      value: block.content,
      onChange: (text: string) => handleBlockChange(block.id, text),
      onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) =>
        handleKeyDown(e, block.id),
      onBlur: handleBlur,
      placeholder: getPlaceholder(block.type),
    };

    switch (block.type) {
      case 'h1':
        return (
          <EditableDiv
            {...commonProps}
            className="text-4xl font-bold text-gray-900 leading-tight py-1"
          />
        );

      case 'h2':
        return (
          <EditableDiv
            {...commonProps}
            className="text-2xl font-semibold text-gray-900 leading-snug py-0.5"
          />
        );

      case 'h3':
        return (
          <EditableDiv
            {...commonProps}
            className="text-xl font-semibold text-gray-800 leading-snug py-0.5"
          />
        );

      case 'bulleted-list':
        return (
          <div className="flex items-start gap-2">
            <span className="text-gray-400 mt-0.5 flex-shrink-0 select-none w-5 text-center text-lg leading-7">
              •
            </span>
            <EditableDiv
              {...commonProps}
              className="text-gray-700 leading-7 flex-1"
            />
          </div>
        );

      case 'numbered-list': {
        const num = getListNumber(blocks, index);
        return (
          <div className="flex items-start gap-2">
            <span className="text-gray-400 mt-0 flex-shrink-0 select-none w-5 text-right font-medium text-sm leading-7 tabular-nums">
              {num}.
            </span>
            <EditableDiv
              {...commonProps}
              className="text-gray-700 leading-7 flex-1"
            />
          </div>
        );
      }

      case 'toggle':
        return (
          <div>
            <div className="flex items-start gap-1">
              <button
                onClick={() => toggleBlockOpen(block.id)}
                className="flex-shrink-0 w-6 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                <svg
                  className={cn('toggle-arrow w-3.5 h-3.5', block.isOpen && 'open')}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <EditableDiv
                {...commonProps}
                className="text-gray-700 leading-7 flex-1 font-medium"
              />
            </div>
            {block.isOpen && (
              <div className="ml-7 mt-1 fade-in">
                <EditableDiv
                  innerRef={(el) => {
                    if (el) toggleContentRefs.current.set(block.id, el);
                    else toggleContentRefs.current.delete(block.id);
                  }}
                  value={block.toggleContent || ''}
                  onChange={(text) => updateToggleContent(block.id, text)}
                  onKeyDown={(e) => handleToggleContentKeyDown(e, block.id)}
                  placeholder="Toggle content..."
                  className="text-gray-500 leading-7 border-l-2 border-gray-200 pl-3 py-1"
                />
              </div>
            )}
          </div>
        );

      case 'quote':
        return (
          <div className="flex">
            <div className="w-1 bg-gray-900 rounded-full flex-shrink-0 mr-3" />
            <EditableDiv
              {...commonProps}
              className="text-gray-700 leading-7 flex-1 text-lg"
            />
          </div>
        );

      case 'callout':
        return (
          <div className="bg-amber-50/70 border border-amber-200/60 rounded-lg px-4 py-3 flex items-start gap-3">
            <span className="text-xl flex-shrink-0 mt-0.5 select-none">💡</span>
            <EditableDiv
              {...commonProps}
              className="text-gray-700 leading-7 flex-1"
            />
          </div>
        );

      default: // 'text'
        return (
          <EditableDiv
            {...commonProps}
            className="text-gray-700 leading-7"
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Cover / Header gradient */}
      <div className="h-48 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(168,85,247,0.06),transparent_60%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
      </div>

      {/* Page content */}
      <div className="max-w-3xl mx-auto px-6 -mt-12">
        {/* Page icon */}
        <div className="text-6xl mb-3 select-none">📝</div>

        {/* Page title */}
        <EditableDiv
          value={pageTitle}
          onChange={setPageTitle}
          className="page-title text-5xl font-bold text-gray-900 mb-2 outline-none leading-tight"
          placeholder="Untitled"
        />

        {/* Subtitle/metadata */}
        <p className="text-sm text-gray-400 mb-8">
          Type{' '}
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono border border-gray-200">
            /
          </kbd>{' '}
          for commands · Drag{' '}
          <span className="text-gray-500 font-mono">⠿</span> to reorder ·{' '}
          <span className="text-gray-500">{blocks.length} blocks</span>
        </p>

        {/* Blocks */}
        <div className="pb-40">
          {blocks.map((block, index) => {
            const isDragging = dragState.draggedId === block.id;
            const isDropTarget = dragState.overId === block.id;

            return (
              <div
                key={block.id}
                className={cn(
                  'block-row group relative flex items-stretch -ml-10 pl-10 rounded-lg',
                  isDragging && 'block-dragging',
                  isDropTarget &&
                    dragState.position === 'before' &&
                    'drop-before',
                  isDropTarget &&
                    dragState.position === 'after' &&
                    'drop-after'
                )}
                onMouseEnter={() => setHoveredBlockId(block.id)}
                onMouseLeave={() => setHoveredBlockId(null)}
                onDragOver={(e) => handleDragOver(e, block.id)}
                onDrop={handleDrop}
              >
                {/* Left controls: Add + Drag */}
                <div
                  className={cn(
                    'absolute left-0 top-0 flex items-center gap-0.5 pt-0.5 transition-opacity duration-100',
                    hoveredBlockId === block.id
                      ? 'opacity-100'
                      : 'opacity-0'
                  )}
                >
                  {/* Add button */}
                  <button
                    className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded transition-colors"
                    onClick={() => addBlockAfter(block.id)}
                    title="Add block below"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <line x1="8" y1="3" x2="8" y2="13" />
                      <line x1="3" y1="8" x2="13" y2="8" />
                    </svg>
                  </button>

                  {/* Drag handle */}
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, block.id)}
                    onDragEnd={handleDragEnd}
                    className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded cursor-grab active:cursor-grabbing transition-colors"
                    title="Drag to reorder"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                      <circle cx="4.5" cy="2.5" r="1.2" />
                      <circle cx="9.5" cy="2.5" r="1.2" />
                      <circle cx="4.5" cy="7" r="1.2" />
                      <circle cx="9.5" cy="7" r="1.2" />
                      <circle cx="4.5" cy="11.5" r="1.2" />
                      <circle cx="9.5" cy="11.5" r="1.2" />
                    </svg>
                  </div>
                </div>

                {/* Block content */}
                <div className="flex-1 py-0.5 min-w-0">
                  {renderBlockContent(block, index)}
                </div>
              </div>
            );
          })}

          {/* Add block at end */}
          <div className="mt-2">
            <button
              className="text-gray-300 hover:text-gray-500 text-sm flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => {
                const lastBlock = blocks[blocks.length - 1];
                if (lastBlock) {
                  addBlockAfter(lastBlock.id);
                }
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="7" y1="2" x2="7" y2="12" />
                <line x1="2" y1="7" x2="12" y2="7" />
              </svg>
              Add a block
            </button>
          </div>
        </div>
      </div>

      {/* Slash command menu (portal) */}
      {slashMenu &&
        createPortal(
          <SlashMenu
            commands={filteredCommands}
            selectedIndex={slashMenu.selectedIndex}
            position={slashMenu.position}
            onSelect={handleSlashSelect}
            onHover={(index) =>
              setSlashMenu(prev => (prev ? { ...prev, selectedIndex: index } : null))
            }
          />,
          document.body
        )}
    </div>
  );
};

// ─── Placeholder helper ───
function getPlaceholder(type: BlockType): string {
  switch (type) {
    case 'h1':
      return 'Heading 1';
    case 'h2':
      return 'Heading 2';
    case 'h3':
      return 'Heading 3';
    case 'bulleted-list':
      return 'List item';
    case 'numbered-list':
      return 'List item';
    case 'toggle':
      return 'Toggle header';
    case 'quote':
      return 'Quote';
    case 'callout':
      return 'Callout';
    default:
      return "Type '/' for commands...";
  }
}
