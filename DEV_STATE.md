# ContextOS Dev State

## Active Loop

- Status: QA complete
- Date: 2026-06-04
- Active batch: DESIGN.md visual design-system alignment pass
- Source request: user request to apply `DESIGN.md` without changing functionality
- Canonical product source: `BLUEPRINT.md`
- Design source: `DESIGN.md`
- Baseline docs: `docs/PROJECT_STATE.md`, `docs/REPO_MAP.md`, `docs/RUN_PROTOCOL.md`

## Selected Batch

Apply the visual direction from `DESIGN.md` across the existing app with the smallest coherent set of visual-only changes:

1. Refine global ContextOS design tokens for background, text, borders, accent, status colors, focus rings, radius, and shadows.
2. Update shared component styling for buttons, inputs, textareas, badges, cards, panels, list rows, empty states, and markdown/editor surfaces.
3. Align app shell, navigation, auth pages, dashboard command sheet, and existing route surfaces to the same calm operational visual system.
4. Keep all routes, data flow, persistence, auth, API logic, sync semantics, Prisma models, migrations, and feature behavior unchanged.
5. Update e2e selectors/harness only where the visual pass exposed duplicated visible text or the documented local-dev offline reload boundary.

## Intended Files

- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/components/AuthForm.tsx`
- `src/components/workspace/WorkspaceShell.tsx`
- `src/components/workspace/Dashboard2.tsx`
- `src/components/workspace/MarkdownEditor.tsx`
- `src/components/workspace/Views.tsx`
- `tests/e2e/contextos.spec.ts`
- `DEV_LOG.md`
- `QA_REPORT.md`
- `RISK_REGISTER.md`
- `docs/PROJECT_STATE.md`
- `docs/VERSION_LOG.md`
- `shared/errors.md`

## Acceptance Criteria

- The app visually reflects `DESIGN.md`: Linear-inspired precision and density, Notion-like workspace calm, Cal.com-like date clarity, Raycast-like search sharpness, and Claude-like warmth where review/reflection surfaces already exist.
- Shared tokens/components carry the update across Dashboard, Inbox, Today, This Week, Projects, Project Detail, Tasks/Deadlines, Reviews, Search, Archive, Settings, and Auth pages.
- Mobile views remain readable, navigable, and free from horizontal overflow.
- Card/panel radius stays sharp at 8px or less; pills may remain rounded.
- No functionality, data model, routing, API, auth, offline sync, or business semantics are intentionally changed.
- `npm run typecheck`, `npm run build`, and `npm run test:e2e` pass.

## Verification Plan

1. `npx prisma generate` if generated Prisma client types are stale.
2. `npm run db:migrate`
3. `npm run db:seed`
4. `npm run typecheck`
5. `npm run build`
6. `npm run test:e2e`
7. Manual/browser smoke on desktop and mobile, including login/dashboard rendering, route navigation, mobile drawer navigation, and overflow checks.

## Risk And Mitigation

- Risk: Broad visual changes could accidentally alter product behavior. Mitigation: limited edits to CSS, class names, presentation copy, visual metadata, and test selector/harness stability.
- Risk: Dense operational styling could become too rounded or decorative. Mitigation: final radius audit capped shared card/panel radii at 8px and removed `rounded-xl`/`rounded-2xl` card remnants.
- Risk: Duplicate visible text in denser dashboard rows could break broad e2e text locators. Mitigation: scoped affected assertions to their intended sections/controls.
- Risk: Local dev offline reload can fail to hydrate even when IndexedDB/outbox are durable. Mitigation: warmed the service-worker shell before the offline reload e2e assertion, matching the repo's documented offline verification boundary.

## Next Action

Stop after this supervised cycle and report the completed visual alignment pass. Next product action remains the v0.1.x real usage trial with friction logging.
