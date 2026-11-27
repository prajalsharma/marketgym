"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import type { KnowledgeCheck as KnowledgeCheckType } from "@/lib/types/curriculum";
import type { KnowledgeCheckSubmitResponse } from "@/lib/types/api";
import { apiPost, describeError } from "@/lib/client/api";
import { EASE_OUT, spring } from "@/lib/client/motion";
import { cn } from "@/lib/utils";

interface Props {
  check: Pick<KnowledgeCheckType, "id" | "prompt"> & { options: Array<{ id: string; text: string }> };
  /** override the POST (e.g. review flow). Default posts to /api/learning/knowledge-check */
  onSubmit?: (optionId: string) => Promise<{ correct: boolean; explanation: string }>;
  onResult?: (result: { correct: boolean; optionId: string }) => void;
  /** heading shown above the prompt */
  title?: string;
  className?: string;
}

const LETTERS = "ABCDEFGH";

/**
 * One multiple-choice check. Options are a list of buttons; after answering, the
 * chosen option is marked and the explanation appears. No scoring is done here.
 */
export function KnowledgeCheck({ check, onSubmit, onResult, title = "Quick check", className }: Props) {
  const reduce = useReducedMotion();
  const [chosen, setChosen] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ correct: boolean; explanation: string } | null>(null);

  async function choose(optionId: string) {
    if (pending || result) return;
    setChosen(optionId);
    setPending(true);
    setError(null);
    try {
      const r = onSubmit
        ? await onSubmit(optionId)
        : await apiPost<KnowledgeCheckSubmitResponse>("/api/learning/knowledge-check", {
            knowledgeCheckId: check.id,
            optionId,
          });
      setResult({ correct: r.correct, explanation: r.explanation });
      onResult?.({ correct: r.correct, optionId });
    } catch (err) {
      setError(describeError(err));
      setChosen(null);
    } finally {
      setPending(false);
    }
  }

  const locked = pending || result !== null;

  return (
    <div
      className={cn(
        "rounded-lg border bg-surface p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] transition-colors duration-300 sm:p-5",
        result ? (result.correct ? "border-success/50" : "border-danger/50") : "border-line",
        className,
      )}
    >
      <p className="text-xs text-muted">{title}</p>
      <p className="mt-1.5 text-base font-semibold leading-snug text-fg text-pretty">{check.prompt}</p>
      <ul className="mt-4 space-y-2" role="group" aria-label="Options">
        {check.options.map((opt, i) => {
          const isChosen = chosen === opt.id;
          const state = result && isChosen ? (result.correct ? "correct" : "wrong") : "idle";
          const checking = pending && isChosen;
          return (
            <li key={opt.id}>
              <motion.button
                type="button"
                onClick={() => choose(opt.id)}
                disabled={locked}
                aria-pressed={isChosen}
                whileHover={reduce || locked ? undefined : { y: -2 }}
                whileTap={reduce || locked ? undefined : { scale: 0.98 }}
                animate={
                  reduce
                    ? undefined
                    : state === "wrong"
                      ? { x: [0, -5, 5, -3, 3, 0] }
                      : state === "correct"
                        ? { scale: [1, 1.015, 1] }
                        : { x: 0, scale: 1 }
                }
                transition={state === "idle" ? spring.snappy : { duration: 0.4, ease: EASE_OUT }}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border px-3.5 py-3 text-left text-sm leading-relaxed transition-[background-color,border-color,opacity] duration-200",
                  "outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  state === "idle" && !checking && "border-line bg-surface hover:border-line-strong hover:bg-surface-raised",
                  checking && "border-accent bg-accent-soft",
                  state === "correct" && "border-success bg-success-soft",
                  state === "wrong" && "border-danger bg-danger-soft",
                  pending && !isChosen && "opacity-50",
                  result && !isChosen && "opacity-50",
                )}
              >
                <span
                  className={cn(
                    "mt-px flex size-6 shrink-0 items-center justify-center rounded-md border text-xs font-semibold transition-colors duration-200",
                    state === "idle" && !checking && "border-line bg-surface-sunken text-muted",
                    checking && "border-accent bg-accent text-accent-fg",
                    state === "correct" && "border-success bg-success text-bg",
                    state === "wrong" && "border-danger bg-danger text-bg",
                  )}
                >
                  {state === "correct" ? (
                    <Check className="size-3.5" aria-label="Correct" />
                  ) : state === "wrong" ? (
                    <X className="size-3.5" aria-label="Not quite" />
                  ) : checking ? (
                    <Loader2 className={cn("size-3.5", !reduce && "animate-spin")} aria-hidden="true" />
                  ) : (
                    <span aria-hidden="true">{LETTERS[i] ?? i + 1}</span>
                  )}
                </span>
                <span className="min-w-0 flex-1">{opt.text}</span>
              </motion.button>
            </li>
          );
        })}
      </ul>
      {pending ? (
        <p className="mt-3 text-xs text-muted" aria-live="polite">
          Checking…
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 rounded-md border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <AnimatePresence initial={false}>
        {result ? (
          <motion.div
            key="explanation"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduce ? { duration: 0 } : spring.gentle}
            className="overflow-hidden"
          >
            <div
              className={cn(
                "mt-4 flex gap-3 rounded-lg border p-3.5 text-sm leading-relaxed",
                result.correct ? "border-success/40 bg-success-soft" : "border-danger/40 bg-danger-soft",
              )}
              aria-live="polite"
            >
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-bg",
                  result.correct ? "bg-success" : "bg-danger",
                )}
                aria-hidden="true"
              >
                {result.correct ? <Check className="size-3" /> : <X className="size-3" />}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-fg">{result.correct ? "Correct." : "Not quite."}</p>
                <p className="mt-1 text-fg">{result.explanation}</p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
