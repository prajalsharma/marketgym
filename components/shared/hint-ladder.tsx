"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui";
import { EASE_OUT, spring } from "@/lib/client/motion";
import { cn } from "@/lib/utils";

interface Props {
  hints: readonly string[];
  revealed: number;
  onReveal: () => void;
  disabled?: boolean;
  pending?: boolean;
  /** shown under the button, e.g. "Each hint lowers the score a little." */
  note?: string;
  className?: string;
}

/**
 * Graduated hints. Revealed hints stay visible; the next one unlocks on demand.
 * No hint content is rendered until the learner asks for it.
 */
export function HintLadder({ hints, revealed, onReveal, disabled, pending, note, className }: Props) {
  const total = hints.length;
  const done = revealed >= total;
  const reduce = useReducedMotion();
  return (
    <div className={cn("space-y-3", className)}>
      <ol className="space-y-0" aria-live="polite">
        <AnimatePresence initial={false}>
          {hints.slice(0, revealed).map((hint, i) => (
            <motion.li
              key={i}
              layout={reduce ? false : "position"}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.28, ease: EASE_OUT }}
              className="relative flex gap-3 pb-2 text-sm leading-relaxed last:pb-0"
            >
              {/* rail joining this rung to the next */}
              {i < revealed - 1 ? <span className="absolute top-7 bottom-0 left-3 w-px bg-line-strong" aria-hidden="true" /> : null}
              <span className="tabular relative mt-2.5 grid size-6 shrink-0 place-items-center rounded-md bg-accent-soft font-mono text-xs text-accent">
                {i + 1}/{total}
              </span>
              <span className="flex-1 rounded-lg border border-line bg-surface p-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]">{hint}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onReveal}
          disabled={disabled || done || pending}
          className="active:scale-[0.98]"
        >
          <Lightbulb className="size-4" aria-hidden="true" />
          {done ? "No more hints" : revealed === 0 ? "Ask for a hint" : `Next hint (${revealed + 1}/${total})`}
        </Button>
        {total > 0 ? (
          <span className="flex items-center gap-1" aria-hidden="true">
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className="relative h-1.5 w-6 overflow-hidden rounded-sm bg-surface-overlay">
                <motion.span
                  className="absolute inset-0 origin-left rounded-sm bg-accent"
                  initial={false}
                  animate={{ scaleX: i < revealed ? 1 : 0 }}
                  transition={reduce ? { duration: 0 } : spring.gentle}
                />
              </span>
            ))}
          </span>
        ) : null}
        {note ? <span className="text-xs text-muted">{note}</span> : null}
      </div>
    </div>
  );
}
