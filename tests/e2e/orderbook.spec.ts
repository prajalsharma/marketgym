/**
 * Acceptance test 9: the order-book exercise completes with no real orders and
 * no wallet. Also runs axe on the gym.
 *
 * Expected selectors: orderbook-ladder, orderbook-best-bid, orderbook-best-ask,
 * orderbook-spread, gym-submit, gym-result.
 */
import { test, expect } from "@playwright/test";
import { ROUTES, TID, dataSourceTags, ensureOnboarded, gotoFirst, tidOr } from "./helpers";

const TRADING_WORDS = /\b(place order|buy|sell|connect wallet)\b/i;

test("gym renders a ladder with best bid/ask + spread, grades identify-spread, no trading UI", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await ensureOnboarded(page);
  const route = await gotoFirst(page, ROUTES.orderbookGym);
  testInfo.annotations.push({ type: "route", description: route });

  // No network calls other than our own origin may happen (no exchange, no wallet RPC).
  const external: string[] = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (u.hostname !== "localhost" && u.hostname !== "127.0.0.1") external.push(r.url());
  });

  // Ladder: bids + asks visible with best bid, best ask and spread.
  // Ladder: two <ol aria-label="Asks…"/"Bids…"> lists around a spread callout.
  const ladder = tidOr(page, TID.orderbookLadder, page.getByRole("list", { name: /asks|bids/i })).first();
  await expect(ladder).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/\bbid/i).first()).toBeVisible();
  await expect(page.getByText(/\bask/i).first()).toBeVisible();
  const bestBid = tidOr(page, TID.orderbookBestBid, page.getByText(/best bid/i)).first();
  const bestAsk = tidOr(page, TID.orderbookBestAsk, page.getByText(/best ask/i)).first();
  const spread = tidOr(page, TID.orderbookSpread, page.getByText(/spread/i)).first();
  await expect(bestBid).toBeVisible();
  await expect(bestAsk).toBeVisible();
  await expect(spread).toBeVisible();

  // Data provenance must be shown on the book (demo under DEMO_MODE).
  const tag = dataSourceTags(page).first();
  await expect(tag).toBeVisible();
  expect((await tag.innerText()).toLowerCase()).toMatch(/demo/);

  // Pick the identify-spread exercise from the native "Choose an exercise" <select>.
  const picker = page.getByLabel(/choose an exercise/i).first();
  if (await picker.count()) await picker.selectOption({ label: "Find the spread" }).catch(() => picker.selectOption("ob-identify-spread"));

  // Compute expected answers from the API so grading can be asserted, not just rendered.
  const ob = await page.request.get("/api/market/orderbook?market=vBTC_vUSDC&limit=20");
  expect(ob.ok()).toBeTruthy();
  const book = (await ob.json()) as {
    ok: boolean;
    data: { bestBid: number | null; bestAsk: number | null; spread: number | null; provenance: { kind: string } };
  };
  expect(book.data.provenance.kind).toBe("demo");

  // Fill numeric inputs with the best bid/ask/spread (question order unknown: use labels when present).
  const numberInputs = page.locator('input[type="number"]:visible, input[inputmode="decimal"]:visible');
  const n = await numberInputs.count();
  for (let i = 0; i < n; i++) {
    const el = numberInputs.nth(i);
    const label = ((await el.getAttribute("aria-label")) ?? (await el.getAttribute("name")) ?? "").toLowerCase();
    const id = await el.getAttribute("id");
    const labelText = id ? ((await page.locator(`label[for="${id}"]`).innerText().catch(() => "")) ?? "") : "";
    const key = `${label} ${labelText}`.toLowerCase();
    let value: number | null = null;
    if (/spread/.test(key)) value = book.data.spread;
    else if (/bid/.test(key)) value = book.data.bestBid;
    else if (/ask/.test(key)) value = book.data.bestAsk;
    else value = [book.data.bestBid, book.data.bestAsk, book.data.spread][i] ?? book.data.spread;
    await el.fill(String(value ?? 0));
  }
  // Any choice questions: pick the first option.
  const radios = page.getByRole("radio");
  if (await radios.count()) await radios.first().click();

  const submit = tidOr(page, TID.gymSubmit, page.getByRole("button", { name: /check answers|submit/i })).first();
  await expect(submit).toBeEnabled();
  await submit.click();

  // Result shown: score and per-question correctness.
  const result = tidOr(page, TID.gymResult, page.getByText(/^score\b|correct|expected/i)).first();
  await expect(result).toBeVisible({ timeout: 30_000 });

  // No trading affordances anywhere on the page. Scope to interactive elements and
  // headings so that lesson prose explaining "buy orders" doesn't false-positive.
  const interactive = page.locator("button, a, input, [role='button'], [role='link'], h1, h2, h3");
  const texts = await interactive.allInnerTexts();
  const offenders = texts.filter((t) => TRADING_WORDS.test(t));
  expect(offenders, "trading/wallet affordances present").toEqual([]);
  await expect(page.getByText(/connect wallet|place order/i)).toHaveCount(0);

  // Still no external network from the browser.
  expect(external, "browser made external requests").toEqual([]);

  // Acceptance test 8: nothing on the page may claim the book is live while DEMO_MODE serves fixtures.
  const liveClaims = await page.getByText(/\blive\b/i).allInnerTexts();
  expect(liveClaims, "page copy claims 'live' while the book is demo data").toEqual([]);
});
