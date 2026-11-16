import type { Scenario, ScenarioAttempt } from "@/lib/types/learning";
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
      <header className="space-y-3">
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
          <h1 className="text-xl font-semibold tracking-tight text-balance">{scenario.title}</h1>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">{scenario.description}</p>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div className="max-w-prose">
            <dt className="text-xs text-muted">Objective</dt>
            <dd>{scenario.learningObjective}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Created</dt>
            <dd>{formatDateTime(scenario.createdAt)}</dd>
          </div>
        </dl>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
        <EvidenceColumn pack={scenario.evidence} sample={Boolean(preview)} />
        <AnswerColumn
          scenario={scenario}
          previousAttempts={previousAttempts}
          misconceptions={misconceptions}
          skillNames={skillNames}
          preview={preview}
        />
      </div>
    </div>
  );
}
