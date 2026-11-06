# MarketGym architecture

Single Next.js 16 (App Router) application. No microservices.

```
Browser ──► app/(platform)/* server components ──► lib/services (domain) ──► Repository ──► Supabase | local JSON
            app/(platform)/* client components ──► app/api/* route handlers ─┘       │
                                                                                     ├──► lib/market-data (SoSoValue, SoDEX adapters + cache)
                                                                                     └──► lib/ai (OpenAI structured outputs, Zod-validated)
```

## Layers

1. **UI** (`app/`, `components/`) — renders contracts from `lib/types`. No domain logic. Feature components fetch via `/api/*` with the `ApiResponse` envelope; server pages may call services directly.
2. **Routes** (`app/api/*`) — parse input with Zod, `requireUser()`, call a service, map errors to `API_STATUS`. Rate limit via `lib/server/rate-limit.ts` (in-memory token bucket per ip/user; fine for one Vercel instance, documented limitation).
3. **Services** (`lib/learning/*`, `lib/ai/*`, `lib/market-data/*`) — pure domain logic with explicit inputs; unit-tested.
4. **Persistence** (`lib/db/*`) — `Repository` interface, two implementations selected by `getEnv().supabaseEnabled`.

## Learning intelligence (separate responsibilities, not one agent)

| Service | File | Model use |
|---|---|---|
| Diagnostic | `lib/learning/diagnostic.ts` | none for MC; optional LLM for the one open question |
| Curriculum / next mission | `lib/learning/curriculum-engine.ts` | none (rules: prerequisites, mastery, overdue reviews, recurring misconceptions, goal) |
| Scenario generation | `lib/learning/scenario-generator.ts` | none (template + frozen evidence pack); questions are template-authored |
| Coach | `lib/ai/coach.ts` | LLM Socratic turn, Zod-validated; offline scripted flow fallback |
| Evaluator | `lib/ai/evaluators/*` | `rules.ts` deterministic (key-point coverage, evidence citation, misconception cues, hedging markers) + `llm.ts` semantic scoring; combined by `evaluate.ts` with rules as floor/ceiling guard |
| Mastery | `lib/learning/mastery.ts` | none. Pure function of attempts/checks/reviews |
| Spaced review | `lib/learning/spaced-review.ts` | none. Intervals 1d → 3d → 7d → 14d, reset on failure |
| Memory | `lib/learning/memory.ts` | none. Derived from stored records |

Mastery rule (provisional, see `mastery.ts`): `mastered` requires ≥2 scenario attempts on different scenarios scoring ≥80, one passed retention review scheduled ≥1 day after the second qualifying attempt, and no unresolved critical misconception. `practising` = ≥1 attempt ≥60 or ≥2 correct knowledge checks. `learning` = any activity.

## Market data

- `SoSoValueProvider` (`lib/market-data/sosovalue/`): REST client with timeout, `x-soso-api-key`, Zod-validated response, normalisers → `MarketSnapshot`, `NewsEvidence`, `EtfFlowSeries`, `IndexSnapshot`. Quota is 20 req/min, 100k/month ⇒ cache TTL ≥ 120 s, news ≥ 10 min.
- `SoDEXMarketDataProvider` (`lib/market-data/sodex/`): public GETs `/markets/symbols`, `/markets/{symbol}/orderbook?limit=`, `/markets/tickers`. Response `code !== 0` is an error even with HTTP 200. Cache 15 s; symbols 1 h.
- `lib/market-data/cache.ts`: in-memory TTL cache + stale-after-failure. Every value carries `DataProvenance`.
- `lib/market-data/fixtures.ts`: deterministic demo data from `__fixtures__` with `provenance.kind = "demo"`. Used when a provider is unconfigured, `DEMO_MODE=true`, or the provider fails with no cached copy.
- `lib/market-data/evidence.ts`: `buildEvidencePack(requirements)` for scenarios.

## Auth

Supabase Auth via `@supabase/ssr` cookies; `middleware.ts` refreshes sessions and redirects unauthenticated `/app/*` to `/login`. Local mode: one implicit learner, no redirect, clearly labelled in the UI.

## Security boundaries

- Secrets only read in `lib/config/env.ts` (server). Client gets only `NEXT_PUBLIC_*`.
- No trading, no order submission, no wallet, no signatures. SoDEX adapter only calls `/markets/*` GETs.
- News content is untrusted: sanitised to text, truncated, and wrapped in a delimiter block with an instruction that it is data, not instructions.
- LLM output never touches the repository directly; `mastery.ts` recomputes from validated records.

## Known trade-offs

- In-memory cache and rate limiter reset per instance. Acceptable for MVP; swap for Upstash/Redis if scaling.
- Local JSON repository is for demos and E2E, not multi-user production.
- SoSoValue field units (e.g. `change_pct_24h`) are documented but unverified without a key; the normaliser flags this and tests check shape only.
