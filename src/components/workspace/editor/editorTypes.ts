import type { ReactNode } from "react";

export type BlockType =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "toggleHeading1"
  | "toggleHeading2"
  | "toggleHeading3"
  | "bullet"
  | "numbered"
  | "todo"
  | "quote"
  | "code"
  | "divider";

export type CaptureCommand = "task" | "note" | "project" | "date" | "deadline" | "status";

export interface CaptureLineResult {
  ok: boolean;
  message?: string;
}

export interface EditorBlock {
  id: string;
  type: BlockType;
  text: string;
  checked?: boolean;
  language?: string;
  open?: boolean;
}

export interface BlockMarkdownEditorProps {
  value: string;
  onChange?: (markdown: string) => void;
  onSave?: (markdown: string) => void;
  placeholder?: string;
  mode?: "full" | "compact" | "page";
  minLines?: number;
  className?: string;
  dataTestId?: string;
  disabled?: boolean;
  autosave?: boolean;
  autosaveDelayMs?: number;
  hideSaveButton?: boolean;
  footer?: ReactNode;
  allowedCaptureCommands?: CaptureCommand[];
  onCaptureLine?: (line: string) => CaptureLineResult | void;
}
