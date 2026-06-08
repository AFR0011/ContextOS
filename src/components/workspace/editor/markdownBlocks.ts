import { BlockType, EditorBlock } from "./editorTypes";

export const generateId = (): string => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11);
};

export function isToggleHeadingType(type: BlockType) {
  return type === "toggleHeading1" || type === "toggleHeading2" || type === "toggleHeading3";
}

export function headingLevel(type: BlockType): number | null {
  if (type === "heading1" || type === "toggleHeading1") return 1;
  if (type === "heading2" || type === "toggleHeading2") return 2;
  if (type === "heading3" || type === "toggleHeading3") return 3;
  return null;
}

export function toggleTypeForLevel(level: number): BlockType {
  if (level === 1) return "toggleHeading1";
  if (level === 2) return "toggleHeading2";
  return "toggleHeading3";
}

export function createEmptyBlock(type: BlockType = "paragraph"): EditorBlock {
  return {
    id: generateId(),
    type,
    text: "",
    checked: type === "todo" ? false : undefined,
    language: type === "code" ? "ts" : undefined,
    open: isToggleHeadingType(type) ? true : undefined
  };
}

export function changeBlockType(block: EditorBlock, type: BlockType): EditorBlock {
  return {
    ...block,
    type,
    checked: type === "todo" ? block.checked ?? false : undefined,
    language: type === "code" ? block.language ?? "ts" : undefined,
    open: isToggleHeadingType(type) ? block.open ?? true : undefined
  };
}

