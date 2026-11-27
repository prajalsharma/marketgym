/**
 * Practice (paper) portfolio orchestration for /api/portfolio routes.
 * Educational only: no funds, no wallet, read-only public SoDEX Wealth data.
 *
 *  - writes validate holdings against the live (or clearly-labelled demo)
 *    Wealth board: unknown fund ids → 400;
 *  - analysis is the deterministic analysePortfolio() over board + 1Y DCA;
 *  - review freezes an EvidencePack (wealth:board + wealth:dca:<id>:1Y),
 *    wraps it in the portfolio-review scenario and grades the rationale with
 *    the standard evaluator; mastery is recomputed from stored records.
 */
import { evaluateAttempt } from "@/lib/ai/evaluators/evaluate";
import type { AuthUser } from "@/lib/auth/session";
import type { Repository } from "@/lib/db";
import { analysePortfolio, portfolioScenario } from "@/lib/learning/portfolio";
import { buildEvidencePack, getMarketServices } from "@/lib/market-data";
import type { DcaSimulation, PaperPortfolio, PortfolioAnalysis, PortfolioResponse, PortfolioReviewResponse, PortfolioUpsertRequest, ScenarioAttempt } from "@/lib/types";
import { ApiError, newId } from "./api";
import { loadLearnerState, logActivity, nextMissionFor, recomputeMastery } from "./learner";
import { portfolioIdSchema } from "./validation";

type WealthBoard = Awaited<ReturnType<ReturnType<typeof getMarketServices>["wealth"]["getBoard"]>>;

/** Route param → portfolio id; anything that is not a uuid is simply not found. */
export function parsePortfolioId(id: string): string {
  const parsed = portfolioIdSchema.safeParse(id);
  if (!parsed.success) throw new ApiError("not_found", "Portfolio not found.");
  return parsed.data;
}

/** 400 when any holding is not a fund listed on the Wealth board. */
export function assertKnownFunds(holdings: PortfolioUpsertRequest["holdings"], board: WealthBoard): void {
  const known = new Set(board.funds.map((f) => f.fundId));
  const unknown = holdings.map((h) => h.fundId).filter((id) => !known.has(id));
  if (unknown.length > 0) {
    throw new ApiError(
      "validation_error",
      `Not on the SoDEX Wealth board: ${unknown.join(", ")}.`,
      unknown.map((id) => ({ path: "holdings", message: `Unknown fund ${id}` })),
    );
  }
}

async function dcaFor(fundIds: string[], knownIds: Set<string>): Promise<DcaSimulation[]> {
  const wealth = getMarketServices().wealth;
  const sims = await Promise.all(
    fundIds
      .filter((id) => knownIds.has(id))
      .map((id) =>
        wealth.getDca(id, "1Y").catch((err: unknown) => {
          // analysis keeps missing data as null and names it in a flag; never fail the request on it
          console.warn(`[portfolio] dca ${id} unavailable: ${err instanceof Error ? err.message : String(err)}`);
          return null;
        }),
      ),
  );
  return sims.filter((d): d is DcaSimulation => d !== null);
}

export async function analyse(portfolio: PaperPortfolio, board?: WealthBoard): Promise<PortfolioAnalysis> {
  const b = board ?? (await getMarketServices().wealth.getBoard());
  const dca = await dcaFor(
    portfolio.holdings.map((h) => h.fundId),
    new Set(b.funds.map((f) => f.fundId)),
  );
  return analysePortfolio(portfolio, { funds: b.funds, quotes: b.quotes, dca });
}

export async function listPortfolioResponses(repo: Repository, user: AuthUser): Promise<PortfolioResponse[]> {
  const portfolios = await repo.listPortfolios(user.id);
  if (portfolios.length === 0) return [];
  const board = await getMarketServices().wealth.getBoard();
  return Promise.all(portfolios.map(async (portfolio) => ({ portfolio, analysis: await analyse(portfolio, board) })));
}

/** Create (no existing) or update (existing, already ownership-checked) a portfolio. */
export async function upsertPortfolio(repo: Repository, user: AuthUser, input: PortfolioUpsertRequest, existing: PaperPortfolio | null, now = new Date()): Promise<PortfolioResponse> {
  const board = await getMarketServices().wealth.getBoard();
  assertKnownFunds(input.holdings, board);
  const iso = now.toISOString();
  const portfolio: PaperPortfolio = {
    id: existing?.id ?? newId(),
    userId: user.id,
    name: input.name,
    holdings: input.holdings.map((h) => ({ fundId: h.fundId, weightPct: h.weightPct })),
    strategy: input.strategy,
    rationale: input.rationale,
    createdAt: existing?.createdAt ?? iso,
    updatedAt: iso,
  };
  const saved = await repo.savePortfolio(portfolio);
  return { portfolio: saved, analysis: await analyse(saved, board) };
}

export async function getOwnedPortfolio(repo: Repository, user: AuthUser, rawId: string): Promise<PaperPortfolio> {
  const portfolio = await repo.getPortfolio(user.id, parsePortfolioId(rawId));
  if (!portfolio) throw new ApiError("not_found", "Portfolio not found.");
  return portfolio;
}

export async function reviewPortfolio(repo: Repository, user: AuthUser, portfolio: PaperPortfolio, now = new Date()): Promise<PortfolioReviewResponse> {
  // freeze the evidence first; analysis and grading both read the same frozen pack
  const evidence = await buildEvidencePack(["wealth:board", ...portfolio.holdings.map((h) => `wealth:dca:${h.fundId}:1Y`)]);
  const analysis = analysePortfolio(portfolio, {
    funds: evidence.wealthFunds ?? [],
    quotes: evidence.wealthQuotes ?? [],
    dca: evidence.dcaSimulations ?? [],
  });
  const scenario = await repo.saveScenario(portfolioScenario(portfolio, analysis, evidence, newId()));

  const state = await loadLearnerState(repo, user);
  // the LLM (if any) only grades; it never touches the repository
  const evaluation = await evaluateAttempt({ scenario, answer: portfolio.rationale, hintsUsed: 0, memory: state.memory });

  const attempt: ScenarioAttempt = {
    id: newId(),
    userId: user.id,
    scenarioId: scenario.id,
    templateId: scenario.templateId,
    skillIds: scenario.skillIds,
    submittedAnswer: portfolio.rationale,
    hintsUsed: 0,
    evaluation,
    createdAt: now.toISOString(),
  };
  const saved = await repo.saveAttempt(attempt);
  const masteryUpdates = await recomputeMastery(repo, user.id, scenario.skillIds, now);

  await logActivity(
    repo,
    user.id,
    {
      kind: "portfolio",
      skillIds: scenario.skillIds,
      summary: `Practice portfolio review: rationale scored ${Math.round(evaluation.totalScore)}/100 (${evaluation.evaluatorMode}).`,
      score: evaluation.totalScore,
      refId: portfolio.id,
    },
    now,
  );

  const after = await loadLearnerState(repo, user);
  return { portfolio, analysis, attempt: saved, evaluation, masteryUpdates, nextMission: nextMissionFor(after) };
}
