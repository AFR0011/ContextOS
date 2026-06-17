import { EditorBlock, BlockType } from "./editorTypes";

// Simple and robust unique ID generator
export const generateId = (): string => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 11);
};

export function createEmptyBlock(): EditorBlock {
  return {
    id: generateId(),
    type: "paragraph",
    text: "",
  };
}

export function changeBlockType(block: EditorBlock, type: BlockType): EditorBlock {
  return {
    ...block,
    type,
    checked: type === "todo" ? (block.checked !== undefined ? block.checked : false) : undefined,
    language: type === "code" ? (block.language !== undefined ? block.language : "ts") : undefined,
  };
}

/**
 * Parses a plain Markdown string into an array of EditorBlocks.
 * Handles headings, paragraphs, lists, todo checkboxes, quotes, dividers, and multi-line code blocks.
 */
export function parseMarkdownToBlocks(markdown: string): EditorBlock[] {
  if (markdown === undefined || markdown === null) {
    return [createEmptyBlock()];
  }

  const trimmedMarkdown = markdown.trim();
  if (trimmedMarkdown === "") {
    return [createEmptyBlock()];
  }

  const lines = markdown.split(/\r?\n/);
  const blocks: EditorBlock[] = [];

  let inCodeBlock = false;
  let currentCodeText: string[] = [];
  let currentCodeLang = "";
  let currentCodeId = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code block toggle
    const codeBlockMatch = line.match(/^```(\w*)\s*$/);
    if (codeBlockMatch) {
      if (inCodeBlock) {
        // End of code block
        blocks.push({
          id: currentCodeId,
          type: "code",
          text: currentCodeText.join("\n"),
          language: currentCodeLang || "ts",
        });
        inCodeBlock = false;
        currentCodeText = [];
        currentCodeLang = "";
        currentCodeId = "";
      } else {
        // Start of code block
        inCodeBlock = true;
        currentCodeLang = codeBlockMatch[1] || "ts";
        currentCodeId = generateId();
        currentCodeText = [];
      }
      continue;
    }

    // If we are inside a code block, consume all lines
    if (inCodeBlock) {
      currentCodeText.push(line);
      continue;
    }

    // Skip empty lines to avoid cluttered blank blocks, but if there's nothing else in the file,
    // or if we have consecutive empty lines, we could keep one.
    // For a clean block editor, skipping empty lines is highly recommended because standard Markdown
    // uses them as separators, and they would otherwise turn into empty paragraphs.
    if (line.trim() === "") {
      continue;
    }

    // Parse Heading 1
    const h1Match = line.match(/^#\s+(.*)$/);
    if (h1Match) {
      blocks.push({
        id: generateId(),
        type: "heading1",
        text: h1Match[1],
      });
      continue;
    }

    // Parse Heading 2
    const h2Match = line.match(/^##\s+(.*)$/);
    if (h2Match) {
      blocks.push({
        id: generateId(),
        type: "heading2",
        text: h2Match[1],
      });
      continue;
    }

    // Parse Heading 3
    const h3Match = line.match(/^###\s+(.*)$/);
    if (h3Match) {
      blocks.push({
        id: generateId(),
        type: "heading3",
        text: h3Match[1],
      });
      continue;
    }

    // Parse Todo checkboxes: "- [ ] task" or "- [x] task"
    const todoMatch = line.match(/^-\s+\[([ xX])\]\s*(.*)$/);
    if (todoMatch) {
      const checked = todoMatch[1].toLowerCase() === "x";
      blocks.push({
        id: generateId(),
        type: "todo",
        text: todoMatch[2],
        checked,
      });
      continue;
    }

    // Parse Bullet lists: "- item" or "* item" or "+ item"
    const bulletMatch = line.match(/^[-*+]\s+(.*)$/);
    if (bulletMatch) {
      blocks.push({
        id: generateId(),
        type: "bullet",
        text: bulletMatch[1],
      });
      continue;
    }

    // Parse Numbered lists: "1. item" or "12. item"
    const numberedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (numberedMatch) {
      blocks.push({
        id: generateId(),
        type: "numbered",
        text: numberedMatch[1],
      });
      continue;
    }

    // Parse Quote: "> quote text"
    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      blocks.push({
        id: generateId(),
        type: "quote",
        text: quoteMatch[1],
      });
      continue;
    }

    // Parse Divider: "---"
    if (line.trim() === "---") {
      blocks.push({
        id: generateId(),
        type: "divider",
        text: "",
      });
      continue;
    }

    // Default: Paragraph
    blocks.push({
      id: generateId(),
      type: "paragraph",
      text: line,
    });
  }

  // Handle unclosed code block at the end of the file
  if (inCodeBlock) {
    blocks.push({
      id: currentCodeId,
      type: "code",
      text: currentCodeText.join("\n"),
      language: currentCodeLang || "ts",
    });
  }

  // Return at least one empty block if nothing was parsed
  if (blocks.length === 0) {
    return [createEmptyBlock()];
  }

  return blocks;
}

/**
 * Serializes an array of EditorBlocks back to a plain Markdown string.
 * Uses tight list formatting (single newline) for consecutive items of the same list type,
 * and double newlines for other blocks. Sequential numbers are generated for numbered lists.
 */
export function serializeBlocksToMarkdown(blocks: EditorBlock[]): string {
  if (!blocks || blocks.length === 0) {
    return "";
  }

  const serializedLines: string[] = [];
  let numberedIndex = 1;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    let serialized = "";

    switch (block.type) {
      case "heading1":
        serialized = `# ${block.text}`;
        break;
      case "heading2":
        serialized = `## ${block.text}`;
        break;
      case "heading3":
        serialized = `### ${block.text}`;
        break;
      case "bullet":
        serialized = `- ${block.text}`;
        break;
      case "numbered": {
        if (i === 0 || blocks[i - 1].type !== "numbered") {
          numberedIndex = 1;
        }
        serialized = `${numberedIndex}. ${block.text}`;
        numberedIndex++;
        break;
      }
      case "todo":
        serialized = `- [${block.checked ? "x" : " "}] ${block.text}`;
        break;
      case "quote":
        // Handle potential multiline text in quote
        serialized = block.text
          .split("\n")
          .map(line => `> ${line}`)
          .join("\n");
        if (serialized === "") {
          serialized = "> ";
        }
        break;
      case "code":
        serialized = `\`\`\`${block.language || "ts"}\n${block.text}\n\`\`\``;
        break;
      case "divider":
        serialized = "---";
        break;
      case "paragraph":
      default:
        serialized = block.text;
        break;
    }

    serializedLines.push(serialized);
  }

  // Join lines with appropriate spacing
  let result = "";
  for (let i = 0; i < serializedLines.length; i++) {
    result += serializedLines[i];
    if (i < serializedLines.length - 1) {
      const currentType = blocks[i].type;
      const nextType = blocks[i + 1].type;

      // Tight list item spacing: single newline if consecutive blocks are of the EXACT same list type
      const isSameListType =
        (currentType === "bullet" && nextType === "bullet") ||
        (currentType === "numbered" && nextType === "numbered") ||
        (currentType === "todo" && nextType === "todo");

      if (isSameListType) {
        result += "\n";
      } else {
        result += "\n\n";
      }
    }
  }

  return result;
}
