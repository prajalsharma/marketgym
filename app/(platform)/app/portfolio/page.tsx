import type { Metadata } from "next";
import type { LearningPathResponse, PortfolioResponse, WealthBoardResponse } from "@/lib/types/api";
import { PageHeader } from "@/components/ui";
import type { MisconceptionLookup } from "@/components/scenario/evaluation-panel";
import { PortfolioWorkspace } from "@/components/portfolio/portfolio-workspace";
import { RetryError } from "@/components/shared/retry-error";
import { load } from "@/lib/client/server-api";
import { describeError } from "@/lib/client/api";

export const metadata: Metadata = { title: "Practice portfolio" };

export default async function PracticePortfolioPage(props: PageProps<"/app/portfolio">) {
  const sp = await props.searchParams;
  const addFundId = typeof sp.add === "string" ? sp.add : undefined;
  const openId = typeof sp.id === "string" ? sp.id : undefined;
  const [board, saved, path] = await Promise.all([
    load<WealthBoardResponse>("/api/market/wealth"),
    load<PortfolioResponse[]>("/api/portfolio"),
    load<LearningPathResponse>("/api/learning/path"),
  ]);

  const misconceptions: MisconceptionLookup = {};
  const skillNames: Record<string, string> = {};
  if (path.ok) {
    for (const m of path.data.curriculum.misconceptions) misconceptions[m.id] = { label: m.label, correction: m.correction };
    for (const s of path.data.curriculum.skills) skillNames[s.id] = s.name;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Practice portfolio"
        description="Build a mix of SoDEX Wealth funds on paper, explain your reasoning, and get it analysed and graded."
      />
      <p className="rounded-md border border-line-strong bg-surface px-4 py-3 text-sm font-medium">
        Practice only. No money, no wallet. MarketGym never trades or holds funds.
      </p>
      {!board.ok ? (
        <RetryError title="Could not load the fund board" description={describeError(board.error)} />
      ) : !saved.ok ? (
        <RetryError title="Could not load your saved portfolios" description={describeError(saved.error)} />
      ) : (
        <PortfolioWorkspace
          key={`${addFundId ?? ""}|${openId ?? ""}`}
          board={board.data}
          initialPortfolios={saved.data}
          addFundId={addFundId}
          openId={openId}
          misconceptions={misconceptions}
          skillNames={skillNames}
        />
      )}
    </div>
  );
}
