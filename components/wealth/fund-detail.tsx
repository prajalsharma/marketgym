"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, X } from "lucide-react";
import type { WealthDcaResponse, WealthFundResponse, WealthPriceHistoryResponse } from "@/lib/types/api";
import {
  Button,
  DataSourceTag,
  EmptyState,
  ErrorState,
  Skeleton,
  Stat,
  StatusDot,
} from "@/components/ui";
import { SegmentedTabs } from "@/components/ui/animated-tabs";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { describeError } from "@/lib/client/api";
import { formatCompact, formatDate, formatPercent, formatUsd } from "@/lib/client/format";
import {
  FUND_TYPE_MEANING,
  MARKET_STATUS_LABEL,
  PRICE_RANGES,
  headlineReturn,
  isUnusualPct,
  marketStatusTone,
  relatedLesson,
  type PriceRange,
} from "@/lib/client/wealth";
import { useApiGet } from "@/lib/client/use-api";
import { SeriesLineChart } from "./line-chart";
import { PctValue } from "./return-value";

function tone(v: number | null | undefined): "success" | "danger" | "default" | "muted" {
  if (v === null || v === undefined) return "muted";
  return v < 0 ? "danger" : v > 0 ? "success" : "default";
}

function priceFormatter(points: { y: number }[]): (v: number) => string {
  const max = Math.max(...points.map((p) => Math.abs(p.y)), 0);
  const digits = max >= 1000 ? 0 : max >= 10 ? 2 : 4;
  return (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: digits })}`;
}

/** Fund detail: quote, fees, price history by range, SoDEX's weekly-buying simulation, links onward. */
export function FundDetail({ fundId }: { fundId: string }) {
  const base = `/api/market/wealth/${encodeURIComponent(fundId)}`;
  const fund = useApiGet<WealthFundResponse>(base);
  const ref = useRef<HTMLElement | null>(null);

  // On phones and tablets the panel sits above the board; bring it into view when a fund is picked.
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia("(max-width: 1023px)").matches) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  }, []);

  return (
    <section
      ref={ref}
      aria-labelledby="fund-heading"
      className="animate-rise-in scroll-mt-20 rounded-lg border border-evidence-line bg-evidence p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {fund.data ? (
            <>
              <h2 id="fund-heading" className="text-lg font-semibold leading-snug">
                {fund.data.name}
              </h2>
              <p className="text-sm text-muted">
                {fund.data.kindLabel} · {fund.data.shareSymbol}
              </p>
            </>
          ) : (
            <h2 id="fund-heading" className="text-lg font-semibold">
              {fund.loading ? <Skeleton className="h-7 w-48" /> : fundId}
            </h2>
          )}
        </div>
        <Button asChild variant="ghost" size="sm" aria-label="Close fund details">
          <Link href="/app/wealth" scroll={false}>
            <X className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      {fund.loading ? (
        <div className="mt-4 space-y-3" aria-busy="true">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      ) : fund.error || !fund.data ? (
        <ErrorState
          className="mt-4"
          title="Could not load this fund"
          description={describeError(fund.error)}
          retry={fund.retry}
        />
      ) : (
        <FundBody fundId={fundId} data={fund.data} base={base} />
      )}
    </section>
  );
}

function FundBody({ fundId, data, base }: { fundId: string; data: WealthFundResponse; base: string }) {
  const q = data.quote;
  const ret = headlineReturn(q);
  const lesson = relatedLesson(data.fundType);
  return (
    <div className="mt-4 space-y-6">
      <p className="text-sm leading-relaxed">{FUND_TYPE_MEANING[data.fundType]}</p>

      <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
        <Stat
          label="Price"
          value={q?.price !== null && q?.price !== undefined ? <AnimatedNumber value={q.price} format={(n) => formatUsd(n)} /> : formatUsd(q?.price)}
          hint={q?.priceStatus === "stale" ? "Stale price" : undefined}
        />
        <Stat label="Change today" value={formatPercent(q?.changePct)} tone={tone(q?.changePct)} />
        <Stat label="NAV per share" value={data.nav === null ? "—" : formatUsd(data.nav)} hint={data.nav === null ? "Set by the order book" : undefined} />
        {isUnusualPct(ret.value) ? (
          <Stat label={ret.label} value={<PctValue value={ret.value} className="text-base" />} />
        ) : (
          <Stat label={ret.label} value={formatPercent(ret.value)} tone={tone(ret.value)} />
        )}
        <Stat label="AUM" value={formatCompact(data.aum, { currency: true })} />
        <Stat
          label="Fees per year"
          value={data.managementFeePct === null ? "—" : formatPercent(data.managementFeePct, { signed: false })}
          hint={
            data.performanceFeePct !== null
              ? `plus ${formatPercent(data.performanceFeePct, { signed: false })} of gains`
              : data.managementFeePct === null
                ? "Not published"
                : "Management fee"
          }
        />
        {q?.dividendYieldPct !== null && q?.dividendYieldPct !== undefined ? (
          <Stat label="Dividend yield" value={formatPercent(q.dividendYieldPct, { signed: false })} />
        ) : null}
        {q?.dayVolume !== null && q?.dayVolume !== undefined ? (
          <Stat label="Day volume" value={formatCompact(q.dayVolume, { currency: true })} />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {q ? <StatusDot tone={marketStatusTone(q.marketStatus)} label={MARKET_STATUS_LABEL[q.marketStatus]} /> : null}
        <DataSourceTag provenance={data.provenance} compact />
        {q ? <DataSourceTag provenance={q.provenance} compact /> : null}
      </div>

      <PriceHistory fundId={fundId} base={base} />
      <DcaSimulationPanel base={base} />

      <div className="flex flex-col gap-3 border-t border-evidence-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href={lesson.href} className="inline-flex items-center gap-2 text-sm text-accent underline-offset-4 hover:underline">
          <BookOpen className="size-4" aria-hidden="true" />
          {lesson.label}
        </Link>
        <Button asChild>
          <Link href={`/app/portfolio?add=${encodeURIComponent(fundId)}`}>
            Practise with this fund
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function PriceHistory({ fundId, base }: { fundId: string; base: string }) {
  const [range, setRange] = useState<PriceRange>("3M");
  const res = useApiGet<WealthPriceHistoryResponse>(`${base}/prices?range=${range}`);
  // While a new range loads, keep the last chart on screen (dimmed) instead of flashing a skeleton.
  const shown = res.data ?? (res.loading ? res.previous : null);
  const points = (shown?.points ?? []).map((p) => ({ x: p.ts, y: p.close }));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className="text-base font-semibold">Price history</h3>
        <SegmentedTabs
          label="Price history range"
          value={range}
          onValueChange={(v: PriceRange) => setRange(v)}
          items={PRICE_RANGES.map((r) => ({ value: r, label: r }))}
        />
      </div>
      {res.loading && !shown ? (
        <Skeleton className="h-52" />
      ) : res.error ? (
        <ErrorState title="Could not load the price history" description={describeError(res.error)} retry={res.retry} />
      ) : points.length < 2 ? (
        <EmptyState title="No price history for this range" description="SoDEX has not published enough prices for this fund yet. Try a shorter range." />
      ) : (
        <>
          <SeriesLineChart
            points={points}
            label={`${fundId} closing price over ${range}`}
            seriesName="Close"
            formatY={priceFormatter(points)}
            stale={res.loading}
          />
          <p className="text-xs text-muted">
            {formatDate(points[0].x)} to {formatDate(points[points.length - 1].x)} · {points.length} points
          </p>
        </>
      )}
      {shown ? <DataSourceTag provenance={shown.provenance} compact /> : null}
    </div>
  );
}

function DcaSimulationPanel({ base }: { base: string }) {
  const res = useApiGet<WealthDcaResponse>(`${base}/dca?range=1Y`);
  const sim = res.data;
  const points = (sim?.points ?? []).map((p) => ({ x: p.tradeDate, y: p.returnPct }));
  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold">SoDEX weekly-buying simulation, not a forecast</h3>
      <p className="text-sm text-muted">
        SoDEX&apos;s own example of buying the same amount every week for the past year. It shows the cumulative return
        so far. It is not anyone&apos;s real account and says nothing about next year.
      </p>
      {res.loading ? (
        <Skeleton className="h-52" />
      ) : res.error ? (
        <ErrorState title="Could not load the simulation" description={describeError(res.error)} retry={res.retry} />
      ) : !sim || !sim.ready || points.length < 2 ? (
        <EmptyState title="No simulation for this fund" description="SoDEX has not published a weekly-buying simulation for this fund yet." />
      ) : (
        <>
          <SeriesLineChart
            points={points}
            label="Cumulative return of a weekly equal-amount purchase over one year"
            seriesName="Cumulative return"
            formatY={(v) => formatPercent(v, { digits: 1 })}
            zeroLine
            color="chart-3"
          />
          <p className="text-sm">
            Return over the period:{" "}
            <PctValue value={sim.totalReturnPct} />
          </p>
        </>
      )}
      {sim ? <DataSourceTag provenance={sim.provenance} compact /> : null}
    </div>
  );
}
