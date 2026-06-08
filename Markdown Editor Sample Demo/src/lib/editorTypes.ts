export type BlockType =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bullet"
  | "numbered"
  | "todo"
  | "quote"
  | "code"
  | "divider";

export interface EditorBlock {
  id: string;
  type: BlockType;
  text: string;
  checked?: boolean;
  language?: string;
}

export interface BlockMarkdownEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  mode?: "full" | "compact";
  minLines?: number;
  className?: string;
  dataTestId?: string;
  disabled?: boolean;
  autosaveLabel?: string;
}
