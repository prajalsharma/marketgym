"use client";

import type { CSSProperties } from "react";
import { AlertTriangle } from "lucide-react";
import type { PortfolioAnalysis } from "@/lib/types/wealth";
import { DataSourceTag, Stat } from "@/components/ui";
import { formatDateTime, formatNumber, formatPercent } from "@/lib/client/format";
import { UNUSUAL_NOTE, distinctProvenance, isUnusualPct } from "@/lib/client/wealth";

function tone(v: number | null): "success" | "danger" | "default" | "muted" {
  if (v === null) return "muted";
  return v < 0 ? "danger" : v > 0 ? "success" : "default";
}

/** The server's deterministic analysis of a saved practice portfolio. Every figure comes from the response. */
export function AnalysisPanel({ analysis: a }: { analysis: PortfolioAnalysis }) {
  const tags = distinctProvenance(a.provenance);
  return (
    <section
      aria-labelledby="analysis-heading"
      className="animate-rise-in space-y-5 rounded-lg border border-evidence-line bg-evidence p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.04),var(--shadow-sm)] sm:p-6"
    >
      <div className="space-y-1">
        <h2 id="analysis-heading" className="text-xl font-semibold tracking-tight">
          Analysis
        </h2>
        <p className="text-sm text-muted">Worked out from SoDEX Wealth data at save time. No AI here, just arithmetic on your weights.</p>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-evidence-line bg-evidence-line sm:grid-cols-3 [&>*]:bg-evidence [&>*]:p-3.5">
        <Stat
          label="Effective holdings"
          value={formatNumber(a.effectiveHoldings, 1)}
          hint={`Concentration score ${formatNumber(a.concentrationHhi, 0)} of 10,000`}
        />
        <Stat label="Largest weight" value={formatPercent(a.largestWeightPct, { signed: false, digits: 0 })} />
        <Stat
          label="In market-hours assets"
          value={formatPercent(a.marketHoursSharePct, { signed: false, digits: 0 })}
          hint="The rest trades 24/7"
        />
        <Stat
          label="Weighted fee"
          value={a.weightedMgmtFeePct === null ? "—" : formatPercent(a.weightedMgmtFeePct, { signed: false })}
          hint={a.weightedMgmtFeePct === null ? "Some fees not published" : "Per year"}
        />
        <Stat
          label="Weighted 1Y return"
          value={formatPercent(a.weightedRoi1YPct)}
          tone={isUnusualPct(a.weightedRoi1YPct) ? "default" : tone(a.weightedRoi1YPct)}
          hint={isUnusualPct(a.weightedRoi1YPct) ? UNUSUAL_NOTE : "Past, not a forecast"}
        />
        <Stat
          label="Weighted weekly-buying return"
          value={formatPercent(a.weightedDcaReturn1YPct)}
          tone={tone(a.weightedDcaReturn1YPct)}
          hint="SoDEX 1Y simulation"
        />
      </div>

      <div>
        <h3 className="flex items-baseline gap-2 text-base font-semibold">
          Things to look at
          {a.flags.length > 0 ? <span className="tabular font-mono text-xs font-normal text-muted">{a.flags.length}</span> : null}
        </h3>
        {a.flags.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nothing stood out in the numbers. Your rationale still has to explain the choices.</p>
        ) : (
          <ul className="stagger-in mt-3 space-y-2 text-sm">
            {a.flags.map((f, i) => (
              <li
                key={f}
                style={{ "--i": i } as CSSProperties}
                className="flex gap-2.5 rounded-md border border-warning/30 bg-warning-soft px-3 py-2.5 leading-snug"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-evidence-line pt-4 text-xs text-muted">
        <span>Evidence as of {formatDateTime(a.evidenceAsOf)}</span>
        {tags.map((p) => (
          <DataSourceTag key={`${p.provider}:${p.kind}`} provenance={p} compact />
        ))}
      </div>
    </section>
  );
}
