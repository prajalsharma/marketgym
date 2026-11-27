"use client";

import type {
  DcaSimulation,
  RewardFeed,
  RewardsIncentives,
  WealthFund,
  WealthPriceSeries,
  WealthQuote,
} from "@/lib/types/wealth";
import { Card, CardContent, CardHeader, CardTitle, DataSourceTag, StatusDot } from "@/components/ui";
import { SeriesLineChart } from "@/components/wealth/line-chart";
import {
  formatCompact,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatUsd,
} from "@/lib/client/format";
import { PctValue } from "@/components/wealth/return-value";
import { MARKET_STATUS_LABEL, distinctProvenance, headlineReturn, marketStatusTone } from "@/lib/client/wealth";
import { cn } from "@/lib/utils";

function changeClass(v: number | null | undefined): string {
  if (v === null || v === undefined) return "text-muted";
  return v < 0 ? "text-danger" : v > 0 ? "text-success" : "text-fg";
}

/* ---------- Fund + quote ---------- */

/**
 * Up to three funds render as individual fund cards; a full board renders as one table card.
 * Quotes without a matching fund still show (symbol only).
 */
export function WealthFundsEvidence({ funds, quotes }: { funds: WealthFund[]; quotes: WealthQuote[] }) {
  const ids = [...new Set([...funds.map((f) => f.fundId), ...quotes.map((q) => q.fundId)])];
  if (ids.length === 0) return null;
  const rows = ids.map((id) => ({
    id,
    fund: funds.find((f) => f.fundId === id) ?? null,
    quote: quotes.find((q) => q.fundId === id) ?? null,
  }));
  if (rows.length <= 3) {
    return (
      <>
        {rows.map((r) => (
          <WealthFundCard key={r.id} fundId={r.id} fund={r.fund} quote={r.quote} />
        ))}
      </>
    );
  }
  const tags = distinctProvenance([...funds.map((f) => f.provenance), ...quotes.map((q) => q.provenance)]);
  return (
    <Card tone="evidence">
      <CardHeader className="flex flex-row items-baseline justify-between gap-3 space-y-0">
        <CardTitle className="text-base">SoDEX Wealth fund board</CardTitle>
        <span className="text-xs text-muted">{rows.length} funds</span>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Fund prices, daily change and headline return</caption>
            <thead>
              <tr className="border-b border-evidence-line text-left text-xs text-muted">
                <th scope="col" className="py-1.5 pr-2 font-medium">Fund</th>
                <th scope="col" className="py-1.5 pr-2 text-right font-medium">Price</th>
                <th scope="col" className="py-1.5 pr-2 text-right font-medium">Today</th>
                <th scope="col" className="py-1.5 text-right font-medium">Return</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const ret = headlineReturn(r.quote);
                return (
                  <tr key={r.id} className="border-b border-evidence-line last:border-b-0">
                    <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                      {r.fund?.name ?? r.quote?.symbol ?? r.id}
                      {r.fund ? <span className="block text-xs text-muted">{r.fund.kindLabel}</span> : null}
                    </th>
                    <td className="tabular py-1.5 pr-2 text-right font-mono">{formatUsd(r.quote?.price)}</td>
                    <td className={cn("tabular py-1.5 pr-2 text-right font-mono", changeClass(r.quote?.changePct))}>
                      {formatPercent(r.quote?.changePct)}
                    </td>
                    <td className="py-1.5 text-right">
                      <PctValue value={ret.value} />
                      <span className="block text-xs text-muted">{ret.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((p) => (
            <DataSourceTag key={`${p.provider}:${p.kind}`} provenance={p} compact />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function WealthFundCard({ fundId, fund, quote }: { fundId: string; fund: WealthFund | null; quote: WealthQuote | null }) {
  const ret = headlineReturn(quote);
  return (
    <Card tone="evidence">
      <CardHeader className="flex flex-row items-baseline justify-between gap-3 space-y-0">
        <CardTitle className="text-base">
          {fund?.name ?? quote?.symbol ?? fundId}{" "}
          {fund ? <span className="font-normal text-muted">{fund.kindLabel}</span> : null}
        </CardTitle>
        {quote ? (
          <span className={cn("tabular font-mono text-sm", changeClass(quote.changePct))}>
            {formatPercent(quote.changePct)} <span className="text-muted">today</span>
          </span>
        ) : null}
      </CardHeader>
      <CardContent>
        <p className="tabular font-mono text-xl tracking-tight">{formatUsd(quote?.price)}</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted">NAV per share</dt>
          <dd className="tabular text-right font-mono">{fund?.nav === null || !fund ? "—" : formatUsd(fund.nav)}</dd>
          <dt className="text-muted">{ret.label}</dt>
          <dd className="text-right">
            <PctValue value={ret.value} />
          </dd>
          {fund && fund.aum !== null ? (
            <>
              <dt className="text-muted">AUM</dt>
              <dd className="tabular text-right font-mono">{formatCompact(fund.aum, { currency: true })}</dd>
            </>
          ) : null}
          {fund && fund.managementFeePct !== null ? (
            <>
              <dt className="text-muted">Management fee</dt>
              <dd className="tabular text-right font-mono">{formatPercent(fund.managementFeePct, { signed: false })} a year</dd>
            </>
          ) : null}
        </dl>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {quote ? <StatusDot tone={marketStatusTone(quote.marketStatus)} label={MARKET_STATUS_LABEL[quote.marketStatus]} /> : null}
          {quote && quote.priceStatus === "stale" ? <StatusDot tone="warning" label="Stale price" /> : null}
          {fund ? <DataSourceTag provenance={fund.provenance} compact /> : null}
          {quote ? <DataSourceTag provenance={quote.provenance} compact /> : null}
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Price history ---------- */

export function PriceHistoryCard({ series, name }: { series: WealthPriceSeries; name?: string }) {
  const points = series.points.map((p) => ({ x: p.ts, y: p.close }));
  const first = points[0]?.y;
  const last = points[points.length - 1]?.y;
  const change = first !== undefined && last !== undefined && first !== 0 ? ((last - first) / first) * 100 : null;
  return (
    <Card tone="evidence">
      <CardHeader className="flex flex-row items-baseline justify-between gap-3 space-y-0">
        <CardTitle className="text-base">
          {name ?? series.symbol ?? series.fundId} price, {series.range}
        </CardTitle>
        <span className={cn("tabular font-mono text-sm", changeClass(change))}>{formatPercent(change)}</span>
      </CardHeader>
      <CardContent>
        {points.length < 2 ? (
          <p className="text-sm text-muted">Not enough price points in this pack.</p>
        ) : (
          <>
            <SeriesLineChart
              points={points}
              label={`Closing price of ${series.fundId} over ${series.range}`}
              seriesName="Close"
              formatY={(v) => formatUsd(v)}
              className="h-36"
            />
            <p className="mt-2 text-xs text-muted">
              {formatDate(points[0].x)} to {formatDate(points[points.length - 1].x)} · first {formatUsd(first)}, last{" "}
              {formatUsd(last)}
            </p>
          </>
        )}
        <div className="mt-3">
          <DataSourceTag provenance={series.provenance} compact />
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- DCA simulation ---------- */

export function DcaCard({ sim, name }: { sim: DcaSimulation; name?: string }) {
  const points = sim.points.map((p) => ({ x: p.tradeDate, y: p.returnPct }));
  return (
    <Card tone="evidence">
      <CardHeader className="flex flex-row items-baseline justify-between gap-3 space-y-0">
        <CardTitle className="text-base">
          {name ?? sim.fundId} weekly-buying simulation, {sim.range}
        </CardTitle>
        <span className={cn("tabular font-mono text-sm", changeClass(sim.totalReturnPct))}>{formatPercent(sim.totalReturnPct)}</span>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted">SoDEX&apos;s example of equal weekly buys. Not a forecast and not anyone&apos;s account.</p>
        {!sim.ready || points.length < 2 ? (
          <p className="mt-2 text-sm text-muted">SoDEX had not published this simulation when the evidence was frozen.</p>
        ) : (
          <SeriesLineChart
            points={points}
            label={`Cumulative return of weekly buying in ${sim.fundId} over ${sim.range}`}
            seriesName="Cumulative return"
            formatY={(v) => formatPercent(v, { digits: 1 })}
            zeroLine
            color="chart-3"
            className="mt-2 h-36"
          />
        )}
        <div className="mt-3">
          <DataSourceTag provenance={sim.provenance} compact />
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Rewards ---------- */

export function RewardsIncentivesCard({ incentives: inc }: { incentives: RewardsIncentives }) {
  const top = [...inc.multipliers].sort((a, b) => b.coefficient - a.coefficient).slice(0, 6);
  return (
    <Card tone="evidence">
      <CardHeader>
        <CardTitle className="text-base">SoDEX trading rewards</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted">Week</dt>
          <dd className="text-right">{inc.weekName ?? "—"}</dd>
          <dt className="text-muted">Points pool</dt>
          <dd className="tabular text-right font-mono">{formatCompact(inc.weekPoolPoints)}</dd>
          <dt className="text-muted">Paid out</dt>
          <dd className="text-right">{formatDateTime(inc.distributionTime)}</dd>
          <dt className="text-muted">Volume per box</dt>
          <dd className="tabular text-right font-mono">{formatUsd(inc.volumePerBoxUsd, { decimals: 0 })}</dd>
          <dt className="text-muted">Taker / maker weight</dt>
          <dd className="tabular text-right font-mono">
            {formatNumber(inc.takerWeightPct, 0)}% / {formatNumber(inc.makerWeightPct, 0)}%
          </dd>
          <dt className="text-muted">Drop odds</dt>
          <dd className="text-right">{inc.probabilitiesPublished ? "Published" : "Not published"}</dd>
        </dl>
        {top.length > 0 ? (
          <div className="mt-3">
            <p className="text-xs text-muted">Highest points multipliers</p>
            <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
              {top.map((m) => (
                <li key={`${m.marketType}:${m.symbol}`} className="flex justify-between gap-2">
                  <span className="truncate font-mono">{m.symbol}</span>
                  <span className="tabular font-mono text-muted">×{formatNumber(m.coefficient, 2)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {inc.rewardBands.length > 0 ? (
          <p className="mt-3 text-xs text-muted">
            Box rewards range from {formatUsd(Math.min(...inc.rewardBands.map((b) => b.minUsd)))} to{" "}
            {formatUsd(Math.max(...inc.rewardBands.map((b) => b.maxUsd)))} across {inc.rewardBands.length} levels.
          </p>
        ) : null}
        <div className="mt-3">
          <DataSourceTag provenance={inc.provenance} compact />
        </div>
      </CardContent>
    </Card>
  );
}

export function RewardFeedCard({ feed }: { feed: RewardFeed }) {
  const items = [...feed.items].sort((a, b) => b.tsMs - a.tsMs).slice(0, 8);
  return (
    <Card tone="evidence">
      <CardHeader className="flex flex-row items-baseline justify-between gap-3 space-y-0">
        <CardTitle className="text-base">Reward feed, big wins only</CardTitle>
        <span className="text-xs text-muted">{feed.items.length} shown</span>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted">{feed.filterNote}</p>
        {items.length === 0 ? (
          <p className="mt-2 text-sm text-muted">The feed was empty when the evidence was frozen.</p>
        ) : (
          <ul className="mt-2 divide-y divide-evidence-line text-sm">
            {items.map((it, i) => (
              <li key={`${it.tsMs}-${i}`} className="flex items-baseline justify-between gap-3 py-1.5">
                <span className="min-w-0 truncate">
                  {it.level} <span className="text-muted">· {it.assetSymbol}{it.pfp ? " · PFP" : ""}</span>
                </span>
                <span className="tabular shrink-0 font-mono">{formatUsd(it.rewardUsd)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <DataSourceTag provenance={feed.provenance} compact />
        </div>
      </CardContent>
    </Card>
  );
}
