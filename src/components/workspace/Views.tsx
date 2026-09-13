// Canonical production export surface for workspace views.
//
// Product code should import from this module. Areas, Dates, and Reviews now
// live in focused modules; Projects and Project Detail remain temporarily
// quarantined in LegacyWorkspaceViews while their shared helpers are split.
export { AreasView } from "@/components/workspace/AreasView";
export { DatesView } from "@/components/workspace/DatesView";
export { ReviewsView } from "@/components/workspace/ReviewsView";
export {
  ProjectDetailView,
  ProjectsView
} from "@/components/workspace/LegacyWorkspaceViews";
