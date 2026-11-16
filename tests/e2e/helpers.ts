/**
 * Shared helpers for MarketGym E2E (Playwright, local mode: DEMO_MODE=true,
 * Supabase unset ⇒ single learner `local-demo-user`).
 *
 * Selector strategy: every helper first tries a `data-testid` (listed in
 * docs/TEST_PLAN.md "Suggested test ids"), then falls back to role/text
 * selectors. Frontend can adopt the test ids to make the suite stable; the
 * suite still runs without them.
 *
 * Page routes assumed (align with app/(auth|marketing|platform) once built):
 *   /                     marketing landing
 *   /signup, /login       local-mode notice + "Continue" to onboarding
 *   /app/onboarding       5 steps (profile, goal, style/interests, diagnostic, starting point)
 *   /app                  dashboard: path, prerequisites, next mission
 *   /app/scenarios/[id]   scenario lab
 *   /app/coach            coach
 *   /app/orderbook-gym    Order Book Gym   (fallbacks tried: /app/orderbook, /app/gym)
 *   /app/progress         progress
 */
import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export const ROUTES = {
  landing: "/",
  signup: "/signup",
  login: "/login",
  onboarding: "/app/onboarding",
  dashboard: "/app",
  coach: ["/app/coach"],
  orderbookGym: ["/app/orderbook-gym", "/app/orderbook", "/app/gym"],
  progress: "/app/progress",
  /** frontend ships /app/scenario-lab/[id]; the CONTRACTS-era /app/scenarios/[id] is kept as a fallback */
  scenario: (id: string) => [`/app/scenario-lab/${id}`, `/app/scenarios/${id}`],
} as const;

/** Candidate test ids per concept (first match wins). */
export const TID = {
  localModeContinue: "local-mode-continue",
  onboardingNext: "onboarding-next",
  diagnosticQuestion: "diagnostic-question",
  nextMission: "next-mission",
  evidenceCard: "evidence-card",
  dataSourceTag: "data-source-tag",
  attemptAnswer: "attempt-answer",
  attemptSubmit: "attempt-submit",
  evaluationTotal: "evaluation-total",
  evaluationDimension: "evaluation-dimension",
  coachInput: "coach-input",
  coachSend: "coach-send",
  coachMessage: "coach-message-coach",
  coachModeNotice: "coach-mode-notice",
  orderbookLadder: "orderbook-ladder",
  orderbookBestBid: "orderbook-best-bid",
  orderbookBestAsk: "orderbook-best-ask",
  orderbookSpread: "orderbook-spread",
  gymSubmit: "gym-submit",
  gymResult: "gym-result",
  marketCard: "market-card",
  attemptRow: "attempt-row",
} as const;

/** A locator that prefers a test id but falls back to a role/text locator. */
export function tidOr(page: Page, testId: string, fallback: Locator): Locator {
  return page.getByTestId(testId).or(fallback);
}

/** Navigate to the first candidate route that is not a 404. Returns the route used. */
export async function gotoFirst(page: Page, candidates: readonly string[]): Promise<string> {
  for (const path of candidates) {
    const res = await page.goto(path);
    if (res && res.status() !== 404) return path;
    // Next renders not-found with 404 status; keep trying.
  }
  throw new Error(`None of the routes exist: ${candidates.join(", ")}`);
}

/**
 * Landing → /signup → local-mode "Continue" → onboarding.
 * Local mode: the sign-up page explains there's no account and sends the
 * learner straight to onboarding (docs/CONTRACTS.md "Auth boundary").
 */
export async function enterViaSignup(page: Page): Promise<void> {
  await page.goto(ROUTES.landing);
  await expect(page).toHaveTitle(/marketgym/i);
  // Prefer a real link to /signup; fall back to a direct navigation.
  const signupLink = page.getByRole("link", { name: /sign up|get started|start learning|start free/i }).first();
  if (await signupLink.count()) {
    await signupLink.click();
    await page.waitForURL(/\/(signup|app)/);
  } else {
    await page.goto(ROUTES.signup);
  }
  if (!/\/app/.test(page.url())) {
    await expect(page.getByText(/local mode/i).first()).toBeVisible();
    const cont = tidOr(
      page,
      TID.localModeContinue,
      page.getByRole("button", { name: /continue|start|go to onboarding/i }).or(
        page.getByRole("link", { name: /continue|start|go to onboarding/i }),
      ),
    ).first();
    await cont.click();
    await page.waitForURL(/\/app/);
  }
}

