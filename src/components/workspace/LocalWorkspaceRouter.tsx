"use client";

import type { ReactNode } from "react";
import {
  AreasView,
  DashboardView,
  DatesView,
  InboxView,
  SearchView,
  SettingsView
} from "@/components/workspace/Views";
import {
  ProjectDetailLifecycleView,
  ProjectsLifecycleView,
  ReviewsLifecycleView
} from "@/components/workspace/Batch2LifecycleViews";
import { ArchiveLifecycleView } from "@/components/workspace/ArchiveLifecycleView";
import { ResourcesLifecycleView } from "@/components/workspace/ResourcesLifecycleView";
import { useLocalLocation } from "@/lib/local-router";

function projectIdFromPath(pathname: string) {
  const match = pathname.match(/^\/projects\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function LocalWorkspaceRouter({ fallback }: { fallback?: ReactNode }) {
  const { pathname } = useLocalLocation();

  if (pathname === "/dashboard") return <DashboardView />;
  if (pathname === "/inbox") return <InboxView />;
  if (pathname === "/projects") return <ProjectsLifecycleView />;

  const projectId = projectIdFromPath(pathname);
  if (projectId) return <ProjectDetailLifecycleView projectId={projectId} />;

  if (pathname === "/dates") return <DatesView />;
  if (pathname === "/areas") return <AreasView />;
  if (pathname === "/resources") return <ResourcesLifecycleView />;
  if (pathname === "/search") return <SearchView />;
  if (pathname === "/archive") return <ArchiveLifecycleView />;
  if (pathname === "/reviews") return <ReviewsLifecycleView />;
  if (pathname === "/settings") return <SettingsView />;

  return <>{fallback ?? <DashboardView />}</>;
}
