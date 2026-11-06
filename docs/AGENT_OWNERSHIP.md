# Agent ownership

One owner per path. Nobody edits outside their paths; integration problems go to the lead.

| Agent | Owns | Must not touch |
|---|---|---|
| **Lead** (this session) | root config (`package.json`, `next.config.ts`, `tsconfig.json`, `.env.example`, `vitest.config.ts`, `playwright.config.ts`), `lib/types/`, `lib/config/`, `lib/db/repository.ts`, `supabase/migrations/`, `docs/CONTRACTS.md`, `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION_PLAN.md`, `README.md`, `app/layout.tsx`, `app/globals.css` (after UX hands over tokens), final integration | — |
| **Curriculum** | `lib/curriculum/` (seed content as TypeScript), `supabase/seed/` | everything else |
| **UX / Design** | `docs/PRODUCT_SPEC.md`, `docs/UX_SPEC.md`, `docs/DESIGN_SYSTEM.md`, `components/ui/`, `app/globals.css` tokens block, `public/` brand assets (favicons, OG) | feature components, routes |
| **Backend** | `app/api/`, `lib/market-data/`, `lib/db/` (except `repository.ts`), `lib/auth/`, `lib/server/` (route helpers, rate limit), `scripts/seed-supabase.ts`, `middleware.ts` | `lib/ai`, `lib/learning`, UI |
| **AI / Learning** | `lib/ai/`, `lib/learning/`, `tests/unit/ai/`, `tests/unit/learning/` | routes, UI, market adapters |
| **Frontend** | `app/(marketing)/`, `app/(auth)/`, `app/(platform)/`, `components/` (except `components/ui/`), `app/not-found.tsx`, `app/error.tsx`, `app/manifest.ts`, `app/robots.ts`, `app/sitemap.ts`, `app/opengraph-image.tsx` | `lib/*`, `app/api` |
| **QA / Security** | `tests/` (except unit tests owned by AI), `docs/SECURITY.md`, `docs/TEST_PLAN.md` | fixes in other owners' files: report to lead instead |

Shared read-only inputs for everyone: `docs/CONTRACTS.md`, `lib/types/*`, `docs/research/*`, `lib/market-data/__fixtures__/*`.