const OPEN_ANSWER =
  "I would compare the 24h volume against the usual range, check whether the price move is backed by liquidity and whether the news is a fact or an opinion before deciding anything.";

/**
 * Fill whatever the current onboarding step shows: text inputs, textareas,
 * radio groups, selects, checkboxes. Returns the number of diagnostic-style
 * questions answered on this step (radio groups + textareas).
 */
async function fillVisibleStep(page: Page, step: number): Promise<number> {
  let answered = 0;
  // Only diagnostic questions count as answers ("Question N of M" is shown on that step).
  const isDiagnostic = (await page.getByText(/Question \d+ of \d+/).count()) > 0;
  // Text inputs (display name etc.)
  const textInputs = page.locator('input[type="text"]:visible, input:not([type]):visible');
  for (let i = 0; i < (await textInputs.count()); i++) {
    const el = textInputs.nth(i);
    if ((await el.inputValue()) === "") await el.fill(`QA Learner ${step}`);
  }
  // Radix RadioGroup renders role=radiogroup with role=radio buttons; native radios also match.
  const groups = page.getByRole("radiogroup");
  const groupCount = await groups.count();
  for (let i = 0; i < groupCount; i++) {
    const radios = groups.nth(i).getByRole("radio");
    if (await radios.count()) {
      const checked = groups.nth(i).locator('[aria-checked="true"], [data-state="checked"], :checked');
      if (!(await checked.count())) await radios.first().click();
      if (isDiagnostic) answered++;
    }
  }
  if (groupCount === 0) {
    const looseRadios = page.getByRole("radio");
    if ((await looseRadios.count()) > 0) {
      await looseRadios.first().click();
      if (isDiagnostic) answered++;
    }
  }
  // Interests: either checkboxes or aria-pressed toggle buttons. Pick the first two.
  const boxes = page.getByRole("checkbox");
  for (let i = 0; i < Math.min(2, await boxes.count()); i++) {
    const b = boxes.nth(i);
    if (!(await b.isChecked().catch(() => false))) await b.click();
  }
  const toggles = page.locator('button[aria-pressed="false"]');
  const pressed = page.locator('button[aria-pressed="true"]');
  if ((await pressed.count()) === 0) {
    for (let i = 0; i < Math.min(2, await toggles.count()); i++) await toggles.nth(i).click();
  }
  // Open diagnostic question(s).
  const areas = page.locator("textarea:visible");
  for (let i = 0; i < (await areas.count()); i++) {
    const a = areas.nth(i);
    if ((await a.inputValue()) === "") await a.fill(OPEN_ANSWER);
    if (isDiagnostic) answered++;
  }
  return answered;
}

/**
 * Drives onboarding to completion. Works for both "one question per screen"
 * and "all questions on one screen" layouts. Resolves with the number of
 * diagnostic-style answers given.
 */
