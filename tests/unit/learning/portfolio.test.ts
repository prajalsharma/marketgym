import { describe, expect, it } from "vitest";
import { analysePortfolio, describePortfolioAnalysis, portfolioScenario, themeForFund } from "@/lib/learning/portfolio";
import { evaluateWithRules } from "@/lib/ai/evaluators/rules";
import type { PortfolioAnalysis } from "@/lib/types/wealth";
import { dcaQqq, dcaVoo, makePortfolio, makeWealthPack, wealthFunds, wealthQuotes } from "./wealth-fixtures";

const ctx = { funds: wealthFunds, quotes: wealthQuotes, dca: [dcaVoo, dcaQqq] };
const roi1Y = (id: string) => wealthQuotes.find((q) => q.fundId === id)?.roi1YPct ?? NaN;

interface Row {
  name: string;
  holdings: Array<[string, number]>;
  expect: Partial<Pick<PortfolioAnalysis, "concentrationHhi" | "effectiveHoldings" | "largestWeightPct" | "marketHoursSharePct" | "weightedMgmtFeePct" | "weightedRoi1YPct" | "weightedDcaReturn1YPct">>;
  flags: RegExp[];
  noFlags?: RegExp[];
}

const rows: Row[] = [
  {
    name: "tech-heavy: one fund over half, shared theme, fees and returns partly missing",
    holdings: [["vQQQ", 60], ["vVGT", 20], ["Morpho-Earn", 20]],
    expect: { concentrationHhi: 4400, effectiveHoldings: 2.27, largestWeightPct: 60, marketHoursSharePct: 80, weightedMgmtFeePct: null, weightedRoi1YPct: null, weightedDcaReturn1YPct: null },
    flags: [/More than half your weight \(60%\) is in one fund, vQQQ/, /80% of your weight is in 2 funds that share one theme \(US large-cap tech: vQQQ and vVGT\)/, /Management fees are not published for vQQQ, vVGT and Morpho-Earn\. The weighted fee is unknown, not zero\./, /1-year return is missing for Morpho-Earn/, /No 1-year DCA simulation is available for vVGT and Morpho-Earn/],
    noFlags: [/All of your weight follows stock-market/],
  },
  {
    name: "two market-hours ETFs at 50/50: weighted 1Y ROI and DCA computed in percent",
    holdings: [["vVOO", 50], ["vQQQ", 50]],
    expect: {
      concentrationHhi: 5000,
      effectiveHoldings: 2,
      largestWeightPct: 50,
      marketHoursSharePct: 100,
      weightedMgmtFeePct: null,
      weightedRoi1YPct: Math.round(((roi1Y("vVOO") + roi1Y("vQQQ")) / 2) * 100) / 100,
      weightedDcaReturn1YPct: Math.round((((dcaVoo.totalReturnPct ?? 0) + (dcaQqq.totalReturnPct ?? 0)) / 2) * 100) / 100,
    },
    flags: [/All of your weight follows stock-market trading hours/],
    noFlags: [/More than half/, /share one theme/],
  },
  {
    name: "single escrow vault with a published zero fee: fee is 0, not null",
    holdings: [["CXMT", 100]],
    expect: { concentrationHhi: 10000, effectiveHoldings: 1, largestWeightPct: 100, marketHoursSharePct: 100, weightedMgmtFeePct: 0, weightedRoi1YPct: null },
    flags: [/More than half your weight \(100%\)/, /All of your weight follows stock-market/],
    noFlags: [/Management fees are not published/],
  },
  {
    name: "four equal funds, index and yield vault count as 24/7",
    holdings: [["antb", 25], ["Morpho-Earn", 25], ["vVOO", 25], ["vBOXX", 25]],
    expect: { concentrationHhi: 2500, effectiveHoldings: 4, largestWeightPct: 25, marketHoursSharePct: 50 },
    flags: [/Management fees are not published/],
    noFlags: [/More than half/, /share one theme/, /All of your weight/],
  },
  {
    name: "unknown fund id is named, never guessed",
    holdings: [["vVOO", 70], ["NOT-A-FUND", 30]],
    expect: { concentrationHhi: 5800, largestWeightPct: 70, marketHoursSharePct: 70, weightedRoi1YPct: null },
    flags: [/No fund data was found for NOT-A-FUND/],
  },
];

