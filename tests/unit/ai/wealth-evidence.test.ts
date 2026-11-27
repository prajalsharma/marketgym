import { describe, expect, it } from "vitest";
import { evaluateWithRules } from "@/lib/ai/evaluators/rules";
import { describeEvidencePack, evidenceIds } from "@/lib/ai/prompts/shared";
import { evaluatePrompt } from "@/lib/ai/prompts/evaluate";
import { evidenceLineForSkill } from "@/lib/ai/coach";
import { getSkill } from "@/lib/curriculum";
import { makeScenario } from "../learning/fixtures";
import { antPerpBook, antSpotBook, makeWealthPack, rewardFeed, rewardIncentives } from "../learning/wealth-fixtures";

const NAV = String(Number("9.6234574440422935"));
const pack = makeWealthPack({ rewardIncentives, rewardFeed, orderBooks: [antSpotBook, antPerpBook] });

describe("prompt evidence renderer: wealth and rewards", () => {
  const text = describeEvidencePack(pack);

  it("renders funds, NAV, quotes, DCA and incentives faithfully with source and time", () => {
    expect(text).toContain("[wealth:fund:antb] ANT Believers Index");
    expect(text).toContain(`NAV ${NAV} per share as of 2026-11-27T09:49:58Z`);
    expect(text).toMatch(/\[wealth:fund:Morpho-Earn\][\s\S]*7-day APY 4\.45% \(annualised from one week\)/);
    expect(text).toContain("1Y ROI +5.77%");
    expect(text).toContain("market status pre-market");
    expect(text).toContain("management fee not published");
    expect(text).toMatch(/\[wealth:dca:vQQQ:1Y\] vQQQ: total return -2\.09%, 25 weekly points from 2025-12-01/);
    expect(text).toContain("ANT-USD (perps) 1.2x");
    expect(text).toContain("one per 10,000 USD of weighted volume, taker volume counts 100%, maker volume counts 20%");
    expect(text).toContain("drop probabilities published: no");
    expect(text).toContain("sodex-wealth, demo, fetched 2026-11-27T09:50:40.000Z");
    expect(text).toContain("[orderbook:perps:ANT-USD] ANT-USD perpetual (read-only; funding not shown)");
  });

  it("keeps the reward feed inside an untrusted block", () => {
    const feedStart = text.indexOf("[rewards:feed]");
    const block = text.slice(feedStart);
    expect(block).toMatch(/<untrusted_content label="rewards:feed">[\s\S]*Rare 198\.85 USD[\s\S]*<\/untrusted_content>/);
  });

  it("lists citable ids for the new fields", () => {
    expect(evidenceIds(pack)).toEqual(expect.arrayContaining(["wealth:fund:antb", "wealth:board", "wealth:dca:vVOO:1Y", "rewards:incentives", "rewards:feed", "orderbook:perps:ANT-USD"]));
  });

  it("the grading prompt carries the scenario description (computed figures)", () => {
    const scenario = makeScenario("ex.wealth.yield-apy", pack);
    const prompt = evaluatePrompt.build({ scenario, answer: "x", allowedMisconceptions: [], rulesSummary: { matchedKeyPoints: [], missingKeyPoints: [], evidenceReferences: [] } });
    expect(prompt).toContain(`Scenario description (computed from the evidence; figures here count as evidence): ${scenario.description}`);
    expect(evaluatePrompt.version).toBe("evaluate-v2");
  });
});

describe("rules evaluator recognises wealth evidence", () => {
  it("counts fund ids, NAV / APY / ROI figures and multipliers", () => {
    const scenario = makeScenario("ex.wealth.yield-apy", pack);
    const answer =
      "Morpho-Earn shows a 7-day APY of 4.45% and a 1-month APY of 5.25%, which is a recent lending rate annualised, not a promise. vQQQ shows a 7-day APY of 2961.82% next to a 1Y ROI of 5.77%, so one week annualised produces a silly number. The yield basis is net excluding rewards. I cannot conclude what next year pays; the rate may change.";
    const r = evaluateWithRules({ scenario, answer });
    expect(r.evidenceReferences).toEqual(expect.arrayContaining(["asset:Morpho-Earn", "asset:vQQQ", "figure:Morpho-Earn 7-day APY %", "figure:Morpho-Earn 1-month APY %", "figure:vQQQ 7-day APY %", "figure:vQQQ 1Y ROI %", "term:apy"]));
    expect(r.rubricScores.evidence).toBeGreaterThanOrEqual(19);
  });

  it("counts points multipliers, box rules and flags the critical incentive misconception", () => {
    const scenario = makeScenario("ex.wealth.incentives", pack);
    const good = evaluateWithRules({ scenario, answer: "ANT-USD carries a 1.2x points multiplier and one reward box per 10,000 USD of volume, with maker volume counted at 20%. That pays people to trade, so volume may not show demand; the feed only lists wins of 50 USD or more, a survivorship sample, and probabilities are not published." });
    expect(good.evidenceReferences).toEqual(expect.arrayContaining(["figure:1.2x points multiplier", "figure:volume per reward box", "figure:maker weight %", "term:multiplier", "term:maker"]));
    const bad = evaluateWithRules({ scenario, answer: "The high volume means people want ANT, and the feed shows people win big rewards on ANT-USD." });
    expect(bad.misconceptionIds).toEqual(expect.arrayContaining(["incentive-volume-is-demand"]));
  });

  it("does not count wealth terms when the pack has no wealth data", () => {
    const scenario = makeScenario("ex.markets.describe-snapshot");
    const r = evaluateWithRules({ scenario, answer: "BTC NAV and APY and the multiplier tell us little about the price of bitcoin today, I think." });
    expect(r.evidenceReferences.filter((x) => /term:(nav|apy|multiplier)/.test(x))).toEqual([]);
  });
});

describe("coach evidence lines for wave 2 skills", () => {
  it("cites real fund, DCA, incentive and perps data", () => {
    const line = (id: string) => evidenceLineForSkill(getSkill(id)!, pack);
    expect(line("wealth.nav-vs-price")).toMatchObject({ citation: "wealth:fund:antb" });
    expect(line("wealth.nav-vs-price")?.text).toContain(`NAV of ${NAV}`);
    expect(line("wealth.dca")?.citation).toBe("wealth:dca:vVOO:1Y");
    expect(line("wealth.incentives")?.text).toMatch(/1\.2x/);
    expect(line("orderbook.spot-vs-perps")?.text).toContain("86.08 / 86.09");
    expect(line("markets.trading-hours")?.text).toMatch(/market status "(closed|pre-market)"/);
  });
});
