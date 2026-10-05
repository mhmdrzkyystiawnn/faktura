# Progress Report — Faktura Project

---

## Status: Active Development (MVP Phase)

**Last Updated:** 2026-09-14

---

## 1. Project Overview

**Faktura** — SaaS invoicing & reminder untuk freelancer/UMKM.

- **Domain:** `faktura.muhamadrizky.my.id`
- **Frontend:** Next.js 16 (App Router) + Tailwind CSS 4 + shadcn/ui — deployed to Vercel
- **Backend:** NestJS 11 + Prisma 7 — deployed to Vercel Serverless Function
- **Database:** Neon PostgreSQL 18 (AWS ap-southeast-1)
- **Auth:** JWT access token (15m) + refresh token rotation (7d, HttpOnly cookie)
- **Reminder:** GitHub Actions cron (polling DB tiap 15-30 menit)

---

## 2. Completed Milestones

### 2.1 Monorepo Setup ✅

| Item | Status |
|------|--------|
| pnpm workspaces (`apps/web` + `apps/api`) | ✅ |
| Root `pnpm dev` parallel (concurrently) | ✅ |
| TypeScript strict mode | ✅ |

### 2.2 Frontend Foundation ✅

| Item | Status |
|------|--------|
| Next.js 16 + Turbopack | ✅ Running on :3000 |
| Tailwind CSS 4 + design tokens (Ledger & Ink) | ✅ |
| IBM Plex Sans/Serif/Mono fonts | ✅ |
| shadcn/ui components (button, card, dialog, form, table, etc.) | ✅ |
| Landing page (hero, features, CTA, footer) | ✅ |
| SEO metadata + Open Graph + Twitter Card | ✅ |
| `sonner` toast notifications | ✅ |

### 2.3 Backend Restructure ✅

Sebelum: flat structure di `src/`
Sesuai: modular per-domain sesuai `architecture.md` bagian 2

```
src/
├── common/
│   ├── filters/          ← AllExceptionsFilter
│   ├── guards/           ← JwtAuthGuard, RefreshAuthGuard, GoogleAuthGuard
│   ├── decorators/       ← CurrentUser decorator
│   └── app.factory.ts
├── config/               ← (siap dipakai)
├── database/
│   └── prisma/
│       ├── schema.prisma
│       ├── prisma.service.ts
│       └── prisma.module.ts
├── modules/
│   ├── auth/             ← ✅ Complete
│   ├── users/            ← (siap)
│   ├── clients/          ← (siap)
│   ├── invoices/         ← (siap)
│   ├── payments/         ← (siap)
│   ├── reminders/        ← (siap)
│   └── webhooks/         ← (siap)
├── app.module.ts
└── main.ts
```

### 2.4 Prisma & Database ✅

| Item | Status |
|------|--------|
| `schema.prisma` (sesuai `database-schema.md`) | ✅ |
| `RefreshToken` model (tambahan untuk auth) | ✅ |
| Prisma Client v7.10.0 generated | ✅ |
| Driver adapter (`@prisma/adapter-pg`) | ✅ |
| PrismaModule (global, injectable) | ✅ |

### 2.5 Environment & Database ✅

| Item | Status |
|------|--------|
| `.env` configured with JWT secrets, DB URL, Google OAuth | ✅ |
| `prisma db push` — schema synced to Neon | ✅ |
| Prisma Client v7.10.0 generated | ✅ |
| Auth endpoints tested (register, login, me) | ✅ |
| Resend API key configured | ✅ |

### 2.6 Frontend Design System Fix ✅

| Item | Status |
|------|--------|
| `@import "tw-animate-css"` added | ✅ |
| `@custom-variant dark (&:is(.dark *))` for dark mode | ✅ |
| OKLCH color format (replaces hex/hsl) | ✅ |
| `@layer base` with border + body styles | ✅ |
| Full shadcn/ui CSS variables (`--ring`, `--card`, `--radius`, dll) | ✅ |

| Feature | Status |
|---------|--------|
| Register (email/password) | ✅ |
| Login (email/password) | ✅ |
| Google OAuth (server-side token verification) | ✅ |
| JWT access token (15 menit) | ✅ |
| Refresh token rotation (7d, HttpOnly cookie) | ✅ |
| Logout (clear cookie + revoke token) | ✅ |
| Logout all sessions | ✅ |
| `/me` endpoint (JWT protected) | ✅ |
| Account linking protection (Google → existing email) | ✅ |
| Refresh token reuse detection (revoke all on theft) | ✅ |
| DTO validation (class-validator) | ✅ |
| Argon2id password hashing | ✅ |

**Endpoints:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | Public | Register new user |
| POST | `/api/v1/auth/login` | Public | Login, returns JWT + sets refresh cookie |
| POST | `/api/v1/auth/google` | Public | Google OAuth login |
| POST | `/api/v1/auth/refresh` | Cookie | Rotate refresh token, new access token |
| POST | `/api/v1/auth/logout` | JWT | Revoke refresh token, clear cookie |
| GET | `/api/v1/auth/me` | JWT | Get current user profile |

