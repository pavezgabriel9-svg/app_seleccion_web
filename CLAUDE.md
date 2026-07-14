# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Dev server at localhost:3000
npm run build    # Production build
npm run lint     # ESLint
```

No test runner is configured.

## Environment

Requires `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
```

## Architecture

Next.js App Router + Supabase (PostgreSQL + Auth). TypeScript throughout.

### Route Groups

- `app/page.tsx` — Root; redirects to `/dashboard` (authed) or `/login` (unauthed)
- `app/(auth)/login/` — Public login page (Supabase email/password)
- `app/(admin)/` — Protected admin routes; auth enforced in layout via `supabase.auth.getUser()` (no middleware)
  - `dashboard/` — Stats overview
  - `baterias/` — Battery management (create, view, generate eval links)
  - `resultados/` — Session results with search and CSV export; `[sessionId]/` for per-candidate detail
  - `usuarios/` — Admin user management (list, create, ban/unban); restricted to `super_admin` only
- `app/(eval)/eval/[token]/` — Public candidate-facing evaluation
  - `page.tsx` — Intake form (name + RUT)
  - `hub/page.tsx` — Candidate hub: shows all tests with completion state, progress bar, any-order navigation
  - `[testId]/page.tsx` + `test-runner.tsx` — Test runner (client component)
  - `gracias/` — Legacy completion page (hub now handles the completed state inline)

### Server Actions

All mutations use Next.js Server Actions (`'use server'`), not API routes:

- `app/(auth)/login/actions.ts` — `loginAction`, `logoutAction`
- `app/(admin)/baterias/actions.ts` — `createBatteryAction`, `deleteBatteryAction`, `createEvaluationAction`
- `app/(admin)/usuarios/actions.ts` — `createAdminAction`, `toggleBanAction`; both require `super_admin` via `requireSuperAdmin()` guard
- `app/(eval)/eval/actions.ts` — `startEvaluationAction`, `completeTestAction`

### Supabase Clients

Two clients in `lib/supabase/server.ts`:
- `createClient()` — Cookie-based SSR client; respects RLS; used for admin routes
- `createServiceClient()` — Service role; bypasses RLS; used in eval actions (unauthenticated candidates) and in `usuarios/` (reading/managing auth users via `admin.listUsers`)

### Roles

Two roles stored in `user.app_metadata.role`: `'super_admin'` and `'admin'` (default). Role helpers in `lib/auth/roles.ts`: `getUserRole`, `isSuperAdmin`, `getRoleLabel`, `isUserBanned`. The admin layout passes `role` to sidebar and topbar to conditionally show the Usuarios link (super_admin only).

RLS migration in `supabase/migrations/001_rls_roles.sql` — run once in Supabase SQL Editor. Defines a `is_super_admin()` DB function and per-table policies. Assign `super_admin` role manually via Supabase Dashboard → Authentication → Users → App Metadata.

### Database Schema

Tables: `tests` (seed data, fixed catalog), `batteries`, `battery_tests`, `evaluation_sessions`, `candidates`, `test_results`. Full types in `types/database.ts`.

Key design: `evaluation_sessions.tests_snapshot` (JSONB array) captures the ordered test list at session creation time, so battery changes don't affect in-progress evaluations.

Session lifecycle: `pending` → `in_progress` (after intake form) → `completed` (after last test).

### Tests

Five psychology tests as `'use client'` React components in `components/tests/`:
- `hanoi.tsx` — Tower of Hanoi (cognitive; two difficulty variants). During gameplay renders a full-screen overlay (`position: fixed; inset: 0`) that escapes the `max-w-xl` eval layout. Disc widths are percentage-based (responsive). Result screen shows only a thank-you message — scores are not shown to the candidate.
- `ic.tsx` — Inventario de Capacidades (aptitude; 25 items, 7 min timer)
- `stroop.tsx` — Stroop color-word test (attention)
- `memoria.tsx` — Memory sequence recall
- `luscher.tsx` — Lüscher color preference (4 steps in a single component)

Each receives `{ onComplete: (results: TestResultData) => void, isPending: boolean, hasPractice: boolean }` from the test runner page. `HanoiTest` additionally receives `variant: 'medio' | 'dificil'` and `candidateName?: string`. Result types are defined in `types/database.ts`.

Test dispatch: `test-runner.tsx` uses `next/dynamic` to load the active test component. The `testPath` field from `tests_snapshot` (e.g. `'hanoi'`, `'stroop'`) selects which component to render — not the `testId` UUID.

### Evaluation Flow

1. Admin creates a battery → generates a UUID token link via `createEvaluationAction`
2. Candidate opens `/eval/[token]` → enters name + RUT (Chilean checksum validated in `startEvaluationAction`)
3. `startEvaluationAction` inserts `candidates` record, sets session to `in_progress`, redirects to `/eval/[token]/hub`
4. Hub shows all tests with completion state; candidate picks any uncompleted test in any order
5. `completeTestAction` saves each `test_results` row and always redirects back to hub
6. When all tests are saved, `completeTestAction` marks session `completed`; hub renders an inline success state
7. Anti-double-submit: `completeTestAction` checks for existing `test_results` row before inserting; uses atomic conditional UPDATE to prevent race conditions on session start

### UI

shadcn/ui components (Radix primitives + Tailwind v4). Fonts: Fraunces (display), Sora (body), Geist Mono. Add new components with `npx shadcn@latest add <component>`.
