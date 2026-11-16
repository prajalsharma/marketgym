import type { ActivityEvent, Review } from "@/lib/types/learning";
import { EmptyState } from "@/components/ui";
import { ACTIVITY_LABEL } from "@/lib/client/labels";
import { formatRelative, humanise } from "@/lib/client/format";
import Link from "next/link";

export function ActivityList({ events, skillNames = {} }: { events: ActivityEvent[]; skillNames?: Record<string, string> }) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="Nothing yet"
        description="Lessons, checks and scenario attempts will show up here as you do them."
      />
    );
  }
  return (
    <ol className="divide-y divide-line">
      {events.map((e) => (
        <li key={e.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
          <div className="min-w-0">
            <p className="leading-snug">{e.summary}</p>
            <p className="mt-0.5 text-xs text-muted">
              {ACTIVITY_LABEL[e.kind] ?? e.kind}
              {e.skillIds.length > 0
                ? ` · ${e.skillIds
                    .slice(0, 3)
                    .map((id) => skillNames[id] ?? humanise(id))
                    .join(", ")}${e.skillIds.length > 3 ? ` and ${e.skillIds.length - 3} more` : ""}`
                : ""}
            </p>
          </div>
          <div className="shrink-0 text-right">
            {typeof e.score === "number" ? <p className="font-mono text-sm tabular-nums">{Math.round(e.score)}</p> : null}
            <p className="text-xs text-subtle">{formatRelative(e.createdAt)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ReviewList({ reviews, skillNames = {} }: { reviews: Review[]; skillNames?: Record<string, string> }) {
  if (reviews.length === 0) {
    return <EmptyState title="No reviews due" description="Reviews appear a day or more after you practise a skill." />;
  }
  const now = new Date();
  return (
    <ul className="divide-y divide-line">
      {reviews.map((r) => {
        const due = new Date(r.scheduledAt) <= now;
        return (
          <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <div>
              <p>{skillNames[r.skillId] ?? humanise(r.skillId)}</p>
              <p className="text-xs text-muted">
                {r.completedAt ? `Done · ${r.result ?? ""}` : due ? "Due now" : `Due ${formatRelative(r.scheduledAt)}`}
              </p>
            </div>
            {!r.completedAt ? (
              <Link href={`/app/review/${encodeURIComponent(r.id)}`} className="text-accent underline-offset-4 hover:underline">
                {due ? "Review" : "Open"}
              </Link>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
