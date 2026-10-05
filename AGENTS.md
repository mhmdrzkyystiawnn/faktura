# Faktura Project Context

## Project

Faktura is an Indonesian SaaS invoicing and payment-reminder application for freelancers and small businesses.

## Repository Map

- `apps/web/` — Next.js 16 App Router frontend using React 19, TypeScript, Tailwind CSS 4, shadcn-style local UI components, React Hook Form, Zod, and TanStack Query/Table.
- `apps/api/` — NestJS 11 TypeScript backend with Prisma/PostgreSQL, JWT/refresh-token authentication, Google OAuth, Argon2, and serverless deployment support.
- `docs/` — authoritative product, architecture, security, API, frontend, testing, and AI-assistant guidance.
- `apps/api/src/database/prisma/schema.prisma` — database schema; treat schema changes as deliberate and migration-backed.

## Commands

Run commands from the repository root with pnpm:

```bash
pnpm install
pnpm dev
pnpm --filter @faktura/web dev
pnpm --filter @faktura/web build
pnpm --filter @faktura/web lint
pnpm --filter @faktura/api dev
pnpm --filter @faktura/api build
pnpm --filter @faktura/api lint
pnpm --filter @faktura/api test
pnpm --filter @faktura/api test:e2e
```

The root `dev` script starts both applications. The API package owns the current test scripts; the web package currently exposes build, dev, start, and lint only.

## Required Context Before Changes

Read the relevant sections before editing:

- `docs/ai-rules.md` — mandatory security-first AI rules and decision-log governance.
- `docs/architecture.md` — system boundaries, backend modules, security, deployment, and environment rules.
- `docs/api-guideline.md` — REST paths, response envelopes, status codes, and field formats.
- `docs/frontend-guideline.md` — design tokens, UI patterns, accessibility, SEO, and performance requirements.
- `docs/testing-guideline.md` — required coverage for money, auth, webhooks, reminders, and SEO.
- `apps/web/CLAUDE.md` — generated Next.js 16 guidance; consult the matching guide in `apps/web/node_modules/next/dist/docs/` before changing Next.js behavior.
- `apps/web/AGENTS.md` — generated Next.js agent guidance; do not remove its generated block.

Use the nearest existing implementation as the pattern. Before editing a file, read it and its related tests/types. Keep task context focused rather than loading the whole repository.

## Conventions and Boundaries

- Prefer the existing package scripts, helpers, UI components, and module boundaries; do not add dependencies for small utilities without justification.
- Backend code is organized by business module under `apps/api/src/modules`; controllers validate DTOs, services own business logic, and cross-module database access goes through exported service methods.
- Use `camelCase` JSON fields and `/api/v1/...` plural resource paths. Follow the documented `{ data }`, `{ data, meta }`, and `{ error }` response envelopes.
- Protect new endpoints by default with validation, authorization, ownership checks, and appropriate rate limiting. Internal cron endpoints use the documented shared-secret guard instead of user JWT auth.
- Use precise decimal handling for money and parameterized Prisma queries. Never expose secrets, tokens, stack traces, SQL, or internal paths.
- Public frontend pages require metadata, semantic headings, accessible images, and sitemap coverage. Authenticated, personal, and public-invoice pages must be `noindex, nofollow`.
- Never commit `.env` files, real credentials, production data, or generated build output. Do not modify database schema or approved decision logs without explicit user approval.
- Preserve generated Next.js rule blocks and existing uncommitted user changes.

## Decision and Ambiguity Handling

When requirements conflict with existing documentation or code, surface the conflict before choosing. When a security, data-integrity, or product behavior is unspecified, inspect existing precedent and ask rather than inventing behavior. Approved decisions belong in the relevant `docs/decision-log-*.md` file only after explicit user confirmation.

