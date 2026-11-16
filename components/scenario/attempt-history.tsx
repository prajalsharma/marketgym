import type { ScenarioAttempt } from "@/lib/types/learning";
import { formatDateTime } from "@/lib/client/format";
import { cn } from "@/lib/utils";

interface Props {
  attempts: ScenarioAttempt[];
  className?: string;
}

/** Collapsed by default; one row per earlier attempt on this scenario. */
export function AttemptHistory({ attempts, className }: Props) {
  if (attempts.length === 0) return null;
  return (
    <details className={cn("group rounded-md border border-line bg-surface", className)}>
      <summary className="cursor-pointer list-none rounded-md px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="font-medium">Previous attempts</span>
        <span className="ml-2 text-muted">
          {attempts.length} · best {Math.max(...attempts.map((a) => a.evaluation.totalScore))}
        </span>
      </summary>
      <ul className="divide-y divide-line border-t border-line">
        {attempts.map((a) => (
          <li key={a.id} className="px-3 py-2 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-mono tabular-nums">{a.evaluation.totalScore} / 100</span>
              <span className="text-xs text-muted">
                {formatDateTime(a.createdAt)} · {a.hintsUsed} hint{a.hintsUsed === 1 ? "" : "s"} ·{" "}
                {a.evaluation.evaluatorMode === "llm" ? "AI + rules" : "rules"}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted">{a.submittedAnswer}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}
