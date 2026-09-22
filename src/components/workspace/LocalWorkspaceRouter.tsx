"use client";

import type { ReactNode } from "react";
import {
  AreaDetailView,
  AreasView,
  DatesView,
  ProjectDetailView,
  ProjectsView
} from "@/components/workspace/Views";
import { FirstRunSetup } from "@/components/workspace/FirstRunSetup";
import { LifeOSFoundationView } from "@/components/workspace/LifeOSFoundationView";
import { ProductSearchView } from "@/components/workspace/ProductSearchView";
import { ProductSettingsView } from "@/components/workspace/ProductSettingsView";
import { ScopedDashboardView } from "@/components/workspace/ScopedDashboardView";
import { useWorkspace } from "@/lib/client-store";
import { useLocalLocation } from "@/lib/local-router";

function projectIdFromPath(pathname: string) {
  const match = pathname.match(/^\/projects\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function areaIdFromPath(pathname: string) {
  const match = pathname.match(/^\/areas\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function isWorkspaceProductRoute(pathname: string) {
  return [
    "/dashboard",
    "/projects",
    "/dates",
    "/areas",
    "/lifeos",
    "/search",
    "/settings"
  ].includes(pathname) || Boolean(projectIdFromPath(pathname)) || Boolean(areaIdFromPath(pathname));
}

export default function LocalWorkspaceRouter({ fallback }: { fallback?: ReactNode }) {
  const { pathname } = useLocalLocation();
  const { data } = useWorkspace();

  if (data.areas.length === 0 && pathname !== "/settings" && isWorkspaceProductRoute(pathname)) {
    return <FirstRunSetup />;
  }

  if (pathname === "/dashboard") return <ScopedDashboardView />;
  if (pathname === "/projects") return <ProjectsView />;

  const projectId = projectIdFromPath(pathname);
  if (projectId) return <ProjectDetailView projectId={projectId} />;

  if (pathname === "/dates") return <DatesView />;
  if (pathname === "/areas") return <AreasView />;

  const areaId = areaIdFromPath(pathname);
  if (areaId) return <AreaDetailView areaId={areaId} />;

  if (pathname === "/lifeos") return <LifeOSFoundationView />;
  if (pathname === "/search") return <ProductSearchView />;
  if (pathname === "/settings") return <ProductSettingsView />;

  return <>{fallback ?? <ScopedDashboardView />}</>;
}
