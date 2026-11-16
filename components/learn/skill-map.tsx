"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Lock } from "lucide-react";
import type { LearningPathResponse, SkillProgress } from "@/lib/types/api";
import { MasteryIndicator, Progress } from "@/components/ui";
import { formatRelative } from "@/lib/client/format";
import { cn } from "@/lib/utils";

interface Props {
  path: LearningPathResponse;
}

/** Module rows with lock state and progress; skills expand with prerequisites and a next step. */
export function SkillMap({ path }: Props) {
  const bySkill = new Map<string, SkillProgress>(path.skills.map((s) => [s.skill.id, s]));
  const nextSkill = path.nextMission.skillId;
  const [open, setOpen] = useState<string | null>(path.nextMission.moduleId);

  return (
    <ol className="space-y-3">
      {path.modules.map(({ module, unlocked, progress }) => {
        const isOpen = open === module.id;
        const pct = Math.round(progress * 100);
        return (
          <li key={module.id} className="rounded-lg border border-line bg-surface">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`module-${module.id}`}
              onClick={() => setOpen(isOpen ? null : module.id)}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="w-5 shrink-0 font-mono text-xs tabular-nums text-subtle">{module.sequence}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{module.title}</span>
                  {!unlocked ? <Lock className="size-3.5 shrink-0 text-subtle" aria-label="Locked" /> : null}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted">{module.summary}</span>
              </span>
              <span className="hidden w-28 sm:block">
                <Progress value={pct} aria-label={`${module.title} progress`} />
              </span>
              <span className="w-10 text-right font-mono text-xs tabular-nums text-muted">{pct}%</span>
              <ChevronDown
                className={cn("size-4 shrink-0 text-subtle transition-transform duration-200", isOpen && "rotate-180")}
                aria-hidden="true"
              />
            </button>

            {isOpen ? (
              <div id={`module-${module.id}`} className="step-panel border-t border-line px-4 py-3">
                {!unlocked ? (
                  <p className="mb-3 text-xs text-muted">
                    Unlocks after:{" "}
                    {module.prerequisiteModuleIds
                      .map((id) => path.modules.find((m) => m.module.id === id)?.module.title ?? id)
                      .join(", ")}
                    . You can read the lesson now; practice opens once the prerequisites are at practising level.
                  </p>
                ) : null}
                <ul className="divide-y divide-line">
                  {module.skillIds.map((skillId) => {
                    const sp = bySkill.get(skillId);
                    if (!sp) return null;
                    const status = sp.mastery?.masteryStatus ?? "not-started";
                    const isNext = skillId === nextSkill;
                    const prereqs = sp.skill.prerequisiteSkillIds
                      .map((id) => bySkill.get(id)?.skill.name ?? id)
                      .filter(Boolean);
                    return (
                      <li key={skillId} className="py-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <div className="min-w-0">
                            <p className="text-sm">
                              <span className={cn(isNext && "font-medium")}>{sp.skill.name}</span>
                              {isNext ? <span className="ml-2 text-xs text-accent">next for you</span> : null}
                              {!sp.unlocked ? <span className="ml-2 text-xs text-subtle">locked</span> : null}
                            </p>
                            <p className="text-xs text-muted">{sp.skill.description}</p>
                          </div>
                          <MasteryIndicator status={status} score={sp.mastery?.masteryScore} size="sm" />
                        </div>
                        <details className="mt-1 text-xs text-muted">
                          <summary className="cursor-pointer list-none rounded-sm outline-none hover:text-fg focus-visible:ring-2 focus-visible:ring-ring">
                            Details
                          </summary>
                          <div className="mt-1 space-y-1">
                            <p>Needs first: {prereqs.length ? prereqs.join(", ") : "nothing"}</p>
                            {sp.mastery ? (
                              <p>
                                {sp.mastery.evidenceCount} piece{sp.mastery.evidenceCount === 1 ? "" : "s"} of evidence
                                {sp.mastery.lastAssessedAt ? ` · last assessed ${formatRelative(sp.mastery.lastAssessedAt)}` : ""}
                                {sp.mastery.nextReviewAt ? ` · review ${formatRelative(sp.mastery.nextReviewAt)}` : ""}
                              </p>
                            ) : null}
                            <p className="flex flex-wrap gap-x-3">
                              <Link href={`/app/learn/${encodeURIComponent(module.id)}?skill=${encodeURIComponent(skillId)}`} className="text-accent underline-offset-4 hover:underline">
                                Read lesson
                              </Link>
                              <Link href={`/app/coach?skill=${encodeURIComponent(skillId)}`} className="text-accent underline-offset-4 hover:underline">
                                Coach
                              </Link>
                              {sp.unlocked ? (
                                <Link href={`/app/scenario-lab?skill=${encodeURIComponent(skillId)}`} className="text-accent underline-offset-4 hover:underline">
                                  Practise
                                </Link>
                              ) : null}
                            </p>
                          </div>
                        </details>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-xs text-muted">
                  Suggested next: {module.recommendedNext}
                </p>
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
