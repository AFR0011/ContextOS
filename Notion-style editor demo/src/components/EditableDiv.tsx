import React, { useRef, useLayoutEffect, useCallback } from 'react';

interface EditableDivProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onBlur?: () => void;
  className?: string;
  placeholder?: string;
  innerRef?: (el: HTMLDivElement | null) => void;
}

/**
 * A controlled contentEditable div that never resets the cursor.
 *
 * KEY INSIGHT: We render NO children — an empty <div/>.  This means React's
 * reconciliation never touches the text content.  All DOM writes go through
 * refs + useLayoutEffect, so the browser caret is preserved during normal
 * typing / deleting.
 *
 * The DOM is only written to when the `value` prop diverges from the last
 * known user-typed text (i.e. an external change like merge, split, or
 * block-type conversion).
 */
export const EditableDiv: React.FC<EditableDivProps> = ({
  value,
  onChange,
  onKeyDown,
  onBlur,
  className,
  placeholder,
  innerRef,
}) => {
  const elRef = useRef<HTMLDivElement | null>(null);

  // Tracks the last text we know about — either from user input or from
  // an external prop write.  Compared against incoming `value` to decide
  // whether the DOM needs updating.
  const lastPushedRef = useRef<string>(value);

  // ── On mount: seed the DOM with the initial value ──
  // ── On update: write ONLY when value diverges from last user input ──
  useLayoutEffect(() => {
    const el = elRef.current;
    if (!el) return;

    // If value matches what we last recorded (user typed it, or we already
    // wrote it), the DOM is already correct — do nothing, cursor untouched.
    if (value === lastPushedRef.current) return;

    // External change detected → overwrite the DOM.
    el.textContent = value;
    lastPushedRef.current = value;
  }, [value]);

  // ── User typing: record + notify, but never write to DOM ──
  const handleInput = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      const text = e.currentTarget.textContent || '';
      lastPushedRef.current = text;   // ← prevents the effect from clobbering
      onChange(text);
    },
    [onChange],
  );

  // ── Ref plumbing ──
  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      elRef.current = el;
      // Seed the DOM text on first mount (layout effect may not have run yet
      // for the very first render when using callback refs).
      if (el && el.textContent !== value) {
        el.textContent = value;
        lastPushedRef.current = value;
      }
      innerRef?.(el);
    },
    // innerRef changes every render (inline closure in parent), but we still
    // need to forward it.  The ref-seeding guard (el.textContent !== value)
    // ensures we don't clobber on spurious re-calls.
    [innerRef, value],
  );

  // Render an EMPTY div — React will never touch the text content.
  return (
    <div
      ref={setRef}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      className={className}
      onInput={handleInput}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    />
  );
};
