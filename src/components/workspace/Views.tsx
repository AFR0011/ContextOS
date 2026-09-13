// Canonical production export surface for workspace views.
//
// Product code should import from this module. Areas, Dates, Reviews, and
// Projects now live in focused modules; Project Detail remains temporarily
// quarantined in LegacyWorkspaceViews while its coupled helpers are split.
export { AreasView } from "@/components/workspace/AreasView";
export { DatesView } from "@/components/workspace/DatesView";
export { ProjectsView } from "@/components/workspace/ProjectsView";
export { ReviewsView } from "@/components/workspace/ReviewsView";
export { ProjectDetailView } from "@/components/workspace/LegacyWorkspaceViews";
