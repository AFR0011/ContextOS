import { nanoid } from 'nanoid';

export type BlockType =
  | 'text'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bulleted-list'
  | 'numbered-list'
  | 'toggle'
  | 'quote'
  | 'divider'
  | 'callout';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  isOpen?: boolean;
  toggleContent?: string;
}

export interface SlashMenuState {
  blockId: string;
  filter: string;
  slashIndex: number;
  position: { x: number; y: number };
  selectedIndex: number;
}

export interface DragState {
  draggedId: string | null;
  overId: string | null;
  position: 'before' | 'after';
}

export interface SlashCommand {
  type: BlockType;
  label: string;
  description: string;
  icon: string;
  keywords: string[];
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { type: 'text', label: 'Text', description: 'Plain text block', icon: 'Aa', keywords: ['text', 'paragraph', 'plain'] },
  { type: 'h1', label: 'Heading 1', description: 'Large section heading', icon: 'H1', keywords: ['heading', 'h1', 'title', 'large'] },
  { type: 'h2', label: 'Heading 2', description: 'Medium section heading', icon: 'H2', keywords: ['heading', 'h2', 'subtitle', 'medium'] },
  { type: 'h3', label: 'Heading 3', description: 'Small section heading', icon: 'H3', keywords: ['heading', 'h3', 'small'] },
  { type: 'bulleted-list', label: 'Bulleted List', description: 'Simple bulleted list', icon: '•', keywords: ['bullet', 'list', 'unordered', 'ul'] },
  { type: 'numbered-list', label: 'Numbered List', description: 'Numbered list item', icon: '1.', keywords: ['number', 'list', 'ordered', 'ol'] },
  { type: 'toggle', label: 'Toggle', description: 'Collapsible toggle block', icon: '▶', keywords: ['toggle', 'collapse', 'expand', 'accordion'] },
  { type: 'quote', label: 'Quote', description: 'Capture a quotation', icon: '"', keywords: ['quote', 'blockquote', 'citation'] },
  { type: 'callout', label: 'Callout', description: 'Highlight important info', icon: '💡', keywords: ['callout', 'info', 'warning', 'tip', 'note'] },
  { type: 'divider', label: 'Divider', description: 'Horizontal line divider', icon: '—', keywords: ['divider', 'line', 'separator', 'hr'] },
];

export function genId(): string {
  return nanoid(10);
}

export function getFilteredCommands(filter: string): SlashCommand[] {
  if (!filter) return SLASH_COMMANDS;
  const lower = filter.toLowerCase();
  return SLASH_COMMANDS.filter(
    cmd =>
      cmd.label.toLowerCase().includes(lower) ||
      cmd.keywords.some(k => k.includes(lower))
  );
}

export function getListNumber(blocks: Block[], index: number): number {
  let count = 1;
  for (let i = index - 1; i >= 0; i--) {
    if (blocks[i].type === 'numbered-list') count++;
    else break;
  }
  return count;
}

export const SAMPLE_BLOCKS: Block[] = [
  { id: genId(), type: 'h1', content: 'Welcome to NotionFlow' },
  { id: genId(), type: 'text', content: 'A beautiful block-based editor inspired by Notion. Click any block to edit, type / for commands, and drag to reorder.' },
  { id: genId(), type: 'divider', content: '' },
  { id: genId(), type: 'h2', content: '✨ Features' },
  { id: genId(), type: 'bulleted-list', content: 'Rich block types — text, headings, lists, toggles, quotes, callouts, and dividers' },
  { id: genId(), type: 'bulleted-list', content: 'Slash commands — type / to quickly insert or change block types' },
  { id: genId(), type: 'bulleted-list', content: 'Drag & drop — grab the handle on the left to reorder any block' },
  { id: genId(), type: 'bulleted-list', content: 'Keyboard shortcuts — Enter for new blocks, Backspace to delete empty ones' },
  { id: genId(), type: 'divider', content: '' },
  { id: genId(), type: 'h2', content: '📋 Getting Started' },
  { id: genId(), type: 'numbered-list', content: 'Click on any block to start editing its content' },
  { id: genId(), type: 'numbered-list', content: 'Type / anywhere to open the slash command menu' },
  { id: genId(), type: 'numbered-list', content: 'Hover over a block and drag the ⠿ handle to reorder' },
  { id: genId(), type: 'numbered-list', content: 'Press Enter to create a new block below the current one' },
  { id: genId(), type: 'numbered-list', content: 'Press Backspace on an empty block to delete it' },
  { id: genId(), type: 'divider', content: '' },
  { id: genId(), type: 'h3', content: 'Frequently Asked Questions' },
  { id: genId(), type: 'toggle', content: 'What block types are supported?', isOpen: true, toggleContent: 'This editor supports text, headings (H1-H3), bulleted lists, numbered lists, toggles, quotes, callouts, and dividers. More coming soon!' },
  { id: genId(), type: 'toggle', content: 'How do slash commands work?', isOpen: false, toggleContent: 'Type "/" in any text block to open the command palette. Use arrow keys to navigate, type to filter, and press Enter to select a command.' },
  { id: genId(), type: 'toggle', content: 'Can I reorder blocks?', isOpen: false, toggleContent: 'Yes! Hover over any block to reveal the drag handle (⠿) on the left side. Click and drag it to move the block to a new position.' },
  { id: genId(), type: 'divider', content: '' },
  { id: genId(), type: 'quote', content: 'The best way to predict the future is to create it. — Peter Drucker' },
  { id: genId(), type: 'callout', content: 'Pro tip: You can convert any block to a different type using slash commands. Just clear the text, type /, and pick a new type!' },
  { id: genId(), type: 'text', content: '' },
];
