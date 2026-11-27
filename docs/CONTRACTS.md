# MarketGym — Frozen Contracts

Everything shared between agents lives here or in the files it points to. Nobody changes a frozen file without updating this document; the lead agent owns both.

## Frozen files

| File | What it fixes |
|---|---|
| `lib/types/market.ts` | Normalised market data: `MarketSnapshot`, `NewsEvidence`, `EtfFlowSeries`, `IndexSnapshot`, `OrderBookSnapshot`, `EvidencePack`, `DataProvenance` |
| `lib/types/curriculum.ts` | `Skill`, `Module`, `KnowledgeCheck`, `ExerciseTemplate`, `Rubric`, `Misconception`, `Curriculum` |
| `lib/types/learning.ts` | `Profile`, `DiagnosticResult`, `Scenario`, `ScenarioAttempt`, `Evaluation`, `MasteryRecord`, `Review`, `CoachSession`, `ActivityEvent`, `NextMission` |
| `lib/types/api.ts` | API envelope (`ApiOk`/`ApiErr`), status map, request/response types per route |
| `lib/db/repository.ts` | `Repository` interface every service uses for persistence, plus `KnowledgeCheckResult` |
| `lib/config/env.ts` | `getEnv()` — the only place `process.env` is read |
| `supabase/migrations/0001_init.sql` | Schema + RLS |
| This file | Skill ids, misconception ids, route list, provenance rules |

## Skill ids (stable slugs)

Module ids are the parent skills: `markets`, `news`, `etf`, `indexes`, `orderbook`, `reasoning`.

```
markets.price            markets.volume          markets.market-cap
markets.liquidity        markets.volatility      markets.structure

news.facts-vs-opinions   news.catalysts          news.narratives
news.uncertainty         news.causation

etf.flows                etf.aum                 etf.flow-limits
etf.change-over-time

indexes.constituents     indexes.weighting       indexes.concentration
indexes.diversification  indexes.performance

orderbook.bid-ask        orderbook.spread        orderbook.depth
orderbook.liquidity      orderbook.imbalance     orderbook.tick-lot
orderbook.price-time-priority

reasoning.thesis         reasoning.evidence-selection
reasoning.observation-vs-interpretation          reasoning.missing-info
reasoning.uncertainty    reasoning.invalidation
```

Module prerequisites: `news` ← `markets`; `etf` ← `markets`; `indexes` ← `markets`; `orderbook` ← `markets`; `reasoning` ← `news`, `etf`.

## Misconception ids (minimum set; curriculum may add more following the same style)

```
price-equals-value               volume-implies-direction      market-cap-is-money-invested
liquidity-equals-volume          volatility-is-bad             spread-is-fee
headline-is-fact                 correlation-is-causation      narrative-is-evidence
single-source-certainty          flows-equal-price-impact      aum-change-equals-flows
one-day-flow-is-trend            index-is-equal-weight         concentration-is-diversification
index-return-is-every-asset      depth-is-static               imbalance-predicts-price
bigger-book-always-more-liquid   tick-size-is-min-order        earlier-order-loses-to-bigger
observation-is-interpretation    confidence-is-evidence        thesis-without-invalidation
```

## Route list (app/api)

All routes return `ApiResponse<T>` from `lib/types/api.ts` with the status from `API_STATUS`. Routes under `/api/learning`, `/api/coach`, `/api/scenarios`, `/api/progress`, `/api/profile`, `/api/diagnostic`, `/api/orderbook-gym` require a learner (401 otherwise). `/api/market/*` is public but rate-limited (60/min/ip).

