"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { MasteryStatus } from "@/lib/types/learning";
import { MasteryIndicator } from "@/components/ui";
import { EASE_OUT, TIMING } from "@/lib/client/motion";
import { cn } from "@/lib/utils";

export interface PassportSkill {
  id: string;
  name: string;
  unlocked: boolean;
  status: MasteryStatus;
  /** 0..100, undefined when the skill has no mastery record yet */
  score?: number;
}

/**
 * A bar that fills to its value when it scrolls into view. Decorative: the
 * figure it shows is always printed next to it, so it is hidden from screen readers.
 */
export function MasteryBar({
  value,
  tone = "accent",
  size = "sm",
  delay = 0,
  className,
}: {
  /** 0..100 */
  value: number;
  tone?: "accent" | "success" | "neutral";
  size?: "sm" | "md";
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion() ?? false;
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <span
      aria-hidden="true"
      className={cn("block overflow-hidden rounded-full bg-surface-sunken", size === "sm" ? "h-1.5" : "h-2.5", className)}
    >
      <motion.span
        className={cn(
          "block h-full rounded-full",
          tone === "success" ? "bg-success" : tone === "neutral" ? "bg-line-strong" : "bg-accent",
        )}
        initial={reduce ? false : { width: 0 }}
        whileInView={{ width: `${clamped}%` }}
        viewport={{ once: true, margin: "0px 0px -24px 0px" }}
        transition={reduce ? { duration: 0 } : { duration: TIMING.barFill, ease: EASE_OUT, delay }}
        style={reduce ? { width: `${clamped}%` } : undefined}
      />
    </span>
  );
}

/** One module of the skill passport: how many of its skills are mastered, then each skill with its own bar. */
export function ModulePassport({ title, skills, index }: { title: string; skills: PassportSkill[]; index: number }) {
  const reduce = useReducedMotion() ?? false;
  const masteredCount = skills.filter((s) => s.status === "mastered").length;
  const all = skills.length > 0 && masteredCount === skills.length;
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: TIMING.pageRise, ease: EASE_OUT, delay: Math.min(index, 6) * TIMING.stagger }}
      className="px-5 py-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold">{title}</p>
        <p className={cn("tabular whitespace-nowrap text-xs", all ? "text-success" : "text-muted")}>
          {masteredCount} of {skills.length} mastered
        </p>
      </div>
      <MasteryBar
        className="mt-2"
        size="md"
        tone={all ? "success" : "accent"}
        value={skills.length > 0 ? (masteredCount / skills.length) * 100 : 0}
      />
      <ul className="mt-3">
        {skills.map((s, i) => (
          <li
            key={s.id}
            className="-mx-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-md px-2 py-2 text-sm transition-colors duration-150 hover:bg-surface-raised sm:grid-cols-[minmax(0,1fr)_6rem_auto]"
          >
            <span className={cn("min-w-0", s.unlocked ? "font-medium" : "text-muted")}>{s.name}</span>
            <MasteryBar
              className="order-last col-span-2 sm:order-none sm:col-span-1"
              value={s.score ?? 0}
              tone={s.status === "mastered" ? "success" : "accent"}
              delay={0.1 + Math.min(i, 8) * 0.04}
            />
            <MasteryIndicator status={s.status} score={s.score} size="sm" className="justify-self-end" />
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
