"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
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
import { cn } from "@/lib/utils";
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
      className="animate-rise-in scroll-mt-20 overflow-hidden rounded-lg border border-evidence-line bg-evidence shadow-[inset_0_1px_0_rgb(255_255_255/0.04),var(--shadow-md)]"
    >
      <div className="flex items-start justify-between gap-3 border-b border-evidence-line bg-surface-sunken/60 px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          {fund.data ? (
            <>
              <h2 id="fund-heading" className="text-xl font-semibold leading-snug tracking-tight">
                {fund.data.name}
              </h2>
              <p className="mt-0.5 text-sm text-muted">
                {fund.data.kindLabel} · <span className="font-mono">{fund.data.shareSymbol}</span>
              </p>
            </>
          ) : (
            <h2 id="fund-heading" className="text-lg font-semibold">
              {fund.loading ? <Skeleton className="h-7 w-48" /> : fundId}
            </h2>
          )}
        </div>
        <Button asChild variant="ghost" size="sm" aria-label="Close fund details" className="-mr-1.5 transition-transform active:scale-[0.98]">
          <Link href="/app/wealth" scroll={false}>
            <X className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      {fund.loading ? (
        <div className="space-y-3 p-4 sm:p-5" aria-busy="true">
          <Skeleton className="h-12 w-44" />
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
          className="m-4 sm:m-5"
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
    <div className="stagger-in space-y-6 p-4 sm:p-5">
      <div style={{ "--i": 0 } as CSSProperties} className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <p className="text-sm text-muted">Price</p>
            <p className="tabular font-mono text-4xl font-semibold leading-none tracking-tight sm:text-5xl">
              {q?.price !== null && q?.price !== undefined ? (
                <AnimatedNumber value={q.price} format={(n) => formatUsd(n)} />
              ) : (
                formatUsd(q?.price)
              )}
            </p>
          </div>
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <span
              className={cn(
                "tabular rounded-md px-2 py-1 font-mono text-sm font-medium",
                tone(q?.changePct) === "success" && "bg-success-soft text-success",
                tone(q?.changePct) === "danger" && "bg-danger-soft text-danger",
                (tone(q?.changePct) === "default" || tone(q?.changePct) === "muted") && "bg-surface-sunken text-muted",
              )}
            >
              {formatPercent(q?.changePct)} <span className="font-sans font-normal">today</span>
            </span>
            {q ? <StatusDot tone={marketStatusTone(q.marketStatus)} label={MARKET_STATUS_LABEL[q.marketStatus]} /> : null}
          </div>
        </div>
        {q?.priceStatus === "stale" ? <p className="text-xs text-warning">Stale price</p> : null}
        <p className="max-w-prose text-sm leading-relaxed text-muted">{FUND_TYPE_MEANING[data.fundType]}</p>
      </div>

      <div
        style={{ "--i": 1 } as CSSProperties}
        className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-evidence-line bg-evidence-line sm:grid-cols-3 [&>*]:bg-evidence [&>*]:p-3"
      >
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

      <div style={{ "--i": 2 } as CSSProperties} className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <DataSourceTag provenance={data.provenance} compact />
        {q ? <DataSourceTag provenance={q.provenance} compact /> : null}
      </div>

      <div style={{ "--i": 3 } as CSSProperties}>
        <PriceHistory fundId={fundId} base={base} />
      </div>
      <div style={{ "--i": 4 } as CSSProperties}>
        <DcaSimulationPanel base={base} />
      </div>

      <div
        style={{ "--i": 5 } as CSSProperties}
        className="flex flex-col gap-3 border-t border-evidence-line pt-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <Link href={lesson.href} className="inline-flex items-center gap-2 text-sm text-accent underline-offset-4 hover:underline">
          <BookOpen className="size-4" aria-hidden="true" />
          {lesson.label}
        </Link>
        <Button asChild className="group transition-transform active:scale-[0.98]">
          <Link href={`/app/portfolio?add=${encodeURIComponent(fundId)}`}>
            Practise with this fund
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Price history</h3>
        <SegmentedTabs
          label="Price history range"
          value={range}
          onValueChange={(v: PriceRange) => setRange(v)}
          items={PRICE_RANGES.map((r) => ({ value: r, label: r }))}
        />
      </div>
      {res.loading && !shown ? (
        <Skeleton className="h-56" />
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
          <p className="tabular text-xs text-muted">
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
    <div className="space-y-3 border-t border-evidence-line pt-6">
      <h3 className="text-base font-semibold">SoDEX weekly-buying simulation, not a forecast</h3>
      <p className="max-w-prose text-sm text-muted">
        SoDEX&apos;s own example of buying the same amount every week for the past year. It shows the cumulative return
        so far. It is not anyone&apos;s real account and says nothing about next year.
      </p>
      {res.loading ? (
        <Skeleton className="h-56" />
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
          <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-md border border-evidence-line bg-surface-sunken/60 px-3 py-2 text-sm">
            <span className="text-muted">Return over the period:</span>{" "}
            <PctValue value={sim.totalReturnPct} className="text-base font-semibold" />
          </p>
        </>
      )}
      {sim ? <DataSourceTag provenance={sim.provenance} compact /> : null}
    </div>
  );
}
