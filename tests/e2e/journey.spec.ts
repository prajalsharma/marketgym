/**
 * Acceptance tests 1, 2, 4, 5 (visible effect), 11 (runs under desktop + mobile
 * projects) and 6 (axe on landing, dashboard, scenario lab).
 *
 * Journey: landing → /signup (local mode continue) → onboarding (profile, goal,
 * style, diagnostic answers) → dashboard shows next mission → scenario lab →
 * evidence cards carry a DataSourceTag (demo|live|cached) → submit ≥60-word
 * answer citing evidence → evaluation shows total + four rubric rows →
 * progress page lists the attempt.
 *
 * Expected selectors (data-testid suggestions in tests/e2e/helpers.ts TID):
 *   next-mission, evidence-card, data-source-tag, attempt-answer,
 *   attempt-submit, evaluation-total, evaluation-dimension, attempt-row.
 */
import { test, expect } from "@playwright/test";
import {
  ROUTES,
  TID,
  LONG_ANSWER,
  checkA11y,
  completeOnboarding,
  enterViaSignup,
  getScenarioId,
  gotoFirst,
  tidOr,
} from "./helpers";

test.describe.configure({ mode: "serial" });

test("1+2: sign up (local mode), onboarding with diagnostic, dashboard shows next mission", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await page.goto(ROUTES.landing);
  await checkA11y(page, testInfo, "landing");

  await enterViaSignup(page);
  const { answers, steps } = await completeOnboarding(page);
  testInfo.annotations.push({ type: "onboarding", description: `${steps} steps, ${answers} answers` });
  // Brief: 5 onboarding steps incl. 7 diagnostic answers. The diagnostic serves 6–8
  // questions (CONTRACTS.md); require at least 6 answered.
  expect(answers, "diagnostic answers given").toBeGreaterThanOrEqual(6);

  // Starting point: the diagnostic result must have been persisted with a next mission.
  const next = await page.request.get("/api/learning/next");
  expect(next.ok()).toBeTruthy();
  const mission = (await next.json()) as { ok: boolean; data: { title: string; href: string; reason: string } };
  expect(mission.ok).toBe(true);
  expect(mission.data.href).toMatch(/^\/app\//);

  // Dashboard shows actual path, prerequisites and the next mission.
  await page.goto(ROUTES.dashboard);
  // NextMissionCard: <section aria-labelledby> with an "Up next" heading, title, reason, Start link.
  const missionCard = tidOr(page, TID.nextMission, page.getByRole("region", { name: /up next|next mission/i })).first();
  await expect(missionCard).toBeVisible();
  await expect(missionCard.getByText(mission.data.title, { exact: false }).first()).toBeVisible();
  await expect(missionCard.getByRole("link", { name: /start/i })).toHaveAttribute("href", mission.data.href);
  // Path: module list ("Your track") with locked prerequisites.
  await expect(page.getByText(/your track|learning path/i).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /order book/i }).first()).toBeVisible();
  await expect(page.getByText(/\blocked\b/i).first()).toBeVisible();
  await checkA11y(page, testInfo, "dashboard");
});

test("4+5: scenario lab — evidence with provenance, structured feedback, progress shows attempt", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  // Depends on the previous test having onboarded the local learner (serial mode).
  const scenarioId = await getScenarioId(page);
  await gotoFirst(page, ROUTES.scenario(scenarioId));

  // Evidence column (<section aria-labelledby="evidence-heading">) + DataSourceTag text "Demo data | Live | Cached".
  const evidence = tidOr(page, TID.evidenceCard, page.getByRole("region", { name: /evidence/i })).first();
  await expect(evidence).toBeVisible();
  const tags = tidOr(page, TID.dataSourceTag, page.getByText(/\b(demo data|live|cached)\b/i));
  expect(await tags.count(), "DataSourceTag count").toBeGreaterThan(0);
  const tagText = (await tags.first().innerText()).toLowerCase();
  expect(tagText).toMatch(/demo|live|cached/);
  // Under DEMO_MODE the tag must say demo and never live.
  expect(tagText).not.toMatch(/\blive\b/);
  expect(tagText).toMatch(/demo/);

  await checkA11y(page, testInfo, "scenario-lab");

  // Submit a ≥60-word answer that cites evidence.
  expect(LONG_ANSWER.split(/\s+/).length).toBeGreaterThanOrEqual(60);
  const answer = tidOr(page, TID.attemptAnswer, page.getByRole("textbox", { name: /answer all questions|answer/i })).last();
  await answer.fill(LONG_ANSWER);
  const submit = tidOr(page, TID.attemptSubmit, page.getByRole("button", { name: /submit for grading|submit/i })).first();
  await expect(submit).toBeEnabled();
  await submit.click();

  // Evaluation panel: ScoreRing (role=img "...: NN out of 100") + four rubric progress bars.
  const total = tidOr(page, TID.evaluationTotal, page.getByRole("img", { name: /out of 100/i })).first();
  await expect(total).toBeVisible({ timeout: 30_000 });
  const totalName = (await total.getAttribute("aria-label")) ?? (await total.innerText());
  expect(totalName).toMatch(/\d{1,3}/);
  for (const dim of [/factual/i, /evidence/i, /reasoning/i, /uncertainty/i]) {
    await expect(page.getByRole("progressbar", { name: dim }).first(), `rubric row ${dim}`).toBeVisible();
  }
  const dimRows = page.getByTestId(TID.evaluationDimension);
  if (await dimRows.count()) expect(await dimRows.count()).toBe(4);
  // Evaluator mode must be disclosed when no model key (DEMO_MODE=true ⇒ rules only).
  await expect(page.getByText(/rules only|rule-based|offline/i).first()).toBeVisible();

  // Attempt persisted via API contract.
  const attempts = await page.request.get("/api/progress/attempts");
  expect(attempts.ok()).toBeTruthy();
  const list = (await attempts.json()) as { ok: boolean; data: Array<{ scenarioId: string }> };
  expect(list.data.some((a) => a.scenarioId === scenarioId)).toBe(true);

  // Progress page shows the attempt.
  await page.goto(ROUTES.progress);
  // "Assessment history" table: one row per attempt, linking back to the scenario.
  const row = tidOr(page, TID.attemptRow, page.getByRole("row").filter({ has: page.getByRole("link", { name: /.+/ }) })).first();
  await expect(row).toBeVisible();
  await expect(page.getByRole("link", { name: /.+/ }).filter({ hasText: /./ }).locator(`[href$="${scenarioId}"]`).or(page.locator(`a[href$="${scenarioId}"]`)).first()).toBeVisible();
});
