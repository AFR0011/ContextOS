import { useState } from "react";
import { BlockMarkdownEditor } from "./components/BlockMarkdownEditor";
import { MarkdownPreview } from "./components/MarkdownPreview";
import { DemoField } from "./components/DemoField";
import { loadFromStorage, saveToStorage, STARTER_MARKDOWN } from "./lib/storage";
import {
  FileText,
  Copy,
  Check,
  RotateCcw,
  Eye,
  Code2,
  Settings,
  Keyboard,
  Compass,
  Info,
} from "lucide-react";

function App() {
  const [markdown, setMarkdown] = useState<string>(() =>
    loadFromStorage("main_editor", STARTER_MARKDOWN)
  );
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");

  // Save changes in the main editor to localStorage
  const handleEditorChange = (newMarkdown: string) => {
    setSaveStatus("saving");
    setMarkdown(newMarkdown);
    saveToStorage("main_editor", newMarkdown);
    
    // Simulate a brief saving state for UX
    const timer = setTimeout(() => {
      setSaveStatus("saved");
    }, 400);
    return () => clearTimeout(timer);
  };

  // Copy Markdown to Clipboard
  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Reset Demo Content
  const handleResetContent = () => {
    if (
      window.confirm(
        "Are you sure you want to reset the main editor to the starter content? This will overwrite your current progress."
      )
    ) {
      handleEditorChange(STARTER_MARKDOWN);
    }
  };

  // Formats the output for simple word counts
  const wordCount = markdown ? markdown.split(/\s+/).filter(Boolean).length : 0;
  const charCount = markdown ? markdown.length : 0;
  const blockCount = markdown ? markdown.split(/\n\n+/).filter(Boolean).length : 0;

  return (
    <div className="app-container font-sans text-neutral-900">
      {/* App Header */}
      <header className="app-header">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold mb-3">
          <Compass className="w-3.5 h-3.5" />
          <span>Interactive Prototype</span>
        </div>
        <h1 className="app-title">Block Markdown Editor Demo</h1>
        <p className="app-subtitle">
          A Notion-like visual block editor that accepts and emits clean, standard Markdown.
          Designed to be fully reusable in different form fields, lightweight, and keyboard-first.
        </p>
      </header>

      {/* Main Sandbox Grid */}
      <div className="demo-grid">
        {/* Left Side: The Main Editor Card */}
        <section className="demo-card flex flex-col h-full min-h-[600px]">
          <div className="card-header border-b border-neutral-100 flex justify-between items-center bg-white px-5 py-4">
            <h2 className="card-title text-neutral-800">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>1. Main Editor</span>
            </h2>
            
            <div className="flex items-center gap-3">
              {/* Live Saving Badge */}
              <span
                className={`badge transition-all duration-300 ${
                  saveStatus === "saved" ? "badge-success" : "badge-info animate-pulse"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${saveStatus === "saved" ? "bg-green-600" : "bg-blue-600"}`} />
                {saveStatus === "saved" ? "Saved locally" : "Saving..."}
              </span>

              {/* Reset Action */}
              <button
                onClick={handleResetContent}
                className="btn btn-sm btn-danger cursor-pointer"
                title="Reset editor content to starter template"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset Demo</span>
              </button>
            </div>
          </div>

          <div className="card-body bg-white flex-1 overflow-y-auto max-h-[650px] p-6 sm:p-10">
            {/* The actual editor component */}
            <BlockMarkdownEditor
              value={markdown}
              onChange={handleEditorChange}
              placeholder="Type '/' for block commands, or start writing..."
              mode="full"
              minLines={12}
            />
          </div>

          {/* Editor Footer Metrics */}
          <div className="px-6 py-3 border-t border-neutral-100 bg-neutral-50/50 flex justify-between items-center text-xs text-neutral-500">
            <span className="font-medium">
              Pro tip: Type <kbd className="px-1.5 py-0.5 bg-neutral-200 rounded text-neutral-700 font-mono text-[10px]">/</kbd> at the start of a block
            </span>
            <div className="flex gap-3">
              <span><strong>{blockCount}</strong> blocks</span>
              <span>•</span>
              <span><strong>{wordCount}</strong> words</span>
              <span>•</span>
              <span><strong>{charCount}</strong> characters</span>
            </div>
          </div>
        </section>

        {/* Right Side: Markdown Output & Rendered Preview Stack */}
        <div className="output-panels-container">
          
          {/* Section 2: Markdown Output Card */}
          <section className="demo-card">
            <div className="card-header border-b border-neutral-100 bg-white px-5 py-3">
              <h2 className="card-title text-neutral-800">
                <Code2 className="w-5 h-5 text-neutral-600" />
                <span>2. Live Markdown Output</span>
              </h2>
              
              <button
                onClick={handleCopyMarkdown}
                className="btn btn-sm flex items-center gap-1 cursor-pointer hover:bg-neutral-50"
                title="Copy markdown to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-green-600 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Markdown</span>
                  </>
                )}
              </button>
            </div>
            
            <div className="p-4 bg-slate-950">
              <textarea
                value={markdown}
                readOnly
                className="code-output font-mono text-xs w-full text-slate-100 bg-transparent border-none resize-none h-[220px] focus:outline-none"
                placeholder="No markdown generated yet..."
              />
            </div>
            <div className="px-4 py-2 border-t border-neutral-800 bg-slate-900 text-[10px] text-neutral-400 font-mono">
              Plaintext representation stored in localStorage and ready for API submission.
            </div>
          </section>

          {/* Section 3: Rendered Preview Card */}
          <section className="demo-card flex-1">
            <div className="card-header border-b border-neutral-100 bg-white px-5 py-3">
              <h2 className="card-title text-neutral-800">
                <Eye className="w-5 h-5 text-blue-600" />
                <span>3. Live Rendered Preview</span>
              </h2>
              <span className="badge badge-success">
                Preview Mode
              </span>
            </div>
            
            <div className="card-body bg-white overflow-y-auto max-h-[320px] p-6">
              {markdown ? (
                <MarkdownPreview markdown={markdown} />
              ) : (
                <p className="text-neutral-400 italic text-center py-12">
                  Write something in the editor to see it rendered here.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* User Guide Card */}
      <section className="demo-card mb-12 bg-white border border-neutral-200">
        <div className="card-header bg-neutral-50/50 border-b border-neutral-100 px-5 py-3">
          <h2 className="card-title text-neutral-800 flex items-center gap-2 text-sm font-semibold">
            <Keyboard className="w-4 h-4 text-neutral-600" />
            <span>Keyboard Shortcuts & Slash Commands Cheat Sheet</span>
          </h2>
        </div>
        <div className="card-body p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-neutral-600">
            <div>
              <h3 className="font-semibold text-neutral-800 mb-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Slash Commands
              </h3>
              <p className="text-xs text-neutral-500 mb-3">
                Type <kbd className="px-1 py-0.5 bg-neutral-100 border border-neutral-200 rounded font-mono text-[11px]">/</kbd> on a new line to transform blocks:
              </p>
              <ul className="space-y-1.5 text-xs font-mono">
                <li><strong className="text-neutral-700">/text</strong> or <strong className="text-neutral-700">/p</strong> - Convert to Normal Text</li>
                <li><strong className="text-neutral-700">/h1</strong>, <strong className="text-neutral-700">/h2</strong>, <strong className="text-neutral-700">/h3</strong> - Headings</li>
                <li><strong className="text-neutral-700">/bullet</strong> - Unordered Bullet List</li>
                <li><strong className="text-neutral-700">/number</strong> - Sequential Numbered List</li>
                <li><strong className="text-neutral-700">/todo</strong> - Checklist Task</li>
                <li><strong className="text-neutral-700">/quote</strong> - Blockquote block</li>
                <li><strong className="text-neutral-700">/code</strong> - Code Block Editor</li>
                <li><strong className="text-neutral-700">/divider</strong> - Horizontal separator line</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-neutral-800 mb-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Key Bindings
              </h3>
              <p className="text-xs text-neutral-500 mb-3">
                Edit naturally with simple, robust keyboard interactions:
              </p>
              <ul className="space-y-1.5 text-xs">
                <li>
                  <kbd className="px-1 py-0.5 bg-neutral-100 border border-neutral-200 rounded font-mono text-[11px]">Enter</kbd>: Creates a new block below (inherits list styling automatically!).
                </li>
                <li>
                  <kbd className="px-1 py-0.5 bg-neutral-100 border border-neutral-200 rounded font-mono text-[11px]">Backspace</kbd>: At the start of a block, removes formatting first, then deletes/merges with the previous block.
                </li>
                <li>
                  <kbd className="px-1 py-0.5 bg-neutral-100 border border-neutral-200 rounded font-mono text-[11px]">↑</kbd> / <kbd className="px-1 py-0.5 bg-neutral-100 border border-neutral-200 rounded font-mono text-[11px]">↓</kbd>: Seamlessly navigates focus between blocks.
                </li>
                <li>
                  <kbd className="px-1 py-0.5 bg-neutral-100 border border-neutral-200 rounded font-mono text-[11px]">Tab</kbd> / <kbd className="px-1 py-0.5 bg-neutral-100 border border-neutral-200 rounded font-mono text-[11px]">Shift+Tab</kbd>: Quick indents/outdents lists or cycles formats.
                </li>
                <li>
                  <kbd className="px-1 py-0.5 bg-neutral-100 border border-neutral-200 rounded font-mono text-[11px]">Ctrl/Cmd+Enter</kbd>: Triggers visual "Saved locally" confirmation.
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-neutral-800 mb-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                Markdown Formatting
              </h3>
              <p className="text-xs text-neutral-500 mb-3">
                Use standard inline markdown triggers in your text blocks:
              </p>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center justify-between">
                  <span>Bold text</span>
                  <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded font-mono text-[11px]">**bold**</kbd>
                </li>
                <li className="flex items-center justify-between">
                  <span>Italic text</span>
                  <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded font-mono text-[11px]">*italic*</kbd>
                </li>
                <li className="flex items-center justify-between">
                  <span>Inline code snippet</span>
                  <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded font-mono text-[11px]">`const x = 5`</kbd>
                </li>
                <li className="flex items-center justify-between">
                  <span>Quotes and checklists</span>
                  <span className="text-neutral-400 font-mono">{`> Quote`}</span> or <span className="text-neutral-400 font-mono">{`- [ ] Task`}</span>
                </li>
              </ul>
              <div className="mt-3 p-2.5 bg-blue-50/50 border border-blue-100 rounded-lg text-[11px] text-blue-800 flex gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                <span>Pasting plain Markdown structures (like todo lists, code snippets, or headers) is fully supported and parses into beautiful blocks instantly!</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Reusable Field Examples */}
      <section className="fields-section">
        <div className="border-b border-neutral-200 pb-3 mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-neutral-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-neutral-600" />
              <span>4. Reusable Field Examples</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Proof of versatility: these three cards render independent instances of the exact same
              <code className="mx-1 px-1 py-0.5 bg-neutral-100 rounded text-red-600 font-mono text-[11px]">BlockMarkdownEditor</code>
              component. Each manages its own localStorage key and form constraints.
            </p>
          </div>
        </div>

        <div className="fields-grid">
          {/* Example A: Daily Scratchpad (Full Mode) */}
          <div className="bg-white p-5 border border-neutral-200 rounded-xl shadow-sm flex flex-col justify-between">
            <DemoField
              label="Daily Scratchpad"
              description="A full-mode field for capturing random ideas and thoughts throughout the day."
              initialValue={`# Morning Thoughts

- [x] Walk the dog
- [ ] Brainstorm the block editor API

I should keep this highly focused and simple.`}
              mode="full"
              storageKey="scratchpad"
            />
          </div>

          {/* Example B: Project Notes (Full Mode) */}
          <div className="bg-white p-5 border border-neutral-200 rounded-xl shadow-sm flex flex-col justify-between">
            <DemoField
              label="Project Notes"
              description="A full-mode notes workspace for tracking milestone items and codebase structure."
              initialValue={`## Milestone 1: Core Parsing

We completed the block parser and verified it emits standard Markdown.

> "Simple is better than complex."

\`\`\`ts
interface EditorBlock {
  id: string;
  type: BlockType;
}
\`\`\``}
              mode="full"
              storageKey="project_notes"
            />
          </div>

          {/* Example C: Meeting Notes (Compact Mode) */}
          <div className="bg-white p-5 border border-neutral-200 rounded-xl shadow-sm flex flex-col justify-between">
            <DemoField
              label="Meeting Notes"
              description="A compact-mode field with tighter spacing and smaller headings, ideal for fast sidebars."
              initialValue={`### Sync Meeting - March 15

- Discussed block editor layout
- Decided on block-per-input approach for stability
- Action: Write the comprehensive test suite`}
              mode="compact"
              storageKey="meeting_notes"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 text-center text-xs text-neutral-400 border-t border-neutral-200 pt-8 pb-12">
        <p className="font-medium text-neutral-500 mb-1">
          Block Markdown Editor Demo • Built with React, TypeScript, and Tailwind CSS.
        </p>
        <p>
          No backend, no database, no complex rich text frameworks. Just clean code and standard Markdown.
        </p>
      </footer>
    </div>
  );
}

export default App;
