import React, { useState } from "react";
import { BlockMarkdownEditor } from "./BlockMarkdownEditor";
import { loadFromStorage, saveToStorage } from "../lib/storage";
import { RotateCcw, FileText } from "lucide-react";

interface DemoFieldProps {
  label: string;
  description: string;
  initialValue: string;
  mode?: "full" | "compact";
  storageKey: string;
}

export const DemoField: React.FC<DemoFieldProps> = ({
  label,
  description,
  initialValue,
  mode = "full",
  storageKey,
}) => {
  const [value, setValue] = useState<string>(() =>
    loadFromStorage(storageKey, initialValue)
  );

  const handleChange = (newValue: string) => {
    setValue(newValue);
    saveToStorage(storageKey, newValue);
  };

  const handleReset = () => {
    if (window.confirm(`Are you sure you want to reset the "${label}" field?`)) {
      setValue(initialValue);
      saveToStorage(storageKey, initialValue);
    }
  };

  // Calculate some simple statistics
  const blockCount = value ? value.split(/\n\n+/).filter(Boolean).length : 0;
  const wordCount = value ? value.split(/\s+/).filter(Boolean).length : 0;
  const charCount = value ? value.length : 0;

  return (
    <div className="field-wrapper">
      <div className="flex items-center justify-between">
        <label className="field-label flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-blue-500" />
          {label}
        </label>
        <button
          onClick={handleReset}
          className="text-xs text-neutral-400 hover:text-red-500 flex items-center gap-1 transition-colors cursor-pointer"
          title={`Reset ${label}`}
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>
      <span className="field-desc">{description}</span>
      
      <div className="field-container shadow-sm">
        <BlockMarkdownEditor
          value={value}
          onChange={handleChange}
          mode={mode}
          minLines={mode === "compact" ? 3 : 5}
          placeholder={`Write something for ${label.toLowerCase()}...`}
          autosaveLabel="Autosaved to draft"
        />
      </div>

      <div className="flex justify-between items-center text-[10px] text-neutral-400 px-1">
        <span>Mode: <strong className="capitalize">{mode}</strong></span>
        <span className="flex gap-2">
          <span>{blockCount} blocks</span>
          <span>•</span>
          <span>{wordCount} words</span>
          <span>•</span>
          <span>{charCount} chars</span>
        </span>
      </div>
    </div>
  );
};
