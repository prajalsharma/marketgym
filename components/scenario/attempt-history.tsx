"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { ScenarioAttempt } from "@/lib/types/learning";
import { RUBRIC_LABEL } from "@/lib/client/labels";
import { formatDateTime } from "@/lib/client/format";
import { EASE_OUT } from "@/lib/client/motion";
import { cn } from "@/lib/utils";

interface Props {
  attempts: ScenarioAttempt[];
  className?: string;
}

const RUBRIC_ORDER = ["factual", "evidence", "reasoning", "uncertainty"] as const;

function scoreTone(score: number) {
  return score >= 80 ? "text-success" : score >= 60 ? "text-accent" : score >= 40 ? "text-warning" : "text-danger";
}

/** Collapsed by default; one row per earlier attempt on this scenario. Each row opens to the full answer. */
export function AttemptHistory({ attempts, className }: Props) {
  const listId = useId();
  const reduce = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  const [openRow, setOpenRow] = useState<string | null>(null);

  if (attempts.length === 0) return null;

  const expand = {
    initial: { height: 0, opacity: 0 },
    animate: { height: "auto", opacity: 1 },
    exit: { height: 0, opacity: 0 },
    transition: reduce ? { duration: 0 } : { duration: 0.32, ease: EASE_OUT },
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-line bg-surface shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]",
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left text-sm outline-none transition-colors duration-(--duration-fast) hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <span>
          <span className="font-medium">Previous attempts</span>
          <span className="ml-2 text-muted tabular">
            {attempts.length} · best {Math.max(...attempts.map((a) => a.evaluation.totalScore))}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn("size-4 shrink-0 text-muted transition-transform duration-(--duration-base)", open && "rotate-180")}
        />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div key="list" id={listId} className="overflow-hidden" {...expand}>
            <ul className="divide-y divide-line border-t border-line">
              {attempts.map((a) => {
                const rowOpen = openRow === a.id;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      aria-expanded={rowOpen}
                      onClick={() => setOpenRow(rowOpen ? null : a.id)}
                      className="block w-full px-3.5 py-2.5 text-left text-sm outline-none transition-colors duration-(--duration-fast) hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="font-mono tabular-nums">
                          <span className={cn("font-semibold", scoreTone(a.evaluation.totalScore))}>
                            {a.evaluation.totalScore}
                          </span>
                          <span className="text-muted"> / 100</span>
                        </span>
                        <span className="text-right text-xs text-muted">
                          {formatDateTime(a.createdAt)} · {a.hintsUsed} hint{a.hintsUsed === 1 ? "" : "s"} ·{" "}
                          {a.evaluation.evaluatorMode === "llm" ? "AI + rules" : "rules"}
                        </span>
                      </span>
                      {rowOpen ? null : (
                        <span className="mt-1 line-clamp-2 block text-xs text-muted">{a.submittedAnswer}</span>
                      )}
                    </button>
                    <AnimatePresence initial={false}>
                      {rowOpen ? (
                        <motion.div key="detail" className="overflow-hidden" {...expand}>
                          <div className="space-y-3 bg-surface-sunken px-3.5 py-3">
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                              {RUBRIC_ORDER.map((key) => (
                                <div key={key} className="flex items-baseline justify-between gap-2">
                                  <dt className="text-muted">{RUBRIC_LABEL[key]}</dt>
                                  <dd className="font-mono tabular-nums">{a.evaluation.rubricScores[key]}</dd>
                                </div>
                              ))}
                            </dl>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{a.submittedAnswer}</p>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