export async function completeOnboarding(page: Page): Promise<{ answers: number; steps: number }> {
  if (!/\/app\/onboarding/.test(page.url())) await page.goto(ROUTES.onboarding);
  let answers = 0;
  let steps = 0;
  for (; steps < 25; steps++) {
    if (!/onboarding/.test(page.url())) break;
    // Wait for any loading skeleton (aria-busy) to clear before reading the step.
    await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0, { timeout: 20_000 });
    // Diagnostic step: questions load after mount; wait for the first one before answering.
    if (await page.locator("main h1").filter({ hasText: /diagnostic/i }).count()) {
      await expect(page.getByText(/Question \d+ of \d+/).first()).toBeVisible({ timeout: 20_000 });
    }
    answers += await fillVisibleStep(page, steps);
    if (process.env.E2E_DEBUG) {
      const h1 = await page.locator("h1").first().innerText().catch(() => "?");
      console.log(`[onboarding] iter=${steps} url=${page.url()} h1=${JSON.stringify(h1)} answers=${answers}`);
    }
    // Scope to <main>: the Next.js dev-tools toggle ("Close Next.js Dev Tools") would otherwise match /next/.
    const main = page.locator("main");
    const next = tidOr(
      page,
      TID.onboardingNext,
      main.getByRole("button", { name: /^(continue|next|finish|submit|see my starting point|start learning|go to dashboard|begin)\b/i }),
    ).first();
    if (await next.count()) {
      await expect(next).toBeEnabled({ timeout: 10_000 });
      await next.click();
    } else {
      // Result step: a "Start" link to the next mission.
      const link = main.getByRole("link", { name: /^(start|go to dashboard|start learning|begin|continue)\b/i }).first();
      if (await link.count()) await link.click();
      else {
        // Submitting (e.g. "Working out your start…"): wait for an enabled control or a navigation.
        await Promise.race([
          main.locator("button:not([disabled]), a[href]").first().waitFor({ state: "visible", timeout: 30_000 }),
          page.waitForURL((u) => !/onboarding/.test(u.pathname), { timeout: 30_000 }),
        ]).catch(() => {
          throw new Error(`Onboarding step ${steps}: no next/submit control found at ${page.url()}`);
        });
      }
    }
    await page.waitForLoadState("networkidle");
  }
  await page.waitForURL((u) => !/onboarding/.test(u.pathname), { timeout: 30_000 });
  return { answers, steps };
}

/** Make sure the demo learner has finished onboarding (idempotent). */
export async function ensureOnboarded(page: Page): Promise<void> {
  const res = await page.request.get("/api/profile");
  if (res.ok()) {
    const body = (await res.json()) as { ok: boolean; data?: { onboardingCompletedAt: string | null } };
    if (body.ok && body.data?.onboardingCompletedAt) return;
  }
  await enterViaSignup(page);
  await completeOnboarding(page);
}

/** Fetch a fresh scenario id for a skill through the frozen API contract. */
export async function getScenarioId(page: Page, skillId = "markets.price"): Promise<string> {
  const res = await page.request.get(`/api/scenarios/next?skillId=${encodeURIComponent(skillId)}`);
  expect(res.ok(), `GET /api/scenarios/next → ${res.status()}`).toBeTruthy();
  const body = (await res.json()) as { ok: boolean; data: { id: string } };
  expect(body.ok).toBe(true);
  return body.data.id;
}

/** ≥ 60 words, cites the evidence kinds a scenario can carry. */
export const LONG_ANSWER = [
  "Looking at the BTC snapshot in the evidence, the price moved while 24h volume stayed close to its recent range,",
  "which suggests the move is not backed by a surge of participation. The ETF flow series shows net inflows,",
  "but one day of flows is not a trend, so I treat that as weak support rather than confirmation.",
  "The news item is a headline with an opinion in it, not a verified fact, so I separate what I observe",
  "(price up, volume flat, bid depth thin in the order book) from my interpretation (a fragile move).",
  "My thesis: modest upside is possible but low liquidity makes it fragile. I would be wrong if volume",
  "expands with the price and the spread tightens; that would invalidate the fragility reading.",
].join(" ");

/**
 * Run axe-core on the current page. Logs every violation to the report;
 * fails only on "serious" / "critical" impact.
 */
export async function checkA11y(page: Page, testInfo: TestInfo, label: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
    .analyze();
  const summary = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.slice(0, 5).map((n) => n.target.join(" ")),
  }));
  await testInfo.attach(`axe-${label}`, {
    body: JSON.stringify(summary, null, 2),
    contentType: "application/json",
  });
  if (summary.length) console.log(`[axe:${label}] ${summary.length} violation(s):`, JSON.stringify(summary));
  const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(
    blocking,
    `axe ${label}: serious/critical violations: ${blocking.map((v) => `${v.id} (${v.impact})`).join(", ")}`,
  ).toEqual([]);
}