function decodeHtml(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseSummaryLine(line: string) {
  const withHeading = line.match(/^<summary>\s*<h([1-3])>\s*(.*?)\s*<\/h\1>\s*<\/summary>$/i);
  if (withHeading) {
    return {
      level: Number(withHeading[1]),
      text: decodeHtml(withHeading[2] ?? "")
    };
  }

  const plain = line.match(/^<summary>\s*(.*?)\s*<\/summary>$/i);
  if (plain) {
    return {
      level: 2,
      text: decodeHtml(plain[1] ?? "")
    };
  }

  return null;
}

function findDetailsEnd(lines: string[], startIndex: number) {
  let depth = 0;
  for (let index = startIndex; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (/^<details(?:\s+open)?\s*>$/i.test(trimmed)) depth += 1;
    if (/^<\/details>$/i.test(trimmed)) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function parseLinesToBlocks(lines: string[]): EditorBlock[] {
  const blocks: EditorBlock[] = [];
  let inCodeBlock = false;
  let currentCodeText: string[] = [];
  let currentCodeLang = "";
  let currentCodeId = "";

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    const codeBlockMatch = line.match(/^```([\w-]*)\s*$/);
    if (codeBlockMatch) {
      if (inCodeBlock) {
        blocks.push({
          id: currentCodeId,
          type: "code",
          text: currentCodeText.join("\n"),
          language: currentCodeLang || "ts"
        });
        inCodeBlock = false;
        currentCodeText = [];
        currentCodeLang = "";
        currentCodeId = "";
      } else {
        inCodeBlock = true;
        currentCodeLang = codeBlockMatch[1] || "ts";
        currentCodeId = generateId();
        currentCodeText = [];
      }
      continue;
    }

    if (inCodeBlock) {
      currentCodeText.push(line);
      continue;
    }

    const detailsMatch = trimmed.match(/^<details(\s+open)?\s*>$/i);
    if (detailsMatch) {
      const summary = parseSummaryLine(lines[index + 1]?.trim() ?? "");
      const detailsEnd = findDetailsEnd(lines, index);
      if (summary && detailsEnd > index + 1) {
        blocks.push({
          id: generateId(),
          type: toggleTypeForLevel(summary.level),
          text: summary.text,
          open: Boolean(detailsMatch[1])
        });
        const childLines = lines.slice(index + 2, detailsEnd);
        blocks.push(...parseLinesToBlocks(childLines));
        index = detailsEnd;
        continue;
      }
    }

    if (trimmed === "") {
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        id: generateId(),
        type: `heading${headingMatch[1].length}` as BlockType,
        text: headingMatch[2]
      });
      continue;
    }

    const todoMatch = line.match(/^-\s+\[([ xX])\]\s*(.*)$/);
    if (todoMatch) {
      blocks.push({
        id: generateId(),
        type: "todo",
        text: todoMatch[2],
        checked: todoMatch[1].toLowerCase() === "x"
      });
      continue;
    }

    const bulletMatch = line.match(/^[-*+]\s+(.*)$/);
    if (bulletMatch) {
      blocks.push({
        id: generateId(),
        type: "bullet",
        text: bulletMatch[1]
      });
      continue;
    }

    const numberedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (numberedMatch) {
      blocks.push({
        id: generateId(),
        type: "numbered",
        text: numberedMatch[1]
      });
      continue;
    }

    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      blocks.push({
        id: generateId(),
        type: "quote",
        text: quoteMatch[1]
      });
      continue;
    }

    if (trimmed === "---") {
      blocks.push({
        id: generateId(),
        type: "divider",
        text: ""
      });
      continue;
    }

    blocks.push({
      id: generateId(),
      type: "paragraph",
      text: line
    });
  }

  if (inCodeBlock) {
    blocks.push({
      id: currentCodeId,
      type: "code",
      text: currentCodeText.join("\n"),
      language: currentCodeLang || "ts"
    });
  }

  return blocks;
}

export function parseMarkdownToBlocks(markdown: string): EditorBlock[] {
  if (!markdown || markdown.trim() === "") {
    return [createEmptyBlock()];
  }

  const blocks = parseLinesToBlocks(markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n"));
  return blocks.length ? blocks : [createEmptyBlock()];
}

function findToggleGroupEnd(blocks: EditorBlock[], startIndex: number, rangeEnd = blocks.length) {
  const level = headingLevel(blocks[startIndex].type);
  if (!level) return startIndex + 1;

  for (let index = startIndex + 1; index < rangeEnd; index += 1) {
    const currentLevel = headingLevel(blocks[index].type);
    if (currentLevel !== null && currentLevel <= level) {
      return index;
    }
  }

  return rangeEnd;
}

function serializeSingleBlock(block: EditorBlock, numberedIndex: number) {
  switch (block.type) {
    case "heading1":
      return `# ${block.text}`;
    case "heading2":
      return `## ${block.text}`;
    case "heading3":
      return `### ${block.text}`;
    case "bullet":
      return `- ${block.text}`;
    case "numbered":
      return `${numberedIndex}. ${block.text}`;
    case "todo":
      return `- [${block.checked ? "x" : " "}] ${block.text}`;
    case "quote": {
      const quote = block.text
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
      return quote || "> ";
    }
    case "code":
      return `\`\`\`${block.language || "ts"}\n${block.text}\n\`\`\``;
    case "divider":
      return "---";
    case "paragraph":
    default:
      return block.text;
  }
}

function joinSerialized(items: { markdown: string; type: BlockType }[]) {
  let result = "";

  for (let index = 0; index < items.length; index += 1) {
    result += items[index].markdown;
    if (index >= items.length - 1) continue;

    const currentType = items[index].type;
    const nextType = items[index + 1].type;
    const sameListType =
      (currentType === "bullet" && nextType === "bullet") ||
      (currentType === "numbered" && nextType === "numbered") ||
      (currentType === "todo" && nextType === "todo");

    result += sameListType ? "\n" : "\n\n";
  }

  return result;
}

function serializeRange(blocks: EditorBlock[], startIndex: number, endIndex: number) {
  const items: { markdown: string; type: BlockType }[] = [];
  let numberedIndex = 1;
  let index = startIndex;

  while (index < endIndex) {
    const block = blocks[index];

    if (isToggleHeadingType(block.type)) {
      const level = headingLevel(block.type) ?? 2;
      const groupEnd = findToggleGroupEnd(blocks, index, endIndex);
      const children = serializeRange(blocks, index + 1, groupEnd);
      const open = block.open === false ? "" : " open";
      const body = children.trim() ? `\n\n${children}\n\n` : "\n";
      items.push({
        type: block.type,
        markdown: `<details${open}>\n<summary><h${level}>${escapeHtml(block.text)}</h${level}></summary>${body}</details>`
      });
      numberedIndex = 1;
      index = groupEnd;
      continue;
    }

    if (block.type === "numbered" && (index === startIndex || blocks[index - 1].type !== "numbered")) {
      numberedIndex = 1;
    }

    items.push({
      type: block.type,
      markdown: serializeSingleBlock(block, numberedIndex)
    });

    if (block.type === "numbered") numberedIndex += 1;
    else numberedIndex = 1;
    index += 1;
  }

  return joinSerialized(items);
}

export function serializeBlocksToMarkdown(blocks: EditorBlock[]): string {
  if (!blocks.length || (blocks.length === 1 && blocks[0].type === "paragraph" && blocks[0].text === "")) {
    return "";
  }
  return serializeRange(blocks, 0, blocks.length);
}

export function markdownShortcutToBlock(block: EditorBlock, text: string): EditorBlock | null {
  if (block.type === "code") return null;

  const headingMatch = text.match(/^(#{1,3})\s+(.*)$/);
  if (headingMatch) {
    return {
      ...changeBlockType(block, `heading${headingMatch[1].length}` as BlockType),
      text: headingMatch[2]
    };
  }

  const todoMatch = text.match(/^-\s+\[([ xX])\]\s*(.*)$/);
  if (todoMatch) {
    return {
      ...changeBlockType(block, "todo"),
      text: todoMatch[2],
      checked: todoMatch[1].toLowerCase() === "x"
    };
  }

  const bulletMatch = text.match(/^[-*+]\s+(.*)$/);
  if (bulletMatch) {
    return {
      ...changeBlockType(block, "bullet"),
      text: bulletMatch[1]
    };
  }

  const numberedMatch = text.match(/^\d+\.\s+(.*)$/);
  if (numberedMatch) {
    return {
      ...changeBlockType(block, "numbered"),
      text: numberedMatch[1]
    };
  }

  const quoteMatch = text.match(/^>\s?(.*)$/);
  if (quoteMatch) {
    return {
      ...changeBlockType(block, "quote"),
      text: quoteMatch[1]
    };
  }

  if (text.trim() === "---") {
    return {
      ...changeBlockType(block, "divider"),
      text: ""
    };
  }

  return null;
}

export function hiddenBlockIdsForCollapsedToggles(blocks: EditorBlock[]) {
  const hidden = new Set<string>();

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (!isToggleHeadingType(block.type) || block.open !== false || hidden.has(block.id)) {
      continue;
    }

    const groupEnd = findToggleGroupEnd(blocks, index);
    for (let childIndex = index + 1; childIndex < groupEnd; childIndex += 1) {
      hidden.add(blocks[childIndex].id);
    }
  }

  return hidden;
}

export function toggleGroupEndIndex(blocks: EditorBlock[], startIndex: number) {
  return findToggleGroupEnd(blocks, startIndex);
}
