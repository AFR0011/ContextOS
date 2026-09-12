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
import { AreaRequiredView, AreasSetupView, FirstRunSetup } from "@/components/workspace/FirstRunSetup";
import { ResourcesLifecycleView } from "@/components/workspace/ResourcesLifecycleView";
import { useWorkspace } from "@/lib/client-store";
import { useLocalLocation } from "@/lib/local-router";

function projectIdFromPath(pathname: string) {
  const match = pathname.match(/^\/projects\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function isWorkspaceProductRoute(pathname: string) {
  return [
    "/dashboard",
    "/inbox",
    "/projects",
    "/dates",
    "/areas",
    "/resources",
    "/search",
    "/archive",
    "/reviews",
    "/settings"
  ].includes(pathname) || Boolean(projectIdFromPath(pathname));
}

export default function LocalWorkspaceRouter({ fallback }: { fallback?: ReactNode }) {
  const { pathname } = useLocalLocation();
  const { data } = useWorkspace();
  const activeDomainCount = data.domains.filter((domain) => !domain.archived).length;

  if (data.domains.length === 0 && isWorkspaceProductRoute(pathname)) {
    return <FirstRunSetup />;
  }

  if (pathname === "/dashboard") return <DashboardView />;
  if (pathname === "/inbox") return <InboxView />;
  if (pathname === "/projects") return activeDomainCount ? <ProjectsLifecycleView /> : <AreaRequiredView target="projects" />;

  const projectId = projectIdFromPath(pathname);
  if (projectId) return <ProjectDetailLifecycleView projectId={projectId} />;

  if (pathname === "/dates") return <DatesView />;
  if (pathname === "/areas") return <AreasSetupView><AreasView /></AreasSetupView>;
  if (pathname === "/resources") return activeDomainCount ? <ResourcesLifecycleView /> : <AreaRequiredView target="resources" />;
  if (pathname === "/search") return <SearchView />;
  if (pathname === "/archive") return <ArchiveLifecycleView />;
  if (pathname === "/reviews") return <ReviewsLifecycleView />;
  if (pathname === "/settings") return <SettingsView />;

  return <>{fallback ?? <DashboardView />}</>;
}