```
GET  /api/profile                       ProfileResponse
PUT  /api/profile                       ProfileUpsertRequest → ProfileResponse
POST /api/diagnostic                    DiagnosticSubmitRequest → DiagnosticSubmitResponse
GET  /api/diagnostic/questions          DiagnosticQuestion[]   (from lib/learning/diagnostic)

GET  /api/learning/path                 LearningPathResponse
GET  /api/learning/next                 LearningNextResponse
GET  /api/learning/skills               LearningSkillsResponse
POST /api/learning/knowledge-check      KnowledgeCheckSubmitRequest → KnowledgeCheckSubmitResponse
POST /api/learning/review               ReviewSubmitRequest → ReviewSubmitResponse

POST /api/coach/session                 CoachSessionCreateRequest → CoachSessionResponse
GET  /api/coach/session?id=             CoachSessionResponse
POST /api/coach/respond                 CoachRespondRequest → CoachRespondResponse
POST /api/coach/hint                    CoachHintRequest → CoachHintResponse

GET  /api/scenarios/next?skillId=       ScenarioNextResponse
GET  /api/scenarios/[id]                ScenarioGetResponse
POST /api/scenarios/[id]/attempt        ScenarioAttemptRequest → ScenarioAttemptResponse
GET  /api/scenarios/[id]/result         ScenarioResultResponse

GET  /api/orderbook-gym/exercises       OrderBookExercise[]  (from lib/learning/orderbook-exercises)
POST /api/orderbook-gym/submit          OrderBookExerciseSubmitRequest → OrderBookExerciseSubmitResponse

GET  /api/market/snapshot?assets=BTC,ETH MarketSnapshotResponse
GET  /api/market/news?limit=            MarketNewsResponse
GET  /api/market/etf?asset=BTC          MarketEtfResponse
GET  /api/market/indexes                MarketIndexesResponse
GET  /api/market/orderbook?market=vBTC_vUSDC&limit=20  MarketOrderBookResponse

GET  /api/progress/overview             ProgressOverviewResponse
GET  /api/progress/skills               ProgressSkillsResponse
GET  /api/progress/reviews              ProgressReviewsResponse
GET  /api/progress/attempts             ProgressAttemptsResponse
```

## Auth boundary

`lib/auth/session.ts` exports `getCurrentUser(): Promise<{ id: string; email: string | null } | null>` and `requireUser()` (throws `ApiError("unauthenticated")`).

- Supabase configured → Supabase Auth (email+password, cookie sessions via `@supabase/ssr`), RLS enforces isolation.
- Supabase not configured ("local mode") → a single learner `local-demo-user`, created on first visit; the sign-up and log-in pages explain local mode and send the user straight to onboarding. All server code goes through `requireUser()` either way.

## Provenance rules (non-negotiable)

- Every `MarketSnapshot`/`NewsEvidence`/`EtfFlowSeries`/`IndexSnapshot`/`OrderBookSnapshot` carries `provenance.kind` ∈ `live | cached | demo`.
- `live`: fetched for this request. `cached`: from `lib/market-data/cache` (within TTL, or stale-after-failure, with `note`). `demo`: fixture; never shown with a "live" label.
- UI shows a `<DataSourceTag provenance={…} />` on every evidence card: provider, kind, and `fetchedAt`/`asOf` time.
- Scenarios freeze their `EvidencePack` at creation; attempts grade against the frozen pack.

## AI boundary

- `lib/ai/provider.ts` exposes `getModel(): LanguageModel | null`. Null when `OPENAI_API_KEY` is unset or `DEMO_MODE=true`.
- Every LLM output passes a Zod schema in `lib/ai/schemas/`. Prompts live in `lib/ai/prompts/` and export `{ version, system, build(input) }`.
- The LLM never writes to the repository. `lib/learning/mastery.ts` is the only code that produces a `MasteryRecord`, from `ScenarioAttempt` + `KnowledgeCheckResult` + `Review` records.
- Offline mode (no key): the evaluator runs `lib/ai/evaluators/rules.ts` only and reports `evaluatorMode: "rules"`; the coach runs the scripted Socratic flow and reports `mode: "offline"`. UI tells the learner which mode is active.

## Dev servers

Agents run `NEXT_DIST_DIR=.next-<agent> pnpm next dev -p <port>` so builds don't collide (ports: backend 3001, frontend 3002, ai 3003, ux 3004, qa 3005).

## Curriculum module API (`lib/curriculum/index.ts`)

```ts
export const curriculum: Curriculum;                 // one path, 6 modules, 33 leaf skills, misconceptions
export function getSkill(id: string): Skill | undefined;
export function getModule(id: string): Module | undefined;
export function getModuleForSkill(skillId: string): Module | undefined;
export function getExerciseTemplate(id: string): ExerciseTemplate | undefined;
export function listExerciseTemplates(filter?: { skillId?: string; kind?: ExerciseKind }): ExerciseTemplate[];
export function getKnowledgeCheck(id: string): KnowledgeCheck | undefined;
export function listKnowledgeChecks(skillId: string): KnowledgeCheck[];
export function getMisconception(id: string): Misconception | undefined;
```

## UI primitives (`components/ui/*`, owned by UX; frontend codes against these names)

`Button` (variant: primary | secondary | ghost | danger; size: sm | md | lg; asChild), `Card`/`CardHeader`/`CardTitle`/`CardContent`/`CardFooter`, `Badge` (tone: neutral | success | warning | danger | info), `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` (Radix), `Dialog`* (Radix), `Tooltip`* (Radix), `Progress` (value 0..100, tone), `Input`, `Textarea`, `Label`, `Select`* (Radix), `RadioGroup`/`RadioGroupItem` (Radix), `Collapsible`* (Radix), `Skeleton`, `EmptyState` (title, description, action?), `ErrorState` (title, description, retry?), `DataSourceTag` (provenance: DataProvenance; compact?) — renders provider + live/cached/demo + time, `MasteryIndicator` (status: MasteryStatus; score), `Stat` (label, value, hint?), `PageHeader` (title, description?, actions?), `Kbd`.

