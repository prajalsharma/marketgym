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
  return (
    <section aria-labelledby="evidence-heading" className={cn("space-y-3", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="evidence-heading" className="text-lg font-semibold">
          Evidence
        </h2>
        <p className="text-xs text-muted">
          {count} item{count === 1 ? "" : "s"} · frozen {formatDateTime(pack.createdAt)}
          {sample ? " · sample" : ""}
        </p>
      </div>
      {count === 0 ? (
        <p className="rounded-md border border-dashed border-line p-4 text-sm text-muted">
          This scenario has no evidence attached.
        </p>
      ) : null}
      {pack.snapshots.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {pack.snapshots.map((s) => (
            <SnapshotCard key={s.asset} snapshot={s} />
          ))}
        </div>
      ) : null}
      {pack.etfFlows.map((series) => (
        <EtfFlowCard key={series.asset} series={series} />
      ))}
      <NewsCard items={pack.news} />
      {pack.indexes.map((index) => (
        <IndexCard key={index.id} index={index} />
      ))}
      {pack.orderBooks.map((book) => (
        <OrderBookCard key={book.market} book={book} />
      ))}
      <WealthFundsEvidence funds={wealthFunds} quotes={wealthQuotes} />
      {wealthPrices.map((series) => (
        <PriceHistoryCard key={`${series.fundId}:${series.range}`} series={series} name={nameOf(series.fundId)} />
      ))}
      {dcaSimulations.map((sim) => (
        <DcaCard key={`${sim.fundId}:${sim.range}`} sim={sim} name={nameOf(sim.fundId)} />
      ))}
      {pack.rewardIncentives ? <RewardsIncentivesCard incentives={pack.rewardIncentives} /> : null}
      {pack.rewardFeed ? <RewardFeedCard feed={pack.rewardFeed} /> : null}
    </section>
  );
}
