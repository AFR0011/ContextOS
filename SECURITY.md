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

The publication branch is pinned to stable Next.js 16.2.12 and Prisma 7.9.1. `npm audit --omit=dev` currently reports three high-severity transitive advisories from packages bundled through stable Next.js (`postcss` and `sharp`). npm's available automated remediation moves Next.js to the 16.3 line rather than another stable 16.2 patch.

CI therefore:

- prints the full production dependency audit on every run;
- fails on any critical production advisory;
- keeps the known upstream high advisories visible rather than suppressing or silently force-upgrading the framework.

These advisories should be re-evaluated when a stable Next.js release containing the fixed dependency versions is available. This is one reason ContextOS is described as portfolio-stage rather than production-hardened software.

## Known boundaries

The project does not currently provide:

- email verification;
- self-service password reset;
- OAuth/SSO as a supported production feature;
- enterprise audit/compliance guarantees;
- provider-level WAF or bot protection;
- a formal third-party penetration test.

These are deployment/product boundaries, not claims of security completeness.
