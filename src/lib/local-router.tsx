"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface LocalWorkspaceLocation {
  pathname: string;
  search: string;
}

interface LocalRouterApi {
  location: LocalWorkspaceLocation;
  push: (href: string) => void;
  replace: (href: string) => void;
  back: () => void;
  forward: () => void;
}

const LocalRouterContext = createContext<LocalRouterApi | null>(null);

const PATH_ALIASES: Record<string, string> = {
  "/today": "/dashboard",
  "/this-week": "/dashboard",
  "/deadlines": "/dates"
};

function normalizePathname(pathname: string) {
  const withoutTrailingSlash = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return PATH_ALIASES[withoutTrailingSlash] ?? withoutTrailingSlash;
}

function normalizedLocation(pathname: string, search = ""): LocalWorkspaceLocation {
  return {
    pathname: normalizePathname(pathname || "/dashboard"),
    search: search && !search.startsWith("?") ? `?${search}` : search
  };
}

function locationFromWindow() {
  return normalizedLocation(window.location.pathname, window.location.search);
}

function normalizeHref(href: string) {
  const url = new URL(href, window.location.origin);
  if (url.origin !== window.location.origin) {
    throw new Error("Local workspace navigation only supports same-origin URLs.");
  }
  const location = normalizedLocation(url.pathname, url.search);
  return { ...location, href: `${location.pathname}${location.search}${url.hash}` };
}

export function isCoreWorkspacePath(pathname: string) {
  const normalized = normalizePathname(pathname);
  return (
    normalized === "/dashboard" ||
    normalized === "/inbox" ||
    normalized === "/projects" ||
    normalized.startsWith("/projects/") ||
    normalized === "/dates" ||
    normalized === "/areas" ||
    normalized === "/resources" ||
    normalized === "/search" ||
    normalized === "/archive" ||
    normalized === "/reviews" ||
    normalized === "/settings"
  );
}

export function LocalRouterProvider({ initialPathname, children }: { initialPathname: string; children: ReactNode }) {
  const [location, setLocation] = useState<LocalWorkspaceLocation>(() => normalizedLocation(initialPathname));

  useEffect(() => {
    const syncFromBrowser = () => {
      const next = locationFromWindow();
      setLocation(next);

      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const canonical = `${next.pathname}${next.search}${window.location.hash}`;
      if (current !== canonical) window.history.replaceState(window.history.state, "", canonical);
    };

    syncFromBrowser();
    window.addEventListener("popstate", syncFromBrowser);
    return () => window.removeEventListener("popstate", syncFromBrowser);
  }, []);

  const navigate = useCallback((href: string, replace: boolean) => {
    const next = normalizeHref(href);
    if (!isCoreWorkspacePath(next.pathname)) {
      if (replace) window.location.replace(next.href);
      else window.location.assign(next.href);
      return;
    }

    if (replace) window.history.replaceState(window.history.state, "", next.href);
    else window.history.pushState({}, "", next.href);
    setLocation({ pathname: next.pathname, search: next.search });
  }, []);

  const api = useMemo<LocalRouterApi>(
    () => ({
      location,
      push: (href) => navigate(href, false),
      replace: (href) => navigate(href, true),
      back: () => window.history.back(),
      forward: () => window.history.forward()
    }),
    [location, navigate]
  );

  return <LocalRouterContext.Provider value={api}>{children}</LocalRouterContext.Provider>;
}

export function useLocalRouter() {
  const router = useContext(LocalRouterContext);
  if (!router) throw new Error("useLocalRouter must be used inside LocalRouterProvider");
  return router;
}

export function useLocalLocation() {
  return useLocalRouter().location;
}
