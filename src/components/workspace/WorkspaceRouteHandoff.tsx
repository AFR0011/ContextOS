/**
 * Next.js workspace page files are structural entrypoints only.
 *
 * Once WorkspaceGate verifies the active/local identity, LocalWorkspaceRouter
 * owns product route resolution, first-run gating, and lifecycle wrappers.
 * Keeping intercepted page children inert prevents a second, stale UI tree from
 * becoming an accidental source of truth.
 */
export default function WorkspaceRouteHandoff() {
  return null;
}
