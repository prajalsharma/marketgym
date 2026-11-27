import type { ActivityEvent, Review } from "@/lib/types/learning";
import { EmptyState } from "@/components/ui";
import { ACTIVITY_LABEL } from "@/lib/client/labels";
import { formatRelative, humanise } from "@/lib/client/format";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { CSSProperties } from "react";

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
    <ol className="stagger-in relative">
      {events.map((e, i) => {
        const scored = typeof e.score === "number";
        const last = i === events.length - 1;
        return (
          <li
            key={e.id}
            style={{ "--i": i } as CSSProperties}
            className="group relative flex items-start gap-4 pb-5 pl-7 text-sm last:pb-0"
          >
            {/* rail + marker */}
            {!last ? <span aria-hidden="true" className="absolute top-3 bottom-0 left-[5px] w-px bg-line" /> : null}
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-1.5 left-0 size-[11px] rounded-full border-2 bg-surface transition-colors duration-200",
                scored ? "border-accent" : "border-line-strong group-hover:border-muted",
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="leading-snug text-fg">{e.summary}</p>
              <p className="mt-1 text-xs text-muted">
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
              {scored ? (
                <p className="font-mono text-base font-semibold leading-snug tabular-nums text-fg">
                  {Math.round(e.score as number)}
                </p>
              ) : null}
              <p className="text-xs text-subtle">{formatRelative(e.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ReviewList({ reviews, skillNames = {} }: { reviews: Review[]; skillNames?: Record<string, string> }) {
  if (reviews.length === 0) {
    return <EmptyState title="No reviews due" description="Reviews appear a day or more after you practise a skill." />;
  }
  const now = new Date();
  return (
    <ul className="stagger-in -mx-2 space-y-0.5">
      {reviews.map((r, i) => {
        const due = new Date(r.scheduledAt) <= now;
        return (
          <li
            key={r.id}
            style={{ "--i": i } as CSSProperties}
            className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors duration-200 hover:bg-surface-raised"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  r.completedAt ? "bg-success" : due ? "bg-warning" : "bg-line-strong",
                )}
              />
              <div className="min-w-0">
                <p className="truncate text-fg">{skillNames[r.skillId] ?? humanise(r.skillId)}</p>
                <p className={cn("text-xs", !r.completedAt && due ? "text-warning" : "text-muted")}>
                  {r.completedAt ? `Done · ${r.result ?? ""}` : due ? "Due now" : `Due ${formatRelative(r.scheduledAt)}`}
                </p>
              </div>
            </div>
            {!r.completedAt ? (
              <Link
                href={`/app/review/${encodeURIComponent(r.id)}`}
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1 text-sm font-medium underline-offset-4 transition-[background-color,transform] duration-150 active:scale-[0.98]",
                  due ? "bg-accent-soft text-accent hover:bg-accent/20" : "text-accent hover:underline",
                )}
              >
                {due ? "Review" : "Open"}
              </Link>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
