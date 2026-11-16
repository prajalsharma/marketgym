# MarketGym test plan

Owner: QA / Security. Status column is filled by the lead after each integration run.
Run modes: **local** = Supabase unset, `DEMO_MODE=true` (what Playwright uses, see `playwright.config.ts`); **keyed** = real SoSoValue / OpenAI / Supabase credentials in `.env.local`.

## How to run

| Suite | Command | Notes |
|---|---|---|
| Security unit tests | `pnpm vitest run tests/unit/security` | No network, no server. Suites `it.skip` with a reason until the file they target exists. |
| All unit tests | `pnpm test` | Includes AI/learning/API/market-data/db suites owned by other agents. |
| E2E desktop + mobile | `pnpm test:e2e` | Starts `next dev -p 3100` with `DEMO_MODE=true`, data file `.data/e2e.json`. Delete that file for a fresh learner. `--project=desktop` or `--project=mobile` to pick one. |
| Secrets scan | `scripts/check-secrets.sh` | Exit 1 on any key-looking string or an un-ignored `.env*`. |
| Typecheck + build | `pnpm typecheck && pnpm build` | Acceptance test 12. |
| Accessibility | part of `pnpm test:e2e` | axe-core on landing, dashboard, scenario lab, order-book gym. Fails on `serious`/`critical`; lower impacts are attached to the Playwright report (`axe-<page>` attachment) and printed to the console. |

## Acceptance tests → coverage

| # | Acceptance test (brief) | Automated | Manual procedure (keyed / Supabase mode) | Status |
|---|---|---|---|---|
| 1 | New user signs up, selects goal, completes diagnostic, receives a starting point | `tests/e2e/journey.spec.ts` "1+2" (local mode: /signup → Continue → onboarding → ≥6 diagnostic answers → `/api/learning/next` returns a mission) | Supabase mode: create a fresh email, sign up, confirm profile row auto-created by `handle_new_user`, complete onboarding, check `diagnostics` row and dashboard starting point. | |
| 2 | Dashboard shows actual path, prerequisites, next mission | `journey.spec.ts` "1+2" (asserts next-mission card, module names incl. "Order book", prerequisite/locked text) | Compare dashboard module locks with `docs/CONTRACTS.md` prerequisites (news/etf/indexes/orderbook ← markets; reasoning ← news, etf). | |
| 3 | Coach answers a topic question usefully | `tests/e2e/coach.spec.ts` (reply ≥ 40 chars arrives; offline notice shown; session `mode === "offline"`) | Keyed: set `OPENAI_API_KEY`, ask "Why can volume rise while price falls?"; reply must cite the evidence pack ids and ask a follow-up; UI shows mode "AI". | |
| 4 | Scenario lab: open, inspect evidence, submit, structured feedback | `journey.spec.ts` "4+5" (evidence cards with DataSourceTag, ≥60-word answer, total `/100`, four rubric rows, evaluator mode disclosed) | Keyed: same flow with LLM evaluator; `evaluatorMode: "llm"` and rules floor/ceiling respected (score within ±15 of the rules score). | |
| 5 | Completed assessment updates mastery via validated rules | `journey.spec.ts` "4+5" (attempt visible on `/api/progress/attempts` and progress page) + `tests/unit/learning/*` (AI agent) for `computeMastery` rules + `tests/unit/security/llm-output.test.ts` (LLM output cannot reach mastery) | Submit two ≥80 answers on different scenarios, pass the review a day later (or move clock): status becomes `mastered`; a critical misconception blocks it. | |
| 6 | Recurring misconception is identified and steers a later exercise | `tests/unit/learning/*` (AI agent: `buildMemory`, `pickTemplateForSkill`, `selectNextMission`) | Local: answer two scenarios with "the headline says so, so it's true"; progress page lists `headline-is-fact` with count 2 and the next mission reason mentions it. | |
| 7 | With SoSoValue creds the server returns documented data with source + timestamp | `tests/unit/market-data/*` (backend agent: normalisers against fixtures) + `tests/unit/security/provenance.test.ts` (shape of provenance on every item) | Keyed: `curl -s localhost:3000/api/market/snapshot?assets=BTC` → `provenance.kind` "live", `provider` "sosovalue", `sourceUrl` an `openapi.sosovalue.com` URL, `fetchedAt` within the last minute. Repeat within 120 s → "cached". | |
| 8 | When an external API is unavailable the UI marks demo data and never claims live | `tests/e2e/fallback.spec.ts` (every `/api/market/*` item `demo`/`fixture`; UI tags say demo, no "live" text) + `tests/unit/security/provenance.test.ts` (warm cache + failing provider ⇒ `cached` + note; cold + failing ⇒ `demo` + reason) | Keyed: set `SODEX_MARKET_DATA_BASE_URL=https://127.0.0.1:9/` and reload the gym: tag reads "demo" with the failure note, never "live". | |
| 9 | Order-book exercise completes with no real orders / wallet | `tests/e2e/orderbook.spec.ts` (ladder, best bid/ask, spread, submit identify-spread, result; no element matching /place order\|buy\|sell\|connect wallet/i; no non-localhost browser requests) + `provenance.test.ts` (adapter only calls `markets/*`) + static grep in `docs/SECURITY.md` | `grep -rn "markets/" lib/market-data/sodex` lists only symbols/orderbook/tickers; `http.ts` is GET-only. | |
| 10 | User-specific data can't be read/modified by another authenticated user | `tests/unit/security/repository-isolation.test.ts` (local repo) + `route-auth.test.ts` (401 without a user on every non-public route) + RLS review in `docs/SECURITY.md` | Supabase: two users A/B; with A's JWT `GET /rest/v1/scenario_attempts?user_id=eq.<B>` → `[]`; `PATCH /rest/v1/user_skill_mastery` with A's JWT → 0 rows (select-only policy). | |
| 11 | Main workflow works desktop + mobile | `journey.spec.ts`, `coach.spec.ts`, `orderbook.spec.ts`, `fallback.spec.ts` run under both Playwright projects (`desktop` = Desktop Chrome, `mobile` = Pixel 7) | Spot-check on a real phone: onboarding radio groups tappable, evidence cards readable, answer textarea usable. | |
| 12 | Typecheck + production build pass | `pnpm typecheck && pnpm build` (lead runs; CI step) | — | |

