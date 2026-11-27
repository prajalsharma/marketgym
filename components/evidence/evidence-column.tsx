import type { CSSProperties, ReactNode } from "react";
import type { EvidencePack } from "@/lib/types/market";
import { SnapshotCard } from "./snapshot-card";
import { NewsCard } from "./news-card";
import { EtfFlowCard } from "./etf-flow-card";
import { IndexCard } from "./index-card";
import { OrderBookCard } from "./orderbook-card";
import { DcaCard, PriceHistoryCard, RewardFeedCard, RewardsIncentivesCard, WealthFundsEvidence } from "./wealth-cards";
import { formatDateTime } from "@/lib/client/format";
import { cn } from "@/lib/utils";

interface Props {
  pack: EvidencePack;
  /** marks the whole column as a static sample (landing preview) */
  sample?: boolean;
  className?: string;
}

/** Every card the learner can cite. Frozen at scenario creation; no live refresh here. */
export function EvidenceColumn({ pack, sample, className }: Props) {
  const wealthFunds = pack.wealthFunds ?? [];
  const wealthQuotes = pack.wealthQuotes ?? [];
  const wealthPrices = pack.wealthPrices ?? [];
  const dcaSimulations = pack.dcaSimulations ?? [];
  const nameOf = (fundId: string) => wealthFunds.find((f) => f.fundId === fundId)?.name;
  const wealthFundItems = new Set([...wealthFunds.map((f) => f.fundId), ...wealthQuotes.map((q) => q.fundId)]).size;
  const count =
    pack.snapshots.length +
    pack.news.length +
    pack.etfFlows.length +
    pack.indexes.length +
    pack.orderBooks.length +
    (wealthFundItems > 3 ? 1 : wealthFundItems) +
    wealthPrices.length +
    dcaSimulations.length +
    (pack.rewardIncentives ? 1 : 0) +
    (pack.rewardFeed ? 1 : 0);

  // One entry per visible block, in reading order, so the stagger has no gaps.
  const blocks: { key: string; node: ReactNode; className?: string }[] = [];
  if (pack.snapshots.length > 0) {
    blocks.push({
      key: "snapshots",
      className: "grid gap-3 sm:grid-cols-2",
      node: pack.snapshots.map((s) => <SnapshotCard key={s.asset} snapshot={s} />),
    });
  }
  for (const series of pack.etfFlows) {
    blocks.push({ key: `etf:${series.asset}`, node: <EtfFlowCard series={series} /> });
  }
  if (pack.news.length > 0) {
    blocks.push({ key: "news", node: <NewsCard items={pack.news} /> });
  }
  for (const index of pack.indexes) {
    blocks.push({ key: `index:${index.id}`, node: <IndexCard index={index} /> });
  }
  for (const book of pack.orderBooks) {
    blocks.push({ key: `book:${book.market}`, node: <OrderBookCard book={book} /> });
  }
  if (wealthFundItems > 0) {
    blocks.push({
      key: "wealth-funds",
      className: "flex flex-col gap-3",
      node: <WealthFundsEvidence funds={wealthFunds} quotes={wealthQuotes} />,
    });
  }
  for (const series of wealthPrices) {
    blocks.push({
      key: `price:${series.fundId}:${series.range}`,
      node: <PriceHistoryCard series={series} name={nameOf(series.fundId)} />,
    });
  }
  for (const sim of dcaSimulations) {
    blocks.push({ key: `dca:${sim.fundId}:${sim.range}`, node: <DcaCard sim={sim} name={nameOf(sim.fundId)} /> });
  }
  if (pack.rewardIncentives) {
    blocks.push({ key: "reward-incentives", node: <RewardsIncentivesCard incentives={pack.rewardIncentives} /> });
  }
  if (pack.rewardFeed) {
    blocks.push({ key: "reward-feed", node: <RewardFeedCard feed={pack.rewardFeed} /> });
  }

  return (
    <section aria-labelledby="evidence-heading" className={cn("stagger-in flex flex-col gap-3", className)}>
      <div className="flex items-baseline justify-between gap-3 pb-1">
        <h2 id="evidence-heading" className="text-xl font-semibold tracking-tight">
          Evidence
        </h2>
        <p className="text-xs text-muted">
          <span className="tabular font-mono text-fg">{count}</span> item{count === 1 ? "" : "s"} · frozen{" "}
          {formatDateTime(pack.createdAt)}
          {sample ? " · sample" : ""}
        </p>
      </div>
      {count === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-4 text-sm text-muted">
          This scenario has no evidence attached.
        </p>
      ) : null}
      {blocks.map((b, i) => (
        <div key={b.key} className={b.className} style={{ "--i": i + 1 } as CSSProperties}>
          {b.node}
        </div>
      ))}
    </section>
  );
}