All export from `components/ui/index.ts`. `cn()` lives in `lib/utils.ts` (lead-owned, already present).

## Learning services API (`lib/learning/*`, owned by AI agent; consumed by backend routes)

```ts
// diagnostic.ts
export function getDiagnosticQuestions(profile: Profile): DiagnosticQuestion[];      // 6–8 questions, goal/interest-aware
export async function runDiagnostic(profile: Profile, answers: DiagnosticAnswer[]): Promise<DiagnosticResult>;
// curriculum-engine.ts
export function computeSkillProgress(mastery: MasteryRecord[]): SkillProgress[];
export function computeModuleProgress(skills: SkillProgress[]): LearningPathResponse["modules"];
export function selectNextMission(input: { profile: Profile; diagnostic: DiagnosticResult | null; mastery: MasteryRecord[]; reviews: Review[]; attempts: ScenarioAttempt[]; kcResults: KnowledgeCheckResult[] }): NextMission;
// scenario-generator.ts
export function buildScenario(template: ExerciseTemplate, evidence: EvidencePack, id: string): Scenario;
export function pickTemplateForSkill(skillId: string, attempts: ScenarioAttempt[], memory: LearningMemory): ExerciseTemplate;
// mastery.ts
export function computeMastery(input: { userId: string; skillId: string; attempts: ScenarioAttempt[]; kcResults: KnowledgeCheckResult[]; reviews: Review[]; now: Date; previous: MasteryRecord | null }): MasteryRecord;
// spaced-review.ts
export function scheduleReview(record: MasteryRecord, now: Date): Review | null;    // returns a new pending review when one is due to be created
// memory.ts
export interface LearningMemory { weakSkillIds: string[]; recurringMisconceptions: Array<{ misconceptionId: string; count: number; lastSeenAt: string }>; understoodSkillIds: string[]; preferredStyle: LearningStyle; recentScores: number[] }
export function buildMemory(input: { profile: Profile; mastery: MasteryRecord[]; attempts: ScenarioAttempt[]; kcResults: KnowledgeCheckResult[] }): LearningMemory;
// orderbook-exercises.ts
export function listOrderBookExercises(): OrderBookExercise[];
export function gradeOrderBookExercise(exercise: OrderBookExercise, books: Record<string, OrderBookSnapshot>, answers: Record<string, string | number>): { score: number; results: OrderBookExerciseSubmitResponse["results"] };
// lib/ai/coach.ts
export async function startCoachSession(input: { userId: string; skillId: string; memory: LearningMemory; evidence: EvidencePack }): Promise<CoachSession>;
export async function coachRespond(session: CoachSession, learnerMessage: string, ctx: { memory: LearningMemory; evidence: EvidencePack }): Promise<CoachSession>;
export function coachHint(session: CoachSession): CoachSession;
// lib/ai/evaluators/evaluate.ts
export async function evaluateAttempt(input: { scenario: Scenario; answer: string; hintsUsed: number; memory: LearningMemory }): Promise<Evaluation>;
```

## Changes after the build (lead)

- `ScenarioAttempt.templateId` (optional, always set by the attempt route): scenario ids are opaque uuids, so the learning engine reads the template from the attempt.
- `/api/scenarios/next` never returns a scenario the learner has already answered; "distinct scenarios" for mastery and mission selection are counted by scenario id.
- `scheduleReview(record, now, existing?)` takes the skill's reviews as an optional third argument.
- Auth routes: `POST /api/auth/signup|login|logout` (local mode returns `{ mode: "local", redirectTo }`).
- Production refuses local mode unless `ALLOW_LOCAL_MODE=true`.

## Wave 2: SoDEX Wealth, Rewards, ANT markets, practice portfolio (frozen 2026-11-27)

Types: `lib/types/wealth.ts`. Real captured responses: `lib/market-data/__fixtures__/sodex/{wealth-*,rewards-*,mainnet-perps-*,mainnet-spot-*vANT*}.json`. Docs: https://docs.sodex.com/for-developers/developers/wealth.md, .../rewards.md (append `.md` to any docs page).

