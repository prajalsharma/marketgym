"use client";

import type { RewardsResponse } from "@/lib/types/api";
import type { RewardFeed, RewardsIncentives } from "@/lib/types/wealth";
import { DataSourceTag, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { describeError } from "@/lib/client/api";
import { formatCompact, formatDateTime, formatNumber, formatRelative, formatUsd } from "@/lib/client/format";
import { useApiGet } from "@/lib/client/use-api";

/** SoDEX trading-reward rules and the public big-wins feed, read-only, framed as a lesson on incentives. */
export function RewardsSection() {
  const res = useApiGet<RewardsResponse>("/api/market/rewards");
  return (
    <section aria-labelledby="rewards-heading" className="space-y-4">
      <div className="max-w-prose space-y-1">
        <h2 id="rewards-heading" className="text-lg font-semibold">
          Trading rewards on SoDEX
        </h2>
        <p className="text-sm text-muted">
          SoDEX pays points and reward boxes for trading volume. Rewards like these can make volume look like demand.
          Read the rules before you read the volume.
        </p>
      </div>
      {res.loading ? (
        <div className="grid gap-4 lg:grid-cols-2" aria-busy="true">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      ) : res.error || !res.data ? (
        <ErrorState title="Could not load the reward rules" description={describeError(res.error)} retry={res.retry} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <IncentivesPanel incentives={res.data.incentives} />
          <FeedPanel feed={res.data.feed} />
        </div>
      )}
    </section>
  );
}

function IncentivesPanel({ incentives: inc }: { incentives: RewardsIncentives }) {
  const multipliers = [...inc.multipliers].sort((a, b) => b.coefficient - a.coefficient);
  return (
    <div className="space-y-5 rounded-lg border border-evidence-line bg-evidence p-4 sm:p-5">
      <div className="space-y-2">
        <h3 className="text-base font-semibold">Points this week</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted">Week</dt>
          <dd className="text-right">
            {inc.weekName ?? "—"}
            {inc.weekStatus ? <span className="text-muted"> · {inc.weekStatus.toLowerCase()}</span> : null}
          </dd>
          <dt className="text-muted">Points pool</dt>
          <dd className="tabular text-right font-mono">{formatCompact(inc.weekPoolPoints)}</dd>
          <dt className="text-muted">Points paid out</dt>
          <dd className="text-right">{formatDateTime(inc.distributionTime)}</dd>
          {inc.roundStart || inc.roundEnd ? (
            <>
              <dt className="text-muted">Season{inc.roundId !== null ? ` ${inc.roundId}` : ""}</dt>
              <dd className="text-right">
                {formatDateTime(inc.roundStart)} to {formatDateTime(inc.roundEnd)}
              </dd>
            </>
          ) : null}
        </dl>
      </div>

      <div className="space-y-2">
        <h3 className="text-base font-semibold">Points multipliers by market</h3>
        {multipliers.length === 0 ? (
          <p className="text-sm text-muted">No multipliers are listed right now.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto rounded-md border border-evidence-line scrollbar-thin">
            <table className="w-full text-sm">
              <caption className="sr-only">Points multiplier for each market</caption>
              <thead className="sticky top-0 bg-evidence">
                <tr className="border-b border-evidence-line text-left text-xs text-muted">
                  <th scope="col" className="px-3 py-1.5 font-medium">Market</th>
                  <th scope="col" className="px-3 py-1.5 font-medium">Type</th>
                  <th scope="col" className="px-3 py-1.5 text-right font-medium">Multiplier</th>
                </tr>
              </thead>
              <tbody>
                {multipliers.map((m) => (
                  <tr key={`${m.marketType}:${m.symbol}`} className="border-b border-evidence-line last:border-b-0">
                    <th scope="row" className="px-3 py-1.5 text-left font-mono font-normal">{m.symbol}</th>
                    <td className="px-3 py-1.5 text-muted">{m.marketType === "perps" ? "Perpetual" : "Spot"}</td>
                    <td className="tabular px-3 py-1.5 text-right font-mono">×{formatNumber(m.coefficient, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted">A higher multiplier earns more points for the same volume, so traders crowd those markets.</p>
      </div>

      <div className="space-y-2">
        <h3 className="text-base font-semibold">Reward box rules</h3>
        <ul className="space-y-1.5 text-sm">
          <li>
            One box for every <span className="tabular font-mono">{formatUsd(inc.volumePerBoxUsd, { decimals: 0 })}</span> of trading volume.
          </li>
          <li>
            Taker volume counts <span className="tabular font-mono">{formatNumber(inc.takerWeightPct, 0)}%</span>, maker volume counts{" "}
            <span className="tabular font-mono">{formatNumber(inc.makerWeightPct, 0)}%</span>.
          </li>
          <li>{inc.probabilitiesPublished ? "SoDEX publishes the drop odds." : "Drop odds are not published."}</li>
        </ul>
        {inc.rewardBands.length > 0 ? (
          <table className="w-full text-sm">
            <caption className="pb-1 text-left text-xs text-muted">Reward range by box level</caption>
            <thead>
              <tr className="border-b border-evidence-line text-left text-xs text-muted">
                <th scope="col" className="py-1.5 font-medium">Level</th>
                <th scope="col" className="py-1.5 text-right font-medium">From</th>
                <th scope="col" className="py-1.5 text-right font-medium">Up to</th>
              </tr>
            </thead>
            <tbody>
              {inc.rewardBands.map((b) => (
                <tr key={b.level} className="border-b border-evidence-line last:border-b-0">
                  <th scope="row" className="py-1.5 text-left font-normal">{b.level}</th>
                  <td className="tabular py-1.5 text-right font-mono">{formatUsd(b.minUsd)}</td>
                  <td className="tabular py-1.5 text-right font-mono">{formatUsd(b.maxUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      <DataSourceTag provenance={inc.provenance} />
    </div>
  );
}

function FeedPanel({ feed }: { feed: RewardFeed }) {
  const items = [...feed.items].sort((a, b) => b.tsMs - a.tsMs).slice(0, 20);
  return (
    <div className="space-y-3 rounded-lg border border-evidence-line bg-evidence p-4 sm:p-5">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Recent big wins</h3>
        <p className="text-sm text-muted">
          Filtered: only boxes worth $50 or more, or a PFP drop, shown 5 minutes late. This is the best of the draws, not
          a typical one.
        </p>
        {feed.filterNote ? <p className="text-xs text-subtle">{feed.filterNote}</p> : null}
      </div>
      {items.length === 0 ? (
        <EmptyState title="No wins in the feed right now" description="The public feed is empty. Big wins appear here a few minutes after they happen." />
      ) : (
        <ul className="divide-y divide-evidence-line text-sm">
          {items.map((it, i) => (
            <li key={`${it.tsMs}-${i}`} className="flex items-baseline justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="font-medium">{it.level}</span>
                <span className="text-muted">
                  {" "}
                  · {it.assetSymbol}
                  {it.pfp ? " · PFP" : ""}
                </span>
              </span>
              <span className="flex shrink-0 items-baseline gap-3">
                <span className="tabular font-mono">{formatUsd(it.rewardUsd)}</span>
                <time className="text-xs text-subtle" dateTime={new Date(it.tsMs).toISOString()} suppressHydrationWarning>
                  {formatRelative(new Date(it.tsMs).toISOString())}
                </time>
              </span>
            </li>
          ))}
        </ul>
      )}
      <DataSourceTag provenance={feed.provenance} />
    </div>
  );
}
