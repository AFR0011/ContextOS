import React, { useState } from "react";
import { parseMarkdownToBlocks } from "../lib/markdownBlocks";
import { Copy, Check } from "lucide-react";

interface MarkdownPreviewProps {
  markdown: string;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ markdown }) => {
  const blocks = parseMarkdownToBlocks(markdown);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Safe inline text formatter for bold, italic, and inline code
  const renderFormattedText = (text: string): React.ReactNode => {
    if (!text) return <span className="invisible">&nbsp;</span>;

    // Escape HTML to prevent XSS
    let escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    // Replace **bold** with <strong>bold</strong>
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Replace *italic* or _italic_ with <em>italic</em>
    escaped = escaped.replace(/\*(.*?)\*/g, "<em>$1</em>");
    escaped = escaped.replace(/_(.*?)_/g, "<em>$1</em>");

    // Replace `code` with styled code tag
    escaped = escaped.replace(
      /`(.*?)`/g,
      '<code class="px-1 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-red-600 font-mono text-xs font-semibold">$1</code>'
    );

    return <span dangerouslySetInnerHTML={{ __html: escaped }} />;
  };

  const handleCopyCode = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Group numbered lists to render sequential numbers correctly in the preview
  let numberedIndex = 1;

  return (
    <div className="prose max-w-none">
      {blocks.map((block, index) => {
        // Reset or increment numbered list index
        if (block.type === "numbered") {
          if (index === 0 || blocks[index - 1].type !== "numbered") {
            numberedIndex = 1;
          }
        }

        switch (block.type) {
          case "heading1":
            return (
              <h1
                key={block.id}
                className="text-3xl font-extrabold text-neutral-900 mt-6 mb-4 leading-tight border-b border-neutral-100 pb-2"
              >
                {renderFormattedText(block.text)}
              </h1>
            );
          case "heading2":
            return (
              <h2
                key={block.id}
                className="text-2xl font-bold text-neutral-800 mt-5 mb-3 leading-tight"
              >
                {renderFormattedText(block.text)}
              </h2>
            );
          case "heading3":
            return (
              <h3
                key={block.id}
                className="text-xl font-bold text-neutral-800 mt-4 mb-2 leading-tight"
              >
                {renderFormattedText(block.text)}
              </h3>
            );
          case "paragraph":
            return (
              <p key={block.id} className="text-neutral-700 leading-relaxed mb-4 text-base">
                {renderFormattedText(block.text)}
              </p>
            );
          case "bullet":
            return (
              <div key={block.id} className="flex items-start mb-2 pl-4">
                <span className="text-neutral-400 mr-2 select-none font-bold">•</span>
                <span className="text-neutral-700 leading-relaxed">
                  {renderFormattedText(block.text)}
                </span>
              </div>
            );
          case "numbered": {
            const currentNum = numberedIndex;
            numberedIndex++;
            return (
              <div key={block.id} className="flex items-start mb-2 pl-4">
                <span className="text-neutral-400 mr-2 select-none font-medium text-sm w-4 text-right">
                  {currentNum}.
                </span>
                <span className="text-neutral-700 leading-relaxed">
                  {renderFormattedText(block.text)}
                </span>
              </div>
            );
          }
          case "todo":
            return (
              <div key={block.id} className="flex items-start mb-2 pl-4">
                <input
                  type="checkbox"
                  checked={block.checked || false}
                  readOnly
                  className="mt-1 mr-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span
                  className={`text-neutral-700 leading-relaxed ${
                    block.checked ? "line-through text-neutral-400" : ""
                  }`}
                >
                  {renderFormattedText(block.text)}
                </span>
              </div>
            );
          case "quote":
            return (
              <blockquote
                key={block.id}
                className="border-left-4 border-l-4 border-blue-500 bg-neutral-50 px-5 py-3 italic my-4 rounded-r text-neutral-600 font-serif"
              >
                {renderFormattedText(block.text)}
              </blockquote>
            );
          case "code":
            return (
              <div
                key={block.id}
                className="my-4 border border-neutral-200 rounded-lg overflow-hidden bg-neutral-900 shadow-sm"
              >
                <div className="flex justify-between items-center px-4 py-2 bg-neutral-800 text-neutral-400 text-xs font-mono">
                  <span>{block.language || "code"}</span>
                  <button
                    onClick={() => handleCopyCode(block.id, block.text)}
                    className="flex items-center gap-1 hover:text-neutral-200 transition-colors cursor-pointer"
                    title="Copy code"
                  >
                    {copiedId === block.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-green-500 font-semibold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 overflow-x-auto m-0 text-white font-mono text-sm leading-relaxed">
                  <code>{block.text}</code>
                </pre>
              </div>
            );
          case "divider":
            return <hr key={block.id} className="my-6 border-t-2 border-neutral-100" />;
          default:
            return null;
        }
      })}
    </div>
  );
};
