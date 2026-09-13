// Canonical production export surface for workspace views.
//
// The implementation currently lives in LegacyWorkspaceViews.tsx while the
// remaining legacy-only views are disentangled. Product code should import
// from this module, not from the legacy implementation file directly.
export {
  AreasView,
  DatesView,
  ProjectDetailView,
  ProjectsView,
  ReviewsView
} from "@/components/workspace/LegacyWorkspaceViews";
