/**
 * Acceptance test 8: when external APIs are unavailable (here: DEMO_MODE=true,
 * which never calls a provider) every market card is labelled demo and nothing
 * claims to be live. Also checks the API contract: provenance.kind === "demo"
 * on every item of every /api/market/* route.
 *
 * Expected selectors: market-card, data-source-tag.
 */
import { test, expect } from "@playwright/test";
import { ROUTES, TID, dataSourceTags, ensureOnboarded, getScenarioId, gotoFirst } from "./helpers";

const MARKET_ROUTES = [
  "/api/market/snapshot?assets=BTC,ETH",
  "/api/market/news?limit=5",
  "/api/market/etf?asset=BTC",
  "/api/market/indexes",
  "/api/market/orderbook?market=vBTC_vUSDC&limit=20",
];

function collectProvenance(value: unknown, out: Array<{ kind: string; provider: string }>): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const v of value) collectProvenance(v, out);
    return;
  }
  const obj = value as Record<string, unknown>;
  if (obj.provenance && typeof obj.provenance === "object") {
    const p = obj.provenance as { kind: string; provider: string };
    out.push({ kind: p.kind, provider: p.provider });
  }
  for (const v of Object.values(obj)) if (v && typeof v === "object") collectProvenance(v, out);
}

test("API: every /api/market/* item is provenance.kind=demo under DEMO_MODE", async ({ request }) => {
  for (const route of MARKET_ROUTES) {
    const res = await request.get(route);
    expect(res.status(), route).toBe(200);
    const body = (await res.json()) as { ok: boolean; data: unknown };
    expect(body.ok, route).toBe(true);
    const prov: Array<{ kind: string; provider: string }> = [];
    collectProvenance(body.data, prov);
    expect(prov.length, `${route} carries provenance`).toBeGreaterThan(0);
    for (const p of prov) {
      expect(p.kind, `${route} provenance.kind`).toBe("demo");
      expect(p.provider, `${route} provenance.provider`).toBe("fixture");
    }
  }
});

test("UI: every data card in the scenario lab and the gym is labelled demo and never live", async ({ page }) => {
  test.setTimeout(120_000);
  await ensureOnboarded(page);
  const scenarioId = await getScenarioId(page);
  for (const target of [ROUTES.scenario(scenarioId), ROUTES.orderbookGym]) {
    await gotoFirst(page, target);
    const tags = dataSourceTags(page);
    await expect(tags.first()).toBeVisible({ timeout: 30_000 });
    const count = await tags.count();
    for (let i = 0; i < count; i++) {
      const text = (await tags.nth(i).innerText()).toLowerCase();
      expect(text, `${target} tag ${i}`).toMatch(/demo/);
      expect(text, `${target} tag ${i}`).not.toMatch(/\blive\b/);
    }
    const cards = page.getByTestId(TID.marketCard);
    for (let i = 0; i < (await cards.count()); i++) await expect(cards.nth(i).getByText(/demo/i).first()).toBeVisible();
    // No visible element claims live data anywhere on the page.
    const claims = await page.getByText(/\blive\b/i).allInnerTexts();
    expect(claims, `${target}: copy claiming 'live' while every tag is demo`).toEqual([]);
  }
});
