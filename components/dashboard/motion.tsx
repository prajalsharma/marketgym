"use client";

/**
 * Small motion pieces for the Overview dashboard. Each one renders the final
 * state immediately under reduced motion.
 */
import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT, TIMING, spring } from "@/lib/client/motion";
import { cn } from "@/lib/utils";

/** A list row that lifts 2px on hover. */
export function LiftRow({ className, children }: { className?: string; children: React.ReactNode }) {
  const reduce = useReducedMotion() ?? false;
  return (
    <motion.li
      className={className}
      whileHover={reduce ? undefined : { y: -2 }}
      transition={spring.snappy}
    >
      {children}
    </motion.li>
  );
}

/** Progress bar whose fill grows from zero to the real value once, when it scrolls into view. */
export function GrowBar({
  value,
  label,
  index = 0,
  tone = "accent",
  size = "md",
  className,
}: {
  /** 0..100 */
  value: number;
  /** Accessible name. */
  label: string;
  /** Position in a list; later bars start a beat later. */
  index?: number;
  tone?: "accent" | "success" | "neutral";
  size?: "sm" | "md";
  className?: string;
}) {
  const reduce = useReducedMotion() ?? false;
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cn(
        "overflow-hidden rounded-full bg-surface-sunken shadow-[inset_0_0_0_1px_var(--line)]",
        size === "sm" ? "h-1.5" : "h-2",
        className,
      )}
    >
      <motion.div
        className={cn(
          "h-full rounded-full",
          tone === "accent" && "bg-accent",
          tone === "success" && "bg-success",
          tone === "neutral" && "bg-line-strong",
        )}
        initial={reduce ? false : { width: 0 }}
        whileInView={{ width: `${clamped}%` }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: TIMING.barFill, ease: EASE_OUT, delay: 0.15 + Math.min(index, 10) * TIMING.stagger }}
        style={reduce ? { width: `${clamped}%` } : undefined}
      />
    </div>
  );
}
