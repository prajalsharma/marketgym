"use client";

import type { CSSProperties } from "react";
import type { RewardsResponse } from "@/lib/types/api";
import type { RewardFeed, RewardsIncentives } from "@/lib/types/wealth";
import { DataSourceTag, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { describeError } from "@/lib/client/api";
import { formatCompact, formatDateTime, formatNumber, formatRelative, formatUsd } from "@/lib/client/format";
import { useApiGet } from "@/lib/client/use-api";
import { cn } from "@/lib/utils";

const PANEL =
  "rounded-lg border border-evidence-line bg-evidence shadow-[inset_0_1px_0_rgb(255_255_255/0.04),var(--shadow-sm)]";

/** SoDEX trading-reward rules and the public big-wins feed, read-only, framed as a lesson on incentives. */
export function RewardsSection() {
  const res = useApiGet<RewardsResponse>("/api/market/rewards");
  return (
    <section aria-labelledby="rewards-heading" className="space-y-5">
      <div className="max-w-prose space-y-1.5">
        <h2 id="rewards-heading" className="text-xl font-semibold tracking-tight">
          Trading rewards on SoDEX
        </h2>
        <p className="text-sm text-muted sm:text-base">
          SoDEX pays points and reward boxes for trading volume. Rewards like these can make volume look like demand.
          Read the rules before you read the volume.
        </p>
      </div>
      {res.loading ? (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-20" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
        </div>
      ) : res.error || !res.data ? (
        <ErrorState title="Could not load the reward rules" description={describeError(res.error)} retry={res.retry} />
      ) : (
        <div className="stagger-in space-y-4">
          <WeekStrip incentives={res.data.incentives} />
          <div style={{ "--i": 1 } as CSSProperties} className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <IncentivesPanel incentives={res.data.incentives} />
            <FeedPanel feed={res.data.feed} />
          </div>
        </div>
      )}
    </section>
  );
}

/** The week's headline facts in one row, so the rules below have context. */
function WeekStrip({ incentives: inc }: { incentives: RewardsIncentives }) {
  const cell = "min-w-0 bg-evidence p-4";
  return (
    <div className={cn(PANEL, "overflow-hidden")}>
      <h3 className="border-b border-evidence-line bg-surface-sunken/60 px-4 py-2.5 text-base font-semibold">Points this week</h3>
      <dl className="grid grid-cols-2 gap-px bg-evidence-line lg:grid-cols-4">
        <div className={cell}>
          <dt className="text-xs text-muted">Week</dt>
          <dd className="mt-1 text-sm font-medium">
            {inc.weekName ?? "—"}
            {inc.weekStatus ? <span className="font-normal text-muted"> · {inc.weekStatus.toLowerCase()}</span> : null}
          </dd>
        </div>
        <div className={cell}>
          <dt className="text-xs text-muted">Points pool</dt>
          <dd className="tabular mt-1 font-mono text-xl font-semibold leading-tight">{formatCompact(inc.weekPoolPoints)}</dd>
        </div>
        <div className={cell}>
          <dt className="text-xs text-muted">Points paid out</dt>
          <dd className="mt-1 text-sm font-medium">{formatDateTime(inc.distributionTime)}</dd>
        </div>
        {inc.roundStart || inc.roundEnd ? (
          <div className={cell}>
            <dt className="text-xs text-muted">Season{inc.roundId !== null ? ` ${inc.roundId}` : ""}</dt>
            <dd className="mt-1 text-sm font-medium">
              {formatDateTime(inc.roundStart)} to {formatDateTime(inc.roundEnd)}
            </dd>
          </div>
        ) : (
          <div className={cn(cell, "hidden lg:block")} aria-hidden="true" />
        )}
      </dl>
    </div>
  );
}

function IncentivesPanel({ incentives: inc }: { incentives: RewardsIncentives }) {
  const multipliers = [...inc.multipliers].sort((a, b) => b.coefficient - a.coefficient);
  // Bar length is each multiplier against the largest one listed; the number beside it is the real value.
  const top = multipliers.length > 0 ? multipliers[0].coefficient : 0;
  return (
    <div className={cn(PANEL, "divide-y divide-evidence-line")}>
      <div className="space-y-3 p-4 sm:p-5">
        <h3 className="text-base font-semibold">Points multipliers by market</h3>
        {multipliers.length === 0 ? (
          <p className="text-sm text-muted">No multipliers are listed right now.</p>
        ) : (
          <div className="max-h-72 overflow-y-auto rounded-md border border-evidence-line scrollbar-thin">
            <table className="w-full text-sm">
              <caption className="sr-only">Points multiplier for each market</caption>
              <thead className="sticky top-0 z-10 bg-surface-sunken">
                <tr className="text-left text-xs text-muted">
                  <th scope="col" className="border-b border-evidence-line px-3 py-2 font-medium">Market</th>
                  <th scope="col" className="border-b border-evidence-line px-3 py-2 font-medium">Type</th>
                  <th scope="col" className="border-b border-evidence-line px-3 py-2 text-right font-medium">Multiplier</th>
                </tr>
              </thead>
              <tbody>
                {multipliers.map((m) => (
                  <tr
                    key={`${m.marketType}:${m.symbol}`}
                    className="border-b border-evidence-line transition-colors duration-150 last:border-b-0 hover:bg-surface-raised"
                  >
                    <th scope="row" className="px-3 py-2 text-left font-mono font-medium">{m.symbol}</th>
                    <td className="px-3 py-2 text-muted">{m.marketType === "perps" ? "Perpetual" : "Spot"}</td>
                    <td className="px-3 py-2">
                      <span className="flex items-center justify-end gap-2.5">
                        <span aria-hidden="true" className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-surface-sunken sm:block">
                          <span
                            className="progress-fill block h-full rounded-full bg-accent"
                            style={{ width: `${top > 0 ? Math.max(4, Math.min(100, (m.coefficient / top) * 100)) : 0}%` }}
                          />
                        </span>
                        <span className="tabular w-12 text-right font-mono">×{formatNumber(m.coefficient, 2)}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted">A higher multiplier earns more points for the same volume, so traders crowd those markets.</p>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        <h3 className="text-base font-semibold">Reward box rules</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
            <span>
              One box for every <span className="tabular font-mono font-medium">{formatUsd(inc.volumePerBoxUsd, { decimals: 0 })}</span> of trading volume.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
            <span>
              Taker volume counts <span className="tabular font-mono font-medium">{formatNumber(inc.takerWeightPct, 0)}%</span>, maker volume counts{" "}
              <span className="tabular font-mono font-medium">{formatNumber(inc.makerWeightPct, 0)}%</span>.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span
              aria-hidden="true"
              className={cn("mt-2 size-1.5 shrink-0 rounded-full", inc.probabilitiesPublished ? "bg-success" : "bg-warning")}
            />
            <span>{inc.probabilitiesPublished ? "SoDEX publishes the drop odds." : "Drop odds are not published."}</span>
          </li>
        </ul>
        {inc.rewardBands.length > 0 ? (
          <table className="w-full text-sm">
            <caption className="pb-1.5 text-left text-xs text-muted">Reward range by box level</caption>
            <thead>
              <tr className="border-b border-evidence-line text-left text-xs text-muted">
                <th scope="col" className="py-2 font-medium">Level</th>
                <th scope="col" className="py-2 text-right font-medium">From</th>
                <th scope="col" className="py-2 text-right font-medium">Up to</th>
              </tr>
            </thead>
            <tbody>
              {inc.rewardBands.map((b) => (
                <tr key={b.level} className="border-b border-evidence-line last:border-b-0">
                  <th scope="row" className="py-2 text-left font-medium">{b.level}</th>
                  <td className="tabular py-2 text-right font-mono">{formatUsd(b.minUsd)}</td>
                  <td className="tabular py-2 text-right font-mono">{formatUsd(b.maxUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      <div className="px-4 py-3 sm:px-5">
        <DataSourceTag provenance={inc.provenance} />
      </div>
    </div>
  );
}

function FeedPanel({ feed }: { feed: RewardFeed }) {
  const items = [...feed.items].sort((a, b) => b.tsMs - a.tsMs).slice(0, 20);
  return (
    <div className={cn(PANEL, "divide-y divide-evidence-line")}>
      <div className="space-y-1.5 p-4 sm:p-5">
        <h3 className="text-base font-semibold">Recent big wins</h3>
        <p className="text-sm text-muted">
          Filtered: only boxes worth $50 or more, or a PFP drop, shown 5 minutes late. This is the best of the draws, not
          a typical one.
        </p>
        {feed.filterNote ? <p className="text-xs text-subtle">{feed.filterNote}</p> : null}
      </div>
      {items.length === 0 ? (
        <div className="p-4 sm:p-5">
          <EmptyState title="No wins in the feed right now" description="The public feed is empty. Big wins appear here a few minutes after they happen." />
        </div>
      ) : (
        <ul className="max-h-[28rem] divide-y divide-evidence-line overflow-y-auto text-sm scrollbar-thin">
          {items.map((it, i) => (
            <li
              key={`${it.tsMs}-${i}`}
              className="flex items-baseline justify-between gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-surface-raised sm:px-5"
            >
              <span className="min-w-0">
                <span className="font-medium">{it.level}</span>
                <span className="text-muted">
                  {" "}
                  · {it.assetSymbol}
                  {it.pfp ? " · PFP" : ""}
                </span>
              </span>
              <span className="flex shrink-0 items-baseline gap-3">
                <span className="tabular font-mono font-medium">{formatUsd(it.rewardUsd)}</span>
                <time className="w-16 text-right text-xs text-subtle" dateTime={new Date(it.tsMs).toISOString()} suppressHydrationWarning>
                  {formatRelative(new Date(it.tsMs).toISOString())}
                </time>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="px-4 py-3 sm:px-5">
        <DataSourceTag provenance={feed.provenance} />
      </div>
    </div>
  );
}