---

## 3. Next Priorities

### 3.1 Environment Setup (Blocking)

| Task | Status |
|------|--------|
| Copy `.env.example` → `.env` | ⏳ |
| Set `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | ⏳ |
| Set `DATABASE_URL` (Neon pooled) | ⏳ |
| Set `DIRECT_URL` (Neon direct, for migration) | ⏳ |
| Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | ⏳ |
| Push schema to Neon (`prisma migrate dev`) | ⏳ |

### 3.2 Users Module

| Task | Status |
|------|--------|
| Get/update profile | ⏳ |
| Account linking (Google ↔ email/password) | ⏳ |

### 3.3 Clients Module

| Task | Status |
|------|--------|
| CRUD Client (create, read, update, delete) | ⏳ |
| List clients with pagination | ⏳ |
| Search/filter clients | ⏳ |

### 3.4 Invoices Module

| Task | Status |
|------|--------|
| CRUD Invoice | ⏳ |
| Invoice items (line items) | ⏳ |
| Kalkulasi: subtotal, tax, discount, total (Decimal) | ⏳ |
| Auto-generate invoice number (INV-{year}-{urutan}) | ⏳ |
| Public token (for client-facing invoice page) | ⏳ |
| PDF generation | ⏳ |
| Status workflow (draft → sent → paid → overdue) | ⏳ |

### 3.5 Reminders Module

| Task | Status |
|------|--------|
| Generate reminders (H-3, H-1, H, H+lewat due date) | ⏳ |
| `internal-reminders.controller.ts` (GitHub Actions cron) | ⏳ |
| Email sending (Resend) | ⏳ |
| Failure tracking + retry | ⏳ |

### 3.6 Payments Module

| Task | Status |
|------|--------|
| Payment recording | ⏳ |
| Webhook handler (Midtrans/Xendit) | ⏳ |
| Signature/HMAC verification | ⏳ |
| Idempotency | ⏳ |

### 3.7 Testing

| Task | Status |
|------|--------|
| Jest setup (backend) | ⏳ |
| Unit test: kalkulasi invoice | ⏳ |
| Unit test: auth (hash, verify) | ⏳ |
| Integration test: auth endpoints | ⏳ |
| IDOR test | ⏳ |
| Rate limit test | ⏳ |

### 3.8 Deployment

| Task | Status |
|------|--------|
| Vercel project setup (frontend) | ⏳ |
| Vercel project setup (backend serverless) | ⏳ |
| GitHub Actions workflow (process-reminders) | ⏳ |
| Custom domain (`faktura.muhamadrizky.my.id`) | ⏳ |
| Cloudflare DNS + WAF | ⏳ |

---

## 4. Tech Stack Reference

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16.3.5, React 19, Tailwind CSS 4, shadcn/ui, TanStack Table/Query |
| Backend | NestJS 11, Prisma 7, SWC compiler |
| Database | PostgreSQL 18 (Neon) |
| Auth | JWT, Argon2id, Google OAuth 2.0 |
| Storage | Vercel Blob |
| Email | Resend |
| Cron | GitHub Actions |
| Hosting | Vercel (frontend + serverless backend) |
| DNS/CDN | Cloudflare |

---

## 5. Decision Log Summary

### Backend (12 decisions approved)

1. NestJS modular monolith
2. PostgreSQL
3. Prisma ORM
4. Neon hosting (serverless Postgres)
5. Vercel Serverless Function
6. GitHub Actions cron (not BullMQ)
7. Upstash Redis (rate limiting only)
8. Vercel Blob / Supabase Storage
9. Resend for email
10. WhatsApp reminder → next phase
11. MVP auth: email/password + Google OAuth
12. Abuse prevention → next phase

### Frontend (8 decisions approved)

1. Next.js + TypeScript + Tailwind
2. shadcn/ui components
3. shadcn Table + TanStack Table
4. "Ledger & Ink" visual concept (navy + brass)
5. IBM Plex typography
6. Tiered radius system
7. Brand name: Faktura
8. Domain: `faktura.muhamadrizky.my.id`

---

## 5. Open Questions / Blockers

| Question | Status |
|----------|--------|
| Payment gateway pakai Midtrans atau Xendit? | Belum diputuskan |
| WhatsApp reminder: resmi (Meta Cloud API) atau tidak resmi? | Belum diputuskan |
| Coverage minimum untuk test? | Belum diputuskan |

---

## 6. How to Run

```bash
# Install dependencies
pnpm install

# Setup environment
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with real values

# Generate Prisma Client
cd apps/api && npx prisma generate

# Run database migration
npx prisma migrate dev

# Start development (both apps)
cd ../.. && pnpm dev

# Or separately:
cd apps/api && pnpm dev    # API on :3001
cd apps/web && pnpm dev    # Web on :3000
```
