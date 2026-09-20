"use client";

import type { ReactNode } from "react";
import {
  AreasView,
  DatesView
} from "@/components/workspace/Views";
import {
  ProjectDetailLifecycleView,
  ProjectsLifecycleView,
  ReviewsLifecycleView
} from "@/components/workspace/Batch2LifecycleViews";
import { ArchiveLifecycleView } from "@/components/workspace/ArchiveLifecycleView";
import { AreaRequiredView, AreasSetupView, FirstRunSetup } from "@/components/workspace/FirstRunSetup";
import { ProductInboxView } from "@/components/workspace/ProductInboxView";
import { LifeOSFoundationView } from "@/components/workspace/LifeOSFoundationView";
import { ProductSearchView } from "@/components/workspace/ProductSearchView";
import { ProductSettingsView } from "@/components/workspace/ProductSettingsView";
import { ResourcesLifecycleView } from "@/components/workspace/ResourcesLifecycleView";
import { ScopedDashboardView } from "@/components/workspace/ScopedDashboardView";
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
    "/lifeos",
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

  // Fresh accounts normally stay in first-run setup until an Area exists. Settings is
  // intentionally exempt so a returning user can restore a workspace backup without
  // creating disposable local structure first.
  if (data.domains.length === 0 && pathname !== "/settings" && isWorkspaceProductRoute(pathname)) {
    return <FirstRunSetup />;
  }

  if (pathname === "/dashboard") return <ScopedDashboardView />;
  if (pathname === "/inbox") return <ProductInboxView />;
  if (pathname === "/projects") return activeDomainCount ? <ProjectsLifecycleView /> : <AreaRequiredView target="projects" />;

  const projectId = projectIdFromPath(pathname);
  if (projectId) return <ProjectDetailLifecycleView projectId={projectId} />;

  if (pathname === "/dates") return <DatesView />;
  if (pathname === "/areas") return <AreasSetupView><AreasView /></AreasSetupView>;
  if (pathname === "/resources") return activeDomainCount ? <ResourcesLifecycleView /> : <AreaRequiredView target="resources" />;
  if (pathname === "/lifeos") return <LifeOSFoundationView />;
  if (pathname === "/search") return <ProductSearchView />;
  if (pathname === "/archive") return <ArchiveLifecycleView />;
  if (pathname === "/reviews") return <ReviewsLifecycleView />;
  if (pathname === "/settings") return <ProductSettingsView />;

  return <>{fallback ?? <ScopedDashboardView />}</>;
}
