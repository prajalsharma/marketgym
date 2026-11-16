"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { Scenario, ScenarioAttempt, NextMission } from "@/lib/types/learning";
import type { ScenarioAttemptResponse } from "@/lib/types/api";
import { Button, Label, Textarea } from "@/components/ui";
import { HintLadder } from "@/components/shared/hint-ladder";
import { EvaluationPanel, type MisconceptionLookup } from "./evaluation-panel";
import { AttemptHistory } from "./attempt-history";
import { apiPost, describeError } from "@/lib/client/api";
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

  return (
    <section
      aria-labelledby="answer-heading"
      className={cn("rounded-lg border border-learner-line bg-learner p-4 sm:p-5", className)}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="answer-heading" className="text-lg font-semibold">
          Your analysis
        </h2>
        {showEvaluation ? (
          <button type="button" onClick={reset} className="text-xs text-accent underline-offset-4 hover:underline">
            Try again
          </button>
        ) : null}
      </div>

      <ol className="mt-3 space-y-2 text-sm leading-relaxed">
        {scenario.questions.map((q, i) => (
          <li key={q.id} className="flex gap-3">
            <span className="shrink-0 font-mono text-xs text-muted">{i + 1}</span>
            <span>{q.prompt}</span>
          </li>
        ))}
      </ol>

      {showEvaluation ? (
        <div className="mt-6">
          <div className="mb-5 rounded-md border border-line bg-surface p-3 text-sm">
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
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <Label htmlFor={textId}>Answer all questions in one written response. Cite the evidence you use.</Label>
            <Textarea
              id={textId}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={9}
              placeholder="Start with what the data shows, then what you infer from it, then what would change your mind."
              className="mt-2 bg-bg"
              aria-describedby={`${textId}-count`}
              disabled={pending}
            />
            <p id={`${textId}-count`} className="mt-1.5 text-xs text-muted">
              {tooShort ? `${MIN_CHARS - chars} more character${MIN_CHARS - chars === 1 ? "" : "s"} needed` : `${chars} characters`}
            </p>
          </div>

          <HintLadder
            hints={scenario.hints}
            revealed={hintsUsed}
            onReveal={() => setHintsUsed((n) => Math.min(scenario.hints.length, n + 1))}
            disabled={pending}
            note="Each hint lowers the score a little."
          />

          {error ? (
            <p role="alert" className="rounded-md border border-danger bg-danger-soft p-3 text-sm">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="lg" disabled={tooShort || pending}>
              {pending ? "Grading…" : preview ? "See sample feedback" : "Submit for grading"}
            </Button>
            {preview ? (
              <Link href={preview.ctaHref} className="text-sm text-accent underline-offset-4 hover:underline">
                or sign up for the real thing
              </Link>
            ) : null}
          </div>
          {pending ? (
            <p className="text-xs text-muted" aria-live="polite">
              Checking your answer against the frozen evidence and the rubric.
            </p>
          ) : null}
        </form>
      )}

      {!preview && history.length > 0 ? (
        <AttemptHistory attempts={history} className="mt-6" />
      ) : null}
    </section>
  );
}
