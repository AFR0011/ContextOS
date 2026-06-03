# ContextOS Run Protocol

## Local Setup
1. Copy `.env.example` to `.env` if `.env` does not exist.
2. Start PostgreSQL:
   ```bash
   docker compose up -d
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Generate Prisma Client and migrate:
   ```bash
   npx prisma generate
   npm run db:migrate
   ```
5. Seed the demo account:
   ```bash
   npm run db:seed
   ```
6. Start the app:
   ```bash
   npm run dev
   ```

## Demo Login
- Email: `demo@contextos.local`
- Password: `contextos-demo-v011`

## Verification Ladder
1. Typecheck:
   ```bash
   npm run typecheck
   ```
2. Build:
   ```bash
   npm run build
   ```
3. Database migration and seed:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
4. Browser smoke tests:
   ```bash
   npm run test:e2e
   ```
5. Manual checks:
   - Log in with the demo account.
   - Add a quick capture.
   - Convert an inbox capture to a task.
   - Edit a project next action and latest status.
   - Go offline, add a capture, reload a visited route, return online, and confirm pending sync clears.

## Notes
- `.env` is ignored and may contain local-only demo values.
- `.env.example` is the only env file intended to be committed.
- `npm run db:seed` resets the seeded demo workspace. Do not run it during normal production deploys.
- `/api/reset-demo` is disabled in production unless `ALLOW_DEMO_RESET=true` is explicitly set.
- Do not use `npm audit fix --force` blindly; review major dependency changes first.
