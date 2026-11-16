"use client";

import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui";
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
  return (
    <div className={cn("space-y-3", className)}>
      <ol className="space-y-2" aria-live="polite">
        {hints.slice(0, revealed).map((hint, i) => (
          <li
            key={i}
            className="hint-reveal flex gap-3 rounded-md border border-line bg-surface p-3 text-sm leading-relaxed"
          >
            <span className="mt-0.5 shrink-0 font-mono text-xs text-muted">
              {i + 1}/{total}
            </span>
            <span>{hint}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onReveal}
          disabled={disabled || done || pending}
        >
          <Lightbulb className="size-4" aria-hidden="true" />
          {done ? "No more hints" : revealed === 0 ? "Ask for a hint" : `Next hint (${revealed + 1}/${total})`}
        </Button>
        {note ? <span className="text-xs text-muted">{note}</span> : null}
      </div>
    </div>
  );
}
