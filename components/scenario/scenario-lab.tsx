import type { Scenario, ScenarioAttempt } from "@/lib/types/learning";
import { Target } from "lucide-react";
import { Badge } from "@/components/ui";
import { EvidenceColumn } from "@/components/evidence/evidence-column";
import { AnswerColumn } from "./answer-column";
import type { MisconceptionLookup } from "./evaluation-panel";
import { DIFFICULTY_LABEL } from "@/lib/client/labels";
import { formatDateTime, humanise } from "@/lib/client/format";
import { cn } from "@/lib/utils";

interface Props {
  scenario: Scenario;
  previousAttempts?: ScenarioAttempt[];
  misconceptions?: MisconceptionLookup;
  skillNames?: Record<string, string>;
  preview?: { evaluation: ScenarioAttempt["evaluation"]; ctaHref: string };
  className?: string;
}

/**
 * Mission header, then evidence (left) and the learner's answer (right).
 * Stacks on small screens: evidence first, then the answer.
 */
export function ScenarioLab({ scenario, previousAttempts, misconceptions, skillNames, preview, className }: Props) {
  return (
    <div className={cn("space-y-6", className)}>
      <header className="animate-rise-in overflow-hidden rounded-lg border border-line bg-surface shadow-sm inset-shadow-[0_1px_0_rgb(255_255_255/0.04)]">
        <div className="space-y-4 p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            {preview ? <Badge tone="warning">Sample</Badge> : null}
            <Badge tone="neutral">{DIFFICULTY_LABEL[scenario.difficulty] ?? `Level ${scenario.difficulty}`}</Badge>
            {scenario.skillIds.map((id) => (
              <Badge key={id} tone="info">
                {skillNames?.[id] ?? humanise(id)}
              </Badge>
            ))}
          </div>
          <div>
            <h1 className="max-w-3xl text-2xl font-semibold leading-tight tracking-tight text-balance sm:text-3xl">
              {scenario.title}
            </h1>
            <p className="mt-3 max-w-prose leading-relaxed text-muted">{scenario.description}</p>
          </div>
        </div>
        <dl className="grid gap-px border-t border-line bg-line text-sm sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="flex gap-3 bg-surface-sunken px-5 py-4 sm:px-7">
            <Target className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-xs text-muted">Objective</dt>
              <dd className="mt-0.5 max-w-prose font-medium leading-snug">{scenario.learningObjective}</dd>
            </div>
          </div>
          <div className="bg-surface-sunken px-5 py-4 sm:px-6">
            <dt className="text-xs text-muted">Questions</dt>
            <dd className="mt-0.5 font-mono tabular-nums">{scenario.questions.length}</dd>
          </div>
          <div className="bg-surface-sunken px-5 py-4 sm:px-6">
            <dt className="text-xs text-muted">Created</dt>
            <dd className="mt-0.5">{formatDateTime(scenario.createdAt)}</dd>
          </div>
        </dl>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
        <div
          className="animate-rise-in rounded-lg border border-evidence-line bg-evidence/50 p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] sm:p-5"
          style={{ animationDelay: "80ms" }}
        >
          <EvidenceColumn pack={scenario.evidence} sample={Boolean(preview)} />
        </div>
        <AnswerColumn
          scenario={scenario}
          previousAttempts={previousAttempts}
          misconceptions={misconceptions}
          skillNames={skillNames}
          preview={preview}
          className="scrollbar-thin overscroll-contain lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6.5rem)] lg:overflow-y-auto"
        />
      </div>
    </div>
  );
}
