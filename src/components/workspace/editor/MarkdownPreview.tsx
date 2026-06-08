"use client";

import { Check, Copy } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  headingLevel,
  isToggleHeadingType,
  parseMarkdownToBlocks,
  toggleGroupEndIndex
} from "./markdownBlocks";
import type { EditorBlock } from "./editorTypes";

interface MarkdownPreviewProps {
  content?: string;
  markdown?: string;
  className?: string;
}

function renderFormattedText(text: string): ReactNode {
  if (!text) return <span className="invisible">&nbsp;</span>;

  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|_[^_]+_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const token = match[0];
    const key = `${match.index}-${token}`;

    if (token.startsWith("**")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={key} className="rounded bg-[var(--cos-bg-inset)] px-1 py-0.5 font-mono text-[0.82em] text-[var(--cos-danger-text)]">
          {token.slice(1, -1)}
        </code>
      );
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function renderHeading(block: EditorBlock, key: string) {
  if (block.type === "heading1") {
    return <h1 key={key} className="mt-4 border-b border-[var(--cos-border-soft)] pb-1 text-xl font-bold text-[var(--cos-text-strong)]">{renderFormattedText(block.text)}</h1>;
  }
  if (block.type === "heading2") {
    return <h2 key={key} className="mt-3 text-base font-bold text-[var(--cos-text-strong)]">{renderFormattedText(block.text)}</h2>;
  }
  return <h3 key={key} className="mt-2 text-sm font-bold text-[var(--cos-text-strong)]">{renderFormattedText(block.text)}</h3>;
}

function renderBlocks(blocks: EditorBlock[], startIndex: number, endIndex: number): ReactNode[] {
  const nodes: ReactNode[] = [];
  let numberedIndex = 1;
  let index = startIndex;

  while (index < endIndex) {
    const block = blocks[index];
    const key = block.id;

    if (isToggleHeadingType(block.type)) {
      const level = headingLevel(block.type) ?? 2;
      const groupEnd = toggleGroupEndIndex(blocks, index);
      nodes.push(
        <details
          key={key}
          open={block.open !== false}
          className="my-2 rounded-lg border border-[var(--cos-border-soft)] bg-[var(--cos-bg-soft)] px-3 py-2"
        >
          <summary className="cursor-pointer list-none text-[var(--cos-text-strong)] marker:hidden">
            <span className={level === 1 ? "text-lg font-bold" : level === 2 ? "text-base font-bold" : "text-sm font-bold"}>
              {renderFormattedText(block.text)}
            </span>
          </summary>
          <div className="mt-2 border-l border-[var(--cos-border)] pl-3">
            {renderBlocks(blocks, index + 1, groupEnd)}
          </div>
        </details>
      );
      index = groupEnd;
      numberedIndex = 1;
      continue;
    }

    switch (block.type) {
      case "heading1":
      case "heading2":
      case "heading3":
        nodes.push(renderHeading(block, key));
        numberedIndex = 1;
        break;
      case "bullet":
        nodes.push(
          <div key={key} className="flex items-start gap-2 py-0.5 pl-2 text-sm text-[var(--cos-text)]">
            <span className="mt-0.5 text-[var(--cos-text-subtle)]">-</span>
            <span>{renderFormattedText(block.text)}</span>
          </div>
        );
        numberedIndex = 1;
        break;
      case "numbered": {
        if (index === startIndex || blocks[index - 1].type !== "numbered") numberedIndex = 1;
        const current = numberedIndex;
        numberedIndex += 1;
        nodes.push(
          <div key={key} className="flex items-start gap-2 py-0.5 pl-2 text-sm text-[var(--cos-text)]">
            <span className="w-5 text-right text-[var(--cos-text-subtle)]">{current}.</span>
            <span>{renderFormattedText(block.text)}</span>
          </div>
        );
        break;
      }
      case "todo":
        nodes.push(
          <div key={key} className="flex items-start gap-2 py-0.5 pl-2 text-sm text-[var(--cos-text)]">
            <input type="checkbox" checked={Boolean(block.checked)} readOnly className="mt-1 h-4 w-4 rounded border-[var(--cos-border-strong)]" />
            <span className={block.checked ? "text-[var(--cos-text-subtle)] line-through" : ""}>{renderFormattedText(block.text)}</span>
          </div>
        );
        numberedIndex = 1;
        break;
      case "quote":
        nodes.push(
          <blockquote key={key} className="my-2 border-l-4 border-[var(--cos-primary-border)] bg-[var(--cos-bg-soft)] px-3 py-2 text-sm italic text-[var(--cos-text-muted)]">
            {renderFormattedText(block.text)}
          </blockquote>
        );
        numberedIndex = 1;
        break;
      case "code":
        nodes.push(<CodePreview key={key} block={block} />);
        numberedIndex = 1;
        break;
      case "divider":
        nodes.push(<hr key={key} className="my-4 border-[var(--cos-border-soft)]" />);
        numberedIndex = 1;
        break;
      case "paragraph":
      default:
        nodes.push(<p key={key} className="my-1 text-sm leading-6 text-[var(--cos-text)]">{renderFormattedText(block.text)}</p>);
        numberedIndex = 1;
        break;
    }

    index += 1;
  }

  return nodes;
}

function CodePreview({ block }: { block: EditorBlock }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-[var(--cos-border)] bg-[var(--cos-text-strong)]">
      <div className="flex items-center justify-between bg-black/20 px-3 py-2 text-xs text-[var(--cos-text-inverse)]">
        <span className="font-mono opacity-75">{block.language || "code"}</span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(block.text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          }}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-white/10"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="m-0 overflow-x-auto p-3 text-xs leading-5 text-[var(--cos-text-inverse)]"><code>{block.text}</code></pre>
    </div>
  );
}

export function MarkdownPreview({ content, markdown, className = "" }: MarkdownPreviewProps) {
  const source = markdown ?? content ?? "";
  const blocks = parseMarkdownToBlocks(source);
  return <div className={`prose-lite max-w-none ${className}`}>{renderBlocks(blocks, 0, blocks.length)}</div>;
}
