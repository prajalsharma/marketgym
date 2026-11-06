# Implementation plan

| Phase | Work | Owner | Status |
|---|---|---|---|
| 0 | Recon, scaffold (Next 16, TS strict, Tailwind 4, Radix, Zod 4, Supabase, OpenAI, Vitest, Playwright), research SoSoValue + SoDEX contracts, frozen types, migration, docs | Lead + 2 research agents | done |
| 1 | Foundations: env, repository interface, curriculum content, design tokens + UI primitives | Lead, Curriculum, UX | in progress |
| 2 | Parallel build: backend routes + adapters + repositories + auth; AI/learning engines; frontend screens; QA tests/security docs | Backend, AI, Frontend, QA | |
| 3 | Integration: signup → onboarding → diagnostic → path → coach → scenario → evaluation → mastery → progress, E2E in local mode | Lead | |
| 4 | Sponsor data: SoSoValue adapter behind key (fixtures until key), SoDEX live order books, Order Book Gym exercises | Backend, Frontend | |
| 5 | Hardening: typecheck, lint, unit, API, RLS review, E2E desktop+mobile, prod build | QA + Lead | |
| 6 | Demo flow + README fresh-checkout verification | Lead | |

Acceptance tests 1–12 from the brief map to `docs/TEST_PLAN.md`.
