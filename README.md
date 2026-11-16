# MarketGym

Train your market judgement with real data.

MarketGym is an AI-powered learning coach for financial markets. It diagnoses what a learner already knows, builds a personalised path through one track (Crypto Market Analyst Foundations: markets, news, ETF data, indexes, order books, market reasoning), grounds every exercise in timestamped market evidence, scores the learner's written reasoning against a fixed rubric, tracks misconceptions, and only marks a skill mastered after repeated demonstrated performance plus a later retention check.

No wallet, no deposits, no trading, no investment advice.

## Run it (fresh checkout)

Requirements: Node 20+, pnpm 9+.

```bash
pnpm install
cp .env.example .env.local      # optional; the app runs with an empty .env.local
pnpm dev                        # http://localhost:3000
```

With no environment variables set, MarketGym runs in **local mode**:

- one implicit learner, progress saved to `./.data/marketgym.json`;
- the coach and evaluator run in **offline mode** (rule-based, labelled in the UI);
- SoDEX order books are **live** (public read-only endpoint, no key needed);
- SoSoValue market data is served from **demo fixtures**, labelled "demo" on every card.

### Optional services

| Variable | Effect when set |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase Auth (email + password) and Postgres persistence with RLS. Apply `supabase/migrations/0001_init.sql` then `supabase/seed/seed.sql` (or `pnpm seed:supabase`). |
| `OPENAI_API_KEY` (+ `OPENAI_MODEL`) | LLM Socratic coach and semantic evaluation (Zod-validated structured outputs). Mastery is still computed by rules. |
| `SOSOVALUE_API_KEY` | Live prices, ETF flows, indexes and news from SoSoValue (20 req/min; cached server-side). |
| `DEMO_MODE=true` | Never call external APIs; everything comes from fixtures and is labelled demo. Used by E2E tests. |

## Scripts

```bash
pnpm dev          # dev server
pnpm typecheck    # tsc --noEmit
pnpm lint
pnpm test         # vitest unit + API tests
pnpm test:e2e     # playwright (starts its own server on :3100 in DEMO_MODE)
pnpm build        # production build
pnpm check        # all of the above except e2e
```

## Documentation

- `docs/PRODUCT_SPEC.md`, `docs/UX_SPEC.md`, `docs/DESIGN_SYSTEM.md`
- `docs/ARCHITECTURE.md`, `docs/CONTRACTS.md` (API + type contracts), `docs/AGENT_OWNERSHIP.md`, `docs/IMPLEMENTATION_PLAN.md`
- `docs/SECURITY.md`, `docs/TEST_PLAN.md`
- `docs/research/SOSOVALUE.md`, `docs/research/SODEX.md` (verified third-party API contracts)

## Deployment

Vercel + Supabase. Set the variables above in Vercel, run the migration and seed against the Supabase project, deploy. The in-memory market-data cache and rate limiter are per instance (fine for a single Vercel region; swap for Redis if you scale out).

## Known limitations

See the end of this file after the build is complete (filled by the final report).
