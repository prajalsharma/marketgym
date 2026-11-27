"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { EASE_OUT, TIMING } from "@/lib/client/motion";
import { cn } from "@/lib/utils";

interface Props {
  /** 0..100 */
  value: number;
  size?: number;
  label?: string;
  className?: string;
}

/** Score as an arc + number. Arc draws and the number rolls up from 0 on mount (reduced-motion safe). */
export function ScoreRing({ value, size = 128, label = "Score", className }: Props) {
  const reduce = useReducedMotion() ?? false;
  const clamped = Math.max(0, Math.min(100, value));

  const stroke = size >= 96 ? 10 : 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped / 100);
  const tone =
    value >= 80 ? "text-success" : value >= 60 ? "text-accent" : value >= 40 ? "text-warning" : "text-danger";
  const disc =
    value >= 80 ? "bg-success-soft" : value >= 60 ? "bg-accent-soft" : value >= 40 ? "bg-warning-soft" : "bg-danger-soft";
  const numberSize = size >= 120 ? "text-3xl" : size >= 96 ? "text-2xl" : "text-xl";

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      role="img"
      aria-label={`${label}: ${Math.round(value)} out of 100`}
      style={{ width: size, height: size }}
    >
      {/* soft tinted disc inside the ring so the score reads as one object */}
      <motion.div
        aria-hidden="true"
        className={cn("absolute rounded-full", disc)}
        style={{ inset: stroke + 4 }}
        initial={reduce ? false : { opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.15 }}
      />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} stroke="var(--line)" className="opacity-80" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={reduce ? { duration: 0 } : { duration: TIMING.countUp + 0.3, ease: EASE_OUT, delay: 0.1 }}
          className={tone}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <AnimatedNumber
          value={Math.round(value)}
          countUp
          className={cn("font-semibold leading-none tracking-tight", numberSize)}
        />
        <span className="mt-1 text-xs text-muted">of 100</span>
      </div>
    </div>
  );
}