describe("analysePortfolio (table)", () => {
  for (const row of rows) {
    it(row.name, () => {
      const a = analysePortfolio(makePortfolio(row.holdings), ctx);
      expect(a).toMatchObject(row.expect);
      const all = a.flags.join(" | ");
      for (const re of row.flags) expect(all).toMatch(re);
      for (const re of row.noFlags ?? []) expect(all).not.toMatch(re);
    });
  }

  it("is deterministic and pure: same input, same output, inputs untouched", () => {
    const p = makePortfolio([["vQQQ", 40], ["vSMH", 30], ["antb", 30]]);
    const before = JSON.stringify(p);
    expect(analysePortfolio(p, ctx)).toEqual(analysePortfolio(p, ctx));
    expect(JSON.stringify(p)).toBe(before);
  });

  it("evidenceAsOf is the oldest provenance time used and provenance is listed", () => {
    const a = analysePortfolio(makePortfolio([["vQQQ", 60], ["vVGT", 20], ["Morpho-Earn", 20]]), ctx);
    // Morpho-Earn's NAV is stamped 08:00, older than every quote (09:49:58)
    expect(a.evidenceAsOf).toBe("2026-11-27T08:00:00Z");
    expect(a.provenance.length).toBeGreaterThan(0);
    expect(a.provenance.every((p) => p.provider === "sodex-wealth")).toBe(true);
  });

  it("DCA returns are percent (the API's fraction ×100), and ROI is already percent", () => {
    expect(dcaQqq.totalReturnPct).toBeCloseTo(-2.087, 2);
    const a = analysePortfolio(makePortfolio([["vQQQ", 100]]), ctx);
    expect(a.weightedDcaReturn1YPct).toBe(-2.09);
    expect(a.weightedRoi1YPct).toBe(5.77);
  });

  it("an empty portfolio says so instead of inventing numbers", () => {
    const a = analysePortfolio(makePortfolio([]), ctx);
    expect(a.concentrationHhi).toBe(0);
    expect(a.flags[0]).toMatch(/no holdings/);
  });

  it("themes come from a fixed map or the fund type, never invented", () => {
    expect(themeForFund("vSMH", "clob")).toBe("US large-cap tech");
    expect(themeForFund("NEWFUND", "bridged_vault")).toBe("yield vault");
    expect(themeForFund("NEWFUND", null)).toBe("unknown");
  });
});

describe("portfolioScenario", () => {
  const portfolio = makePortfolio([["vVOO", 50], ["vQQQ", 50]]);
  const analysis = analysePortfolio(portfolio, ctx);
  const pack = makeWealthPack();
  const scenario = portfolioScenario(portfolio, analysis, pack, "scn-portfolio-1");

  it("wraps template ex.wealth.portfolio-review with the frozen pack and four questions", () => {
    expect(scenario.id).toBe("scn-portfolio-1");
    expect(scenario.templateId).toBe("ex.wealth.portfolio-review");
    expect(scenario.questions).toHaveLength(4);
    expect(scenario.questions[0].prompt).toMatch(/why/i);
    expect(scenario.evidence).toBe(pack);
    expect(scenario.rubric.dimensions.map((d) => d.maxPoints)).toEqual([35, 25, 25, 15]);
    expect(scenario.skillIds).toContain("wealth.diversification");
  });

  it("the description carries the computed numbers and never the learner's portfolio name", () => {
    expect(scenario.description).toContain("Portfolio analysis:");
    expect(scenario.description).toContain("HHI 5000");
    expect(scenario.description).toContain("about 2.00 effective holdings");
    expect(scenario.description).toContain("Market-hours share 100%");
    expect(scenario.description).toContain(`return on the board: +${analysis.weightedRoi1YPct?.toFixed(2)}%`);
    expect(scenario.description).toContain(`DCA simulation return: ${analysis.weightedDcaReturn1YPct?.toFixed(2)}%`);
    expect(scenario.description).toContain("Weighted management fee: unknown");
    expect(scenario.description).not.toContain(portfolio.name);
    expect(describePortfolioAnalysis(portfolio, analysis, wealthFunds)).toMatch(/vQQQ 50% \(Tokenised ETF\)/);
  });

  it("evaluateAttempt's rules pass credits a rationale that quotes the analysis numbers", () => {
    const quoting =
      "I split vVOO and vQQQ 50/50. The analysis shows HHI 5000, so about 2 effective holdings, and a market-hours share of 100%, which means every price I see outside US hours is a last price. The weighted 1-year return is " +
      `${analysis.weightedRoi1YPct?.toFixed(2)}% and the DCA simulation gave ${analysis.weightedDcaReturn1YPct?.toFixed(2)}%, but past simulated returns do not predict future returns. The fees are unknown, which is not the same as zero. I would change the weights if the two funds keep moving together, because correlated funds are not diversification.`;
    const vague = "I picked these because they are good funds and they will go up.";
    const good = evaluateWithRules({ scenario, answer: quoting });
    const bad = evaluateWithRules({ scenario, answer: vague });
    expect(good.evidenceReferences).toEqual(expect.arrayContaining(["figure:portfolio HHI", "figure:portfolio market-hours share %", "asset:vVOO", "asset:vQQQ"]));
    expect(good.rubricScores.evidence).toBeGreaterThanOrEqual(19);
    expect(good.rubricScores.evidence).toBeGreaterThan(bad.rubricScores.evidence);
  });
});
