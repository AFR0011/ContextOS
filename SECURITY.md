# Security Policy

## Supported scope

Security fixes are accepted for the current `main` branch and the latest tagged release, when tags are available.

ContextOS is a portfolio-stage application. It should not be treated as a production identity, secrets, or high-sensitivity data platform without an independent deployment/security review.

## Reporting a vulnerability

Please do not open a public issue for a vulnerability that could expose authentication state, user data, secrets, or destructive actions.

Instead, contact the maintainer privately through the contact information on the maintainer's GitHub profile. Include:

- the affected route/component;
- steps to reproduce;
- expected and actual behavior;
- likely impact;
- a minimal proof of concept when useful.

Avoid accessing data that is not yours and avoid destructive testing.

## Security assumptions

The application currently assumes:

- HTTPS termination in deployed environments;
- a unique, strong `AUTH_SECRET` per deployment;
- PostgreSQL credentials supplied through environment configuration;
- public registration disabled unless deliberately enabled;
- demo-reset functionality disabled in production unless deliberately enabled;
- server-side authorization for user-owned records and sync mutations.

The application includes local authentication, HTTP-only sessions, user-scoped persistence, basic auth abuse throttling, baseline response security headers, bounded sync payload handling, and ownership checks during synchronization.

## Dependency audit status

ContextOS is pinned to stable Next.js 16.2.12 and Prisma 7.9.1. The lockfile uses explicit patched transitive overrides for `esbuild` 0.28.1, `nanoid` 6.0.0, `postcss` 8.5.23, and `sharp` 0.35.3 while remaining on the stable Next.js 16.2 line.

The verified dependency graph reports **0 npm audit vulnerabilities**. Permanent CI runs `npm audit --audit-level=low`, so any future advisory at low severity or above fails the verification job rather than being silently accepted.

The dependency graph is still subject to normal upstream maintenance. Security updates should be reviewed as dependencies publish new stable releases, and overrides should be removed when the direct dependency graph no longer needs them.

## Known boundaries

The project does not currently provide:

- email verification;
- self-service password reset;
- OAuth/SSO as a supported production feature;
- enterprise audit/compliance guarantees;
- provider-level WAF or bot protection;
- a formal third-party penetration test.

These are deployment/product boundaries, not claims of security completeness.
