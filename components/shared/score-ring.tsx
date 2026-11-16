"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  /** 0..100 */
  value: number;
  size?: number;
  label?: string;
  className?: string;
}

/** Score as an arc + number. Animates from 0 on mount (CSS transition, reduced-motion safe). */
export function ScoreRing({ value, size = 128, label = "Score", className }: Props) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(Math.max(0, Math.min(100, value))));
    return () => cancelAnimationFrame(id);
  }, [value]);

  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - shown / 100);
  const tone =
    value >= 80 ? "text-success" : value >= 60 ? "text-accent" : value >= 40 ? "text-warning" : "text-danger";

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      role="img"
      aria-label={`${label}: ${Math.round(value)} out of 100`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-border" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={cn("score-ring-arc", tone)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold tabular-nums leading-none">{Math.round(value)}</span>
        <span className="mt-1 text-xs text-muted">of 100</span>
      </div>
    </div>
  );
}