## Security unit suites (`tests/unit/security`)

| File | Covers | Depends on |
|---|---|---|
| `route-auth.test.ts` | Every `app/api/**/route.ts` handler called with no user (Supabase mode mocked): protected routes → 401 `unauthenticated`; `/api/market/*`, `/api/auth/*`, `/api/health` → not 401; nothing returns 500 | route files (glob at test time) |
| `validation.test.ts` | Zod schemas (`lib/server/validation.ts`) reject malformed bodies; routes for attempt / profile / diagnostic return 400 `validation_error` incl. malformed JSON | `lib/server/validation.ts` (present), three route files |
| `rate-limit.test.ts` | 60/min market policy, 61st → `rate_limited` (429), per-ip + per-scope isolation, x-forwarded-for first hop, refill; the same through `GET /api/market/snapshot` | `lib/server/rate-limit.ts` (present), snapshot route |
| `provenance.test.ts` | DEMO_MODE ⇒ demo/fixture on every route and service; `OrderBookService` live → cached → stale+note → demo; SoDEX fake only sees `markets/*` | `lib/market-data/*` (present), market routes |
| `llm-output.test.ts` | `callStructured` rejects non-JSON / off-schema output after one retry, strips extra keys, handles no-model and transport errors; `lib/ai/**` never imports `lib/db`; `wrapUntrusted` neutralises nested delimiters and truncates | `lib/ai/*` (present) |
| `repository-isolation.test.ts` | Local repository: A cannot list/read/overwrite B's attempts, mastery, reviews, coach sessions, activity, KC results, diagnostics; results are copies | `lib/db/local-repository.ts` (present) |

## Suggested `data-testid`s (frontend)

The E2E helpers try these first and fall back to role/text selectors. Adding them makes the suite independent of copy changes.

| Test id | Element |
|---|---|
| `local-mode-continue` | the Continue button/link on `/signup` and `/login` in local mode |
| `onboarding-next` | the primary Continue/Submit button on each onboarding step |
| `diagnostic-question` | wrapper of each diagnostic question |
| `next-mission` | the next-mission card on the dashboard |
| `market-card` | each market/evidence card on the dashboard |
| `evidence-card` | each evidence card in the scenario lab |
| `data-source-tag` | the `DataSourceTag` root (already suggested to UX: render provider + kind + time as text) |
| `attempt-answer` / `attempt-submit` | the answer textarea / submit button |
| `evaluation-total` | the "NN / 100" total |
| `evaluation-dimension` | each of the four rubric rows (factual, evidence, reasoning, uncertainty) |
| `coach-input` / `coach-send` | coach composer |
| `coach-message-coach` | each coach-authored message (or `data-role="coach"`) |
| `coach-mode-notice` | the "offline / scripted" or "AI" mode notice |
| `orderbook-ladder`, `orderbook-best-bid`, `orderbook-best-ask`, `orderbook-spread` | gym ladder and summary stats |
| `gym-submit` / `gym-result` | exercise submit button / result panel |
| `attempt-row` | each attempt row on `/app/progress` |

## Page routes assumed by the E2E suite

`/`, `/signup`, `/login`, `/app/onboarding`, `/app`, `/app/scenarios/[id]`, `/app/coach`, `/app/orderbook-gym` (fallbacks `/app/orderbook`, `/app/gym`), `/app/progress`. If the frontend uses different paths, update `ROUTES` in `tests/e2e/helpers.ts` only.

## Known gaps / not automated

- Supabase-mode RLS is reviewed by reading the migration (`docs/SECURITY.md`), not executed: no Postgres in CI. The manual procedure for test 10 covers it.
- Keyed SoSoValue/OpenAI behaviour (tests 3, 4, 7) is manual: no credentials in CI, and the suite must never need them.
- The rate limiter and cache are per-instance; the E2E server is a single instance, so 429 behaviour is unit-tested only.
- axe is run on four pages, not every page; moderate/minor findings are reported, not enforced.
