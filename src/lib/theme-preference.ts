"use client";

import { useCallback, useEffect, useState } from "react";

export type ContextOsTheme = "light" | "dark";

const STORAGE_KEY = "contextos-theme";
const EVENT_NAME = "contextos-theme-change";

function preferredTheme(): ContextOsTheme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: ContextOsTheme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  window.localStorage.setItem(STORAGE_KEY, theme);
}

export function useContextOsTheme() {
  const [theme, setThemeState] = useState<ContextOsTheme | null>(null);

  useEffect(() => {
    const initial = preferredTheme();
    applyTheme(initial);
    setThemeState(initial);

    const onThemeChange = (event: Event) => {
      const next = (event as CustomEvent<ContextOsTheme>).detail;
      if (next === "light" || next === "dark") setThemeState(next);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const next = event.newValue;
      if (next === "light" || next === "dark") {
        applyTheme(next);
        setThemeState(next);
      }
    };

    window.addEventListener(EVENT_NAME, onThemeChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, onThemeChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setTheme = useCallback((next: ContextOsTheme) => {
    applyTheme(next);
    setThemeState(next);
    window.dispatchEvent(new CustomEvent<ContextOsTheme>(EVENT_NAME, { detail: next }));
  }, []);

  return {
    theme,
    isDark: theme === "dark",
    setTheme
  };
}
