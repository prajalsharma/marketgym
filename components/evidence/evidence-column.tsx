import type { EvidencePack } from "@/lib/types/market";
import { SnapshotCard } from "./snapshot-card";
import { NewsCard } from "./news-card";
import { EtfFlowCard } from "./etf-flow-card";
import { IndexCard } from "./index-card";
import { OrderBookCard } from "./orderbook-card";
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
  const count =
    pack.snapshots.length + pack.news.length + pack.etfFlows.length + pack.indexes.length + pack.orderBooks.length;
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
    </section>
  );
}
