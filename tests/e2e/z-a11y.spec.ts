/**
 * Accessibility (axe-core) on the four key pages: landing, dashboard, scenario
 * lab, order-book gym. Fails only on serious/critical; everything else is
 * attached to the report as `axe-<page>` and printed. Kept separate from the
 * flow specs so an a11y regression does not mask a functional one.
 */
import { test } from "@playwright/test";
import { ROUTES, checkA11y, ensureOnboarded, getScenarioId, gotoFirst } from "./helpers";

test("axe: landing", async ({ page }, testInfo) => {
  await page.goto(ROUTES.landing);
  await checkA11y(page, testInfo, "landing");
});

test("axe: dashboard, scenario lab, order-book gym", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await ensureOnboarded(page);
  await page.goto(ROUTES.dashboard);
  await checkA11y(page, testInfo, "dashboard");
  const id = await getScenarioId(page);
  await gotoFirst(page, ROUTES.scenario(id));
  await checkA11y(page, testInfo, "scenario-lab");
  await gotoFirst(page, ROUTES.orderbookGym);
  await checkA11y(page, testInfo, "orderbook-gym");
});
