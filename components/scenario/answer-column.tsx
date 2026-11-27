"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Loader2, RotateCcw } from "lucide-react";
import type { Scenario, ScenarioAttempt, NextMission } from "@/lib/types/learning";
import type { ScenarioAttemptResponse } from "@/lib/types/api";
import { Button, Label, Textarea } from "@/components/ui";
import { HintLadder } from "@/components/shared/hint-ladder";
import { EvaluationPanel, type MisconceptionLookup } from "./evaluation-panel";
import { AttemptHistory } from "./attempt-history";
import { apiPost, describeError } from "@/lib/client/api";
import { EASE_OUT, spring } from "@/lib/client/motion";
import { cn } from "@/lib/utils";

const MIN_CHARS = 20;

interface Props {
  scenario: Scenario;
  previousAttempts?: ScenarioAttempt[];
  misconceptions?: MisconceptionLookup;
  skillNames?: Record<string, string>;
  /** landing preview: no API calls; shows a sample evaluation instead of submitting */
  preview?: { evaluation: ScenarioAttempt["evaluation"]; ctaHref: string };
  className?: string;
}

/**
 * The learner's side of the lab. Visually distinct from evidence (tinted surface),
 * so what is given and what is argued never blur together.
 */
export function AnswerColumn({ scenario, previousAttempts = [], misconceptions, skillNames, preview, className }: Props) {
  const textId = useId();
  const [answer, setAnswer] = useState("");
  const [hintsUsed, setHintsUsed] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScenarioAttemptResponse | null>(null);
  const [previewResult, setPreviewResult] = useState(false);
  const [history, setHistory] = useState<ScenarioAttempt[]>(previousAttempts);

  const reduce = useReducedMotion() ?? false;
  const sectionRef = useRef<HTMLElement>(null);

  const chars = answer.trim().length;
  const tooShort = chars < MIN_CHARS;

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (tooShort || pending) return;
    if (preview) {
      setPreviewResult(true);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await apiPost<ScenarioAttemptResponse>(`/api/scenarios/${encodeURIComponent(scenario.id)}/attempt`, {
        answer: answer.trim(),
        hintsUsed,
      });
      setResult(res);
      setHistory((h) => [res.attempt, ...h]);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setPending(false);
    }
  }

  function reset() {
    setResult(null);
    setPreviewResult(false);
    setAnswer("");
    setHintsUsed(0);
    setError(null);
  }

  const showEvaluation = result !== null || (preview && previewResult);
  const nextMission: NextMission | null = result?.nextMission ?? null;
  const words = answer.trim() ? answer.trim().split(/\s+/).length : 0;

  // On desktop the column scrolls on its own; bring the verdict into view when it lands.
  useEffect(() => {
    const el = sectionRef.current;
    if (showEvaluation && el && el.scrollHeight > el.clientHeight) el.scrollTo({ top: 0 });
  }, [showEvaluation]);

  const swap = {
    initial: reduce ? false : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: reduce ? { opacity: 0 } : { opacity: 0, y: -6 },
    transition: { duration: 0.28, ease: EASE_OUT },
  } as const;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="answer-heading"
      className={cn(
        "rounded-lg border border-learner-line bg-learner p-4 shadow-sm inset-shadow-[0_1px_0_rgb(255_255_255/0.04)] sm:p-5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="answer-heading" className="text-lg font-semibold tracking-tight">
          Your analysis
        </h2>
        {showEvaluation ? (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-md border border-learner-line px-2.5 py-1 text-xs font-medium text-learner-fg transition-[background-color,transform] duration-(--duration-fast) hover:bg-learner-soft active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Try again
          </button>
        ) : null}
      </div>

      <ol className="mt-4 space-y-2.5 text-sm leading-relaxed">
        {scenario.questions.map((q, i) => (
          <li key={q.id} className="flex gap-3">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm bg-learner-soft font-mono text-xs font-medium text-learner-fg">
              {i + 1}
            </span>
            <span>{q.prompt}</span>
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait" initial={false}>
        {showEvaluation ? (
          <motion.div key="evaluation" className="mt-6" {...swap}>
            <div className="mb-5 rounded-md border border-line bg-bg p-3.5 text-sm">
              <p className="text-xs text-muted">Your answer</p>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">{answer}</p>
            </div>
            <EvaluationPanel
              evaluation={result?.evaluation ?? preview!.evaluation}
              rubric={scenario.rubric}
              hintsUsed={hintsUsed}
              nextMission={nextMission}
              misconceptions={misconceptions}
              skillNames={skillNames}
              ctaOverride={preview ? { href: preview.ctaHref, label: "Sign up to get real feedback" } : undefined}
            />
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={submit} className="mt-5 space-y-4" {...swap}>
            <div>
              <Label htmlFor={textId}>Answer all questions in one written response. Cite the evidence you use.</Label>
              <div
                className={cn(
                  "mt-2 overflow-hidden rounded-lg border border-line-strong bg-bg shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]",
                  "transition-[border-color,box-shadow] duration-(--duration-fast)",
                  "focus-within:border-accent focus-within:ring-2 focus-within:ring-ring/40",
                )}
              >
                <Textarea
                  id={textId}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={9}
                  placeholder="Start with what the data shows, then what you infer from it, then what would change your mind."
                  className="block rounded-none border-0 bg-transparent px-3.5 py-3 focus-visible:border-0 focus-visible:ring-0"
                  aria-describedby={`${textId}-count`}
                  disabled={pending}
                />
                <div className="flex items-center gap-3 border-t border-line bg-surface-sunken px-3.5 py-2">
                  <span aria-hidden="true" className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-line">
                    <motion.span
                      className={cn("block h-full origin-left rounded-full", tooShort ? "bg-accent" : "bg-success")}
                      initial={false}
                      animate={{ scaleX: Math.min(1, chars / MIN_CHARS) }}
                      transition={spring.snappy}
                    />
                  </span>
                  <p
                    id={`${textId}-count`}
                    className={cn(
                      "flex items-center gap-1 text-xs tabular transition-colors duration-(--duration-fast)",
                      tooShort ? "text-muted" : "text-success",
                    )}
                  >
                    {tooShort ? null : <Check className="size-3.5" aria-hidden="true" />}
                    {tooShort ? `${MIN_CHARS - chars} more character${MIN_CHARS - chars === 1 ? "" : "s"} needed` : `${chars} characters`}
                  </p>
                  <span aria-hidden="true" className="ml-auto text-xs text-subtle tabular">
                    {words} word{words === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            </div>

            <HintLadder
              hints={scenario.hints}
              revealed={hintsUsed}
              onReveal={() => setHintsUsed((n) => Math.min(scenario.hints.length, n + 1))}
              disabled={pending}
              note="Each hint lowers the score a little."
            />

            <AnimatePresence initial={false}>
              {error ? (
                <motion.p
                  key="error"
                  role="alert"
                  className="rounded-md border border-danger bg-danger-soft p-3 text-sm"
                  initial={reduce ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: EASE_OUT }}
                >
                  {error}
                </motion.p>
              ) : null}
            </AnimatePresence>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" size="lg" disabled={tooShort || pending} className="active:scale-[0.98]">
                {pending ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
                {pending ? "Grading…" : preview ? "See sample feedback" : "Submit for grading"}
              </Button>
              {preview ? (
                <Link href={preview.ctaHref} className="text-sm text-accent underline-offset-4 hover:underline">
                  or sign up for the real thing
                </Link>
              ) : null}
            </div>
            {pending ? (
              <p className="animate-fade-in text-xs text-muted" aria-live="polite">
                Checking your answer against the frozen evidence and the rubric.
              </p>
            ) : null}
          </motion.form>
        )}
      </AnimatePresence>

      {!preview && history.length > 0 ? (
        <AttemptHistory attempts={history} className="mt-6" />
      ) : null}
    </section>
  );
}
