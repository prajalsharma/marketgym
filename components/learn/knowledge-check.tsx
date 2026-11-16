"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import type { KnowledgeCheck as KnowledgeCheckType } from "@/lib/types/curriculum";
import type { KnowledgeCheckSubmitResponse } from "@/lib/types/api";
import { apiPost, describeError } from "@/lib/client/api";
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

/**
 * One multiple-choice check. Options are a list of buttons; after answering, the
 * chosen option is marked and the explanation appears. No scoring is done here.
 */
export function KnowledgeCheck({ check, onSubmit, onResult, title = "Quick check", className }: Props) {
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

  return (
    <div className={cn("rounded-md border border-line p-4", className)}>
      <p className="text-xs text-muted">{title}</p>
      <p className="mt-1 text-sm font-medium leading-snug">{check.prompt}</p>
      <ul className="mt-3 space-y-2" role="group" aria-label="Options">
        {check.options.map((opt) => {
          const isChosen = chosen === opt.id;
          const state = result && isChosen ? (result.correct ? "correct" : "wrong") : "idle";
          return (
            <li key={opt.id}>
              <button
                type="button"
                onClick={() => choose(opt.id)}
                disabled={pending || result !== null}
                aria-pressed={isChosen}
                className={cn(
                  "flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors duration-150",
                  "outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  state === "idle" && "border-line hover:bg-surface-raised disabled:opacity-60",
                  state === "correct" && "border-success bg-success-soft",
                  state === "wrong" && "border-danger bg-danger-soft",
                  result && !isChosen && "opacity-60",
                )}
              >
                <span className="mt-0.5 size-4 shrink-0">
                  {state === "correct" ? (
                    <Check className="size-4 text-success" aria-label="Correct" />
                  ) : state === "wrong" ? (
                    <X className="size-4 text-danger" aria-label="Not quite" />
                  ) : (
                    <span className="block size-4 rounded-full border border-line" aria-hidden="true" />
                  )}
                </span>
                <span>{opt.text}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {pending ? (
        <p className="mt-2 text-xs text-muted" aria-live="polite">
          Checking…
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {result ? (
        <div className="hint-reveal mt-3 rounded-md bg-surface-raised p-3 text-sm leading-relaxed" aria-live="polite">
          <p className="font-medium">{result.correct ? "Correct." : "Not quite."}</p>
          <p className="mt-1">{result.explanation}</p>
        </div>
      ) : null}
    </div>
  );
}
