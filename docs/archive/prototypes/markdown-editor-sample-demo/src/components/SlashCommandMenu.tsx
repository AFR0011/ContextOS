import React, { useEffect, useRef } from "react";
import {
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
} from "lucide-react";
import { BlockType } from "../lib/editorTypes";

export interface CommandItem {
  type: BlockType;
  label: string;
  description: string;
  searchKeys: string[];
  icon: React.ComponentType<{ className?: string }>;
}

export const COMMANDS: CommandItem[] = [
  {
    type: "paragraph",
    label: "Text",
    description: "Start writing with plain text",
    searchKeys: ["text", "paragraph", "p", "normal"],
    icon: Type,
  },
  {
    type: "heading1",
    label: "Heading 1",
    description: "Big section heading",
    searchKeys: ["h1", "heading1", "large", "title"],
    icon: Heading1,
  },
  {
    type: "heading2",
    label: "Heading 2",
    description: "Medium section heading",
    searchKeys: ["h2", "heading2", "medium", "subtitle"],
    icon: Heading2,
  },
  {
    type: "heading3",
    label: "Heading 3",
    description: "Small section heading",
    searchKeys: ["h3", "heading3", "small", "subheading"],
    icon: Heading3,
  },
  {
    type: "bullet",
    label: "Bullet list",
    description: "Create a simple bulleted list",
    searchKeys: ["bullet", "list", "unordered", "ul", "-"],
    icon: List,
  },
  {
    type: "numbered",
    label: "Numbered list",
    description: "Create a list with numbering",
    searchKeys: ["number", "numbered", "list", "ordered", "ol", "1"],
    icon: ListOrdered,
  },
  {
    type: "todo",
    label: "To-do list",
    description: "Track tasks with checkboxes",
    searchKeys: ["todo", "task", "checkbox", "check", "completed", "[ ]"],
    icon: CheckSquare,
  },
  {
    type: "quote",
    label: "Quote",
    description: "Capture a blockquote",
    searchKeys: ["quote", "blockquote", "cite", ">"],
    icon: Quote,
  },
  {
    type: "code",
    label: "Code block",
    description: "Write code with language selection",
    searchKeys: ["code", "pre", "javascript", "typescript", "ts", "js", "coding"],
    icon: Code,
  },
  {
    type: "divider",
    label: "Divider",
    description: "Divide sections with a line",
    searchKeys: ["divider", "line", "separator", "hr", "---"],
    icon: Minus,
  },
];

interface SlashCommandMenuProps {
  selectedIndex: number;
  onSelect: (type: BlockType) => void;
  filteredCommands: CommandItem[];
}

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  selectedIndex,
  onSelect,
  filteredCommands,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll selected item into view inside the menu
  useEffect(() => {
    if (!containerRef.current) return;
    const activeEl = containerRef.current.querySelector(".slash-menu-item-active");
    if (activeEl) {
      activeEl.scrollIntoView({
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  if (filteredCommands.length === 0) {
    return (
      <div className="slash-menu-container" ref={containerRef}>
        <div className="slash-menu-title">Basic Blocks</div>
        <div className="slash-menu-empty">No matching blocks found</div>
      </div>
    );
  }

  return (
    <div className="slash-menu-container" ref={containerRef}>
      <div className="slash-menu-title">Basic Blocks</div>
      {filteredCommands.map((command, index) => {
        const IconComponent = command.icon;
        const isActive = index === selectedIndex;

        return (
          <button
            key={command.type}
            type="button"
            className={`slash-menu-item ${isActive ? "slash-menu-item-active" : ""}`}
            onClick={() => onSelect(command.type)}
            aria-label={`Select ${command.label}`}
          >
            <div className="slash-menu-icon">
              <IconComponent className="w-4 h-4" />
            </div>
            <div className="slash-menu-info">
              <span className="slash-menu-label">{command.label}</span>
              <span className="slash-menu-description">{command.description}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