**Hard rule: wallet-free and read-only.** Only public GETs: `/api/v1/wealth/funds`, `/wealth/funds/{id}`, `/wealth/markets`, `/wealth/funds/{id}/price-history`, `/wealth/funds/{id}/dca-history`, `/api/v1/sopoints/volume-weights`, `/sopoints/week/info`, `/api/v1/lottery/meta`, `/lottery/feed`, `/api/v1/{spot|perps}/markets/*`. Never auth/nonce/verify, deposits, redemptions, RFQ, orders, claims, signatures.

**Units:** wealth `/markets` changePct/roi*/apy* are already percent; `/dca-history` returnRate is a FRACTION (×100). Normalised types are always percent.

### Market ids
Spot: `vBTC_vUSDC`, `vETH_vUSDC`, `vANT_vUSDC`. Perps: `perps:ANT-USD` (UI label "ANT-USD perpetual"). `OrderBookService.get(market)` accepts both.

### Evidence tokens (ExerciseTemplate.evidenceRequirements)
Existing tokens plus:
```
orderbook:vANT_vUSDC         orderbook:perps:ANT-USD
wealth:board                 (all funds + quotes)
wealth:fund:<fundId>         (fund + quote, e.g. wealth:fund:antb)
wealth:price:<fundId>:<range> (e.g. wealth:price:vQQQ:3M)
wealth:dca:<fundId>:<range>  (e.g. wealth:dca:vVOO:1Y)
rewards:incentives           rewards:feed
```

### New skills (module `wealth`, sequence 7, prerequisites `etf`, `indexes`)
```
wealth.fund-types        wealth.nav-vs-price      wealth.fees
wealth.yield-apy         wealth.dca               wealth.diversification
wealth.incentives        (how trading rewards / points multipliers distort volume)
```
New skills in existing modules: `markets.trading-hours` (module markets), `orderbook.spot-vs-perps` (module orderbook), `indexes.index-nav` (module indexes).

New misconceptions (min): `past-return-predicts`, `apy-is-guaranteed`, `nav-equals-price`, `dca-always-wins`, `incentive-volume-is-demand`, `feed-shows-typical-reward`, `more-funds-is-diversified`, `fees-dont-matter`, `perps-price-is-spot-price`, `stale-price-is-current`.

### Routes (new)
```
GET  /api/market/wealth                         WealthBoardResponse           public, rate-limited
GET  /api/market/wealth/[fundId]                WealthFundResponse            public
GET  /api/market/wealth/[fundId]/prices?range=  WealthPriceHistoryResponse    public (range 1W|1M|3M|1Y)
GET  /api/market/wealth/[fundId]/dca?range=     WealthDcaResponse             public (range 3M|6M|1Y)
GET  /api/market/rewards                        RewardsResponse               public
GET  /api/market/orderbook?market=perps:ANT-USD (existing route, now accepts perps ids)
GET  /api/portfolio                             PortfolioResponse[]           learner
POST /api/portfolio                             PortfolioUpsertRequest -> PortfolioResponse   learner (create)
PUT  /api/portfolio/[id]                        PortfolioUpsertRequest -> PortfolioResponse   learner
POST /api/portfolio/[id]/review                 -> PortfolioReviewResponse   learner (grades rationale)
```
Portfolio validation: 1–8 holdings, unique known fundIds, integer weights 1..100 summing to 100, rationale 40..4000 chars, name 1..80.

### Services (new; owners in AGENT_OWNERSHIP)
```ts
// lib/market-data (backend)
WealthDataService: getBoard(): {funds,quotes}; getFund(id); getPriceHistory(id, range); getDca(id, range)
RewardsDataService: getIncentives(): RewardsIncentives; getFeed(): RewardFeed
OrderBookService.get("perps:ANT-USD") supported
buildEvidencePack(requirements) understands the new tokens
// lib/learning (AI/learning)
analysePortfolio(portfolio, ctx: { funds: WealthFund[]; quotes: WealthQuote[]; dca: DcaSimulation[] }): PortfolioAnalysis   // pure, deterministic
portfolioScenario(portfolio, analysis, evidence: EvidencePack, id): Scenario   // wraps template "ex.wealth.portfolio-review" so evaluateAttempt grades the rationale
// orderbook exercise kind "spot-vs-perps" added to OrderBookExerciseKind usage (string literal union widened)
```
TTLs: wealth board 60 s, fund detail 10 min, price history 30 min, dca 6 h, rewards incentives 10 min, feed 5 min, perps book 15 s.

### Screens (new)
`/app/wealth` (Wealth lab: fund board, fund detail drawer with price chart + DCA chart, market status, provenance), `/app/portfolio` (practice portfolio builder + analysis + graded rationale), Order book gym gains ANT spot + ANT-USD perpetual and the spot-vs-perps exercise, scenario lab renders wealth/rewards evidence cards. Nav adds "Wealth lab" and "Practice portfolio".
