"use client";

import type { ReactNode } from "react";
import type { CaptureCommand, CaptureLineResult } from "@/components/workspace/editor/editorTypes";
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
  allowedCaptureCommands?: CaptureCommand[];
  onCaptureLine?: (line: string) => CaptureLineResult | void;
  disabled?: boolean;
  mode?: "full" | "compact" | "page";
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
  allowedCaptureCommands,
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
      allowedCaptureCommands={allowedCaptureCommands}
      onCaptureLine={onCaptureLine}
      disabled={disabled}
      mode={mode}
    />
  );
}
