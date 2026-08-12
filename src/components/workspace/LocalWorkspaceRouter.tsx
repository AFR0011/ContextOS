"use client";

import type { ReactNode } from "react";
import {
  ArchiveView,
  AreasView,
  DashboardView,
  DatesView,
  InboxView,
  ProjectDetailView,
  ProjectsView,
  ResourcesView,
  ReviewsView,
  SearchView,
  SettingsView
} from "@/components/workspace/Views";
import { useLocalLocation } from "@/lib/local-router";

function projectIdFromPath(pathname: string) {
  const match = pathname.match(/^\/projects\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function LocalWorkspaceRouter({ fallback }: { fallback?: ReactNode }) {
  const { pathname } = useLocalLocation();

  if (pathname === "/dashboard") return <DashboardView />;
  if (pathname === "/inbox") return <InboxView />;
  if (pathname === "/projects") return <ProjectsView />;

  const projectId = projectIdFromPath(pathname);
  if (projectId) return <ProjectDetailView projectId={projectId} />;

  if (pathname === "/dates") return <DatesView />;
  if (pathname === "/areas") return <AreasView />;
  if (pathname === "/resources") return <ResourcesView />;
  if (pathname === "/search") return <SearchView />;
  if (pathname === "/archive") return <ArchiveView />;
  if (pathname === "/reviews") return <ReviewsView />;
  if (pathname === "/settings") return <SettingsView />;

  return <>{fallback ?? <DashboardView />}</>;
}
