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
import { EVIDENCE_CARD } from "./snapshot-card";

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
    <Card tone="evidence" className={EVIDENCE_CARD}>
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
                  <tr key={r.id} className="border-b border-evidence-line transition-colors duration-150 last:border-b-0 hover:bg-surface-raised">
                    <th scope="row" className="py-2 pr-2 text-left font-medium">
                      {r.fund?.name ?? r.quote?.symbol ?? r.id}
                      {r.fund ? <span className="block text-xs font-normal text-muted">{r.fund.kindLabel}</span> : null}
                    </th>
                    <td className="tabular py-2 pr-2 text-right font-mono">{formatUsd(r.quote?.price)}</td>
                    <td className={cn("tabular py-2 pr-2 text-right font-mono", changeClass(r.quote?.changePct))}>
                      {formatPercent(r.quote?.changePct)}
                    </td>
                    <td className="py-2 text-right">
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
    <Card tone="evidence" className={EVIDENCE_CARD}>
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
        <p className="tabular font-mono text-3xl font-semibold tracking-tight">{formatUsd(quote?.price)}</p>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-evidence-line pt-3 text-sm">
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
    <Card tone="evidence" className={EVIDENCE_CARD}>
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
            <p className="tabular mb-3 font-mono text-3xl font-semibold tracking-tight" aria-hidden="true">
              {formatUsd(last)}
            </p>
            <SeriesLineChart
              points={points}
              label={`Closing price of ${series.fundId} over ${series.range}`}
              seriesName="Close"
              formatY={(v) => formatUsd(v)}
              className="h-40"
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
    <Card tone="evidence" className={EVIDENCE_CARD}>
      <CardHeader className="flex flex-row items-baseline justify-between gap-3 space-y-0">
        <CardTitle className="text-base">
          {name ?? sim.fundId} weekly-buying simulation, {sim.range}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn("tabular font-mono text-3xl font-semibold tracking-tight", changeClass(sim.totalReturnPct))}>
          {formatPercent(sim.totalReturnPct)}
        </p>
        <p className="mt-1.5 text-xs text-muted">SoDEX&apos;s example of equal weekly buys. Not a forecast and not anyone&apos;s account.</p>
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
            className="mt-3 h-40"
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
    <Card tone="evidence" className={EVIDENCE_CARD}>
      <CardHeader>
        <CardTitle className="text-base">SoDEX trading rewards</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-xs text-muted">Points pool</dt>
            <dd className="tabular mt-0.5 font-mono text-3xl font-semibold tracking-tight">{formatCompact(inc.weekPoolPoints)}</dd>
          </div>
          <div className="text-right">
            <dt className="text-xs text-muted">Week</dt>
            <dd className="mt-0.5 text-sm">{inc.weekName ?? "—"}</dd>
          </div>
        </dl>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-evidence-line pt-3 text-sm">
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
          <div className="mt-4 border-t border-evidence-line pt-3">
            <p className="text-xs text-muted">Highest points multipliers</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {top.map((m, i) => (
                <li key={`${m.marketType}:${m.symbol}`} className="grid grid-cols-[minmax(0,6rem)_1fr_3.5rem] items-center gap-2">
                  <span className="truncate font-mono">{m.symbol}</span>
                  <span className="h-2 overflow-hidden rounded-sm bg-surface-sunken" aria-hidden="true">
                    <span
                      className={cn("block h-full rounded-sm bg-accent", i > 0 && "opacity-60")}
                      style={{ width: `${Math.round((m.coefficient / Math.max(top[0].coefficient, 1e-9)) * 100)}%` }}
                    />
                  </span>
                  <span className="tabular text-right font-mono text-muted">×{formatNumber(m.coefficient, 2)}</span>
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
    <Card tone="evidence" className={EVIDENCE_CARD}>
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
              <li
                key={`${it.tsMs}-${i}`}
                className="-mx-2 flex items-baseline justify-between gap-3 rounded-sm px-2 py-2 transition-colors duration-150 hover:bg-surface-raised"
              >
                <span className="min-w-0 truncate">
                  {it.level} <span className="text-muted">· {it.assetSymbol}{it.pfp ? " · PFP" : ""}</span>
                </span>
                <span className="tabular shrink-0 font-mono font-medium">{formatUsd(it.rewardUsd)}</span>
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
