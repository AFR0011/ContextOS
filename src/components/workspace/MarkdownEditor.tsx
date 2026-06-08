"use client";

import type { ReactNode } from "react";
import { BlockMarkdownEditor } from "@/components/workspace/editor/BlockMarkdownEditor";

interface MarkdownEditorProps {
  value: string;
  placeholder: string;
  className?: string;
  dataTestId?: string;
  footer?: ReactNode;
  hideSaveButton?: boolean;
  minLines?: number;
  onChange?: (value: string) => void;
  onSave?: (value: string) => void;
  onCaptureLine?: (line: string) => void;
  disabled?: boolean;
  mode?: "full" | "compact";
}

export function MarkdownEditor({
  value,
  placeholder,
  className,
  dataTestId,
  footer,
  hideSaveButton,
  minLines,
  onChange,
  onSave,
  onCaptureLine,
  disabled,
  mode
}: MarkdownEditorProps) {
  return (
    <BlockMarkdownEditor
      value={value}
      placeholder={placeholder}
      className={className}
      dataTestId={dataTestId}
      footer={footer}
      hideSaveButton={hideSaveButton}
      minLines={minLines}
      onChange={onChange}
      onSave={onSave}
      onCaptureLine={onCaptureLine}
      disabled={disabled}
      mode={mode}
    />
  );
}
