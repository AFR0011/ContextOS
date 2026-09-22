"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex=\"-1\"])"
].join(",");

function focusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true"
  );
}

export function useDialogFocusTrap({
  open,
  onClose,
  closeOnEscape = true
}: {
  open: boolean;
  onClose: () => void;
  closeOnEscape?: boolean;
}) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);
  onCloseRef.current = onClose;
  closeOnEscapeRef.current = closeOnEscape;

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;

    const focusInside = () => {
      if (!dialog) return;
      const current = document.activeElement;
      if (current instanceof Node && dialog.contains(current)) return;
      focusableElements(dialog)[0]?.focus();
    };

    const frame = window.requestAnimationFrame(focusInside);

    const onKeyDown = (event: KeyboardEvent) => {
      if (!dialog) return;

      if (event.key === "Escape" && closeOnEscapeRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const focusables = focusableElements(dialog);
      if (!focusables.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (!(active instanceof Node) || !dialog.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [open]);

  return dialogRef;
}
