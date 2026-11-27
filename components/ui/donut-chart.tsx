"use client";

/**
 * Donut chart with drawn-in arcs, hover/focus focus-plus-context and a centre
 * readout. Adapted from EasyUI's donut-chart and chart primitives
 * (github.com/Surajmaurya1/easyui, src/components/ui/DonutChart.tsx and
 * src/lib/chart-primitives.tsx): restyled to MarketGym tokens and the fixed
 * categorical chart palette, legend reduced to a plain list, reduced-motion safe.
 * Values are shown exactly as given; the chart never invents data.
 */
import * as React from "react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { EASE_OUT } from "@/lib/client/motion";
import { cn } from "@/lib/utils";

export interface DonutDatum {
  label: string;
  value: number;
  /** CSS colour; defaults to the categorical chart slot for its index */
  color?: string;
}

export interface DonutChartProps {
  data: DonutDatum[];
  size?: number;
  thickness?: number;
  /** centre text when nothing is hovered */
  centerLabel: string;
  /** centre value when nothing is hovered */
  centerValue: React.ReactNode;
  formatValue: (n: number) => string;
  /** accessible summary of the whole chart */
  label: string;
  showLegend?: boolean;
  className?: string;
}

/** Six categorical slots in fixed order (docs/DESIGN_SYSTEM.md); a seventh+ series folds to neutral. */
export const CHART_SLOTS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];
export function chartSlot(i: number): string {
  return CHART_SLOTS[i] ?? "var(--chart-neutral)";
}

const pt = (cx: number, cy: number, r: number, a: number) => ({ x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) });
function arcPath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p0 = pt(cx, cy, r, a0);
  const p1 = pt(cx, cy, r, a1);
  return `M${p0.x.toFixed(2)} ${p0.y.toFixed(2)}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
}

function Arc({
  c,
  r,
  a0,
  a1,
  color,
  width,
  dim,
  intro,
  delay,
}: {
  c: number;
  r: number;
  a0: number;
  a1: number;
  color: string;
  width: number;
  dim: boolean;
  intro: boolean;
  delay: number;
}) {
  const s = useMotionValue(a0);
  const e = useMotionValue(intro ? a0 : a1);
  const first = React.useRef(true);
  const d = useTransform<number, string>([s, e], ([x, y]) => arcPath(c, c, r, x, Math.max(y, x + 0.0004)));

  React.useEffect(() => {
    const isIntro = first.current && intro;
    const morph = { type: "spring", duration: 0.6, bounce: 0 } as const;
    const c1 = animate(s, a0, isIntro ? { duration: 0 } : morph);
    const c2 = animate(e, a1, isIntro ? { duration: 0.9, ease: EASE_OUT, delay } : morph);
    first.current = false;
    return () => {
      c1.stop();
      c2.stop();
    };
  }, [a0, a1, intro, delay, s, e]);

  return (
    <motion.path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      style={{ opacity: dim ? 0.3 : 1, transition: "opacity 180ms, stroke-width 180ms" }}
    />
  );
}

export function DonutChart({
  data,
  size = 176,
  thickness = 14,
  centerLabel,
  centerValue,
  formatValue,
  label,
  showLegend = true,
  className,
}: DonutChartProps) {
  const reduce = useReducedMotion() ?? false;
  const [active, setActive] = React.useState<number | null>(null);

  const r = size / 2 - thickness / 2 - 3;
  const c = size / 2;
  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0);
  const pad = 2.5 / r + thickness / 2 / r;
  const fractions = data.map((d) => (total > 0 ? Math.max(0, d.value) / total : 0));
  const segs = data.map((d, i) => {
    const f = fractions[i];
    const before = fractions.slice(0, i).reduce((sum, x) => sum + x, 0);
    const a0 = before * Math.PI * 2;
    const a1 = (before + f) * Math.PI * 2;
    const room = a1 - a0 - 2 * pad;
    const mid = (a0 + a1) / 2;
    return {
      ...d,
      i,
      f,
      color: d.color ?? chartSlot(i),
      a0: room > 0 ? a0 + pad : mid,
      a1: room > 0 ? a1 - pad : mid,
    };
  });
  const act = active !== null ? segs[active] : null;

  return (
    <div className={cn("flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label={label} className="block overflow-visible">
          <circle cx={c} cy={c} r={r} fill="none" stroke="var(--line)" strokeWidth={thickness} />
          {segs.map((sg) => (
            <Arc
              key={`${sg.label}-${sg.i}`}
              c={c}
              r={r}
              a0={sg.a0}
              a1={sg.a1}
              color={sg.color}
              width={active === sg.i ? thickness + 4 : thickness}
              dim={active !== null && active !== sg.i}
              intro={!reduce}
              delay={0.1 + sg.i * 0.08}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={act ? act.i : "total"}
              className="max-w-[70%]"
              initial={{ opacity: 0, y: reduce ? 0 : 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : -3 }}
              transition={{ duration: 0.16, ease: EASE_OUT }}
            >
              <p className="truncate text-xs text-muted">{act ? act.label : centerLabel}</p>
              <p className="text-lg font-semibold leading-tight tabular">{act ? formatValue(act.value) : centerValue}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {showLegend && segs.length > 0 ? (
        <ul className="w-full min-w-0 flex-1 space-y-0.5" aria-label="Legend">
          {segs.map((sg) => (
            <li
              key={`${sg.label}-${sg.i}`}
              tabIndex={0}
              onPointerEnter={(e) => e.pointerType === "mouse" && setActive(sg.i)}
              onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
              onFocus={() => setActive(sg.i)}
              onBlur={() => setActive(null)}
              className={cn(
                "flex h-8 items-center gap-2.5 rounded-sm px-2 text-sm transition-colors duration-(--duration-fast)",
                active === sg.i ? "bg-surface-raised" : "hover:bg-surface-raised",
              )}
            >
              <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: sg.color }} />
              <span className="min-w-0 flex-1 truncate">{sg.label}</span>
              <span className="tabular font-mono text-muted">{formatValue(sg.value)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
