# Stage 8.3 Verification

Stage 8.3 rehearsed an installed/service-worker client upgrade from the verified Stage 8.2 v3 shell to the verified v4 shell on the same temporary Vercel origin.

## Starting state

- v3 source deployment: `dpl_CtmpVcYphJ2NJq8TPzFh482ewrUY`
- v3 source commit: `4e5a07c3156a2499839bddbb900de83024b36cb5`
- The browser loaded the temporary rehearsal origin online, authenticated with the preview-only Stage 8 fixture, reached `Offline ready v3`, and retained that service-worker/cache state across a hard refresh.

## Upgrade target

- v4 candidate commit: `9f28510aab7ce75b383163d7b42ac5a3546f0247`
- v4 deployment: `dpl_EYSei9zP3HrQDhhvAHsjMwfRgUnE`
- CI run `31747167570` passed the full verification ladder, including production/offline Playwright, normal E2E, build, migrations, and database-outage smoke.

## Same-origin rehearsal result

The same temporary Vercel hostname was reassigned from the verified v3 deployment to the verified v4 deployment. Without clearing browser site data or unregistering the service worker, the browser then:

1. recognized and activated the v4 shell;
2. reported `Offline ready v4`;
3. preserved the locally cached Stage 8 workspace and project state;
4. contained `contextos-shell-v4` while the obsolete `contextos-shell-v3` cache was removed;
5. hard-refreshed Dashboard successfully with the network disabled; and
6. opened the Stage 8 project while still offline.

All checks passed.

## Verdict

Stage 8.3 passes. The installed client upgraded from v3 to v4 without shell stranding or loss of the existing local workspace state, and the upgraded v4 shell remained usable after an offline restart.
