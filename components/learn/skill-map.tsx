"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check, ChevronDown, Lock } from "lucide-react";
import type { LearningPathResponse, SkillProgress } from "@/lib/types/api";
import { MasteryIndicator, Progress } from "@/components/ui";
import { formatRelative } from "@/lib/client/format";
import { EASE_OUT, TIMING, spring } from "@/lib/client/motion";
import { cn } from "@/lib/utils";

interface Props {
  path: LearningPathResponse;
}

const ACTION_LINK =
  "inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-fg outline-none transition-colors duration-150 hover:border-line-strong hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-ring";

/** Modules as a connected vertical path with lock state and progress; skills expand with prerequisites and a next step. */
export function SkillMap({ path }: Props) {
  const reduce = useReducedMotion();
  const bySkill = new Map<string, SkillProgress>(path.skills.map((s) => [s.skill.id, s]));
  const nextSkill = path.nextMission.skillId;
  const [open, setOpen] = useState<string | null>(path.nextMission.moduleId);
  const [openSkill, setOpenSkill] = useState<string | null>(null);
  const last = path.modules.length - 1;
  const expand = reduce ? { duration: 0 } : spring.gentle;

  return (
    <ol className="relative">
      {path.modules.map(({ module, unlocked, progress }, index) => {
        const isOpen = open === module.id;
        const pct = Math.round(progress * 100);
        const done = pct >= 100;
        const isCurrent = module.id === path.nextMission.moduleId;
        return (
          <motion.li
            key={module.id}
            className="relative flex gap-3 pb-4 last:pb-0 sm:gap-5"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduce
                ? { duration: 0 }
                : { duration: TIMING.pageRise, ease: EASE_OUT, delay: Math.min(index, 10) * TIMING.stagger }
            }
          >
            {/* Path rail: a node per module, joined by a line that fills as the module completes. */}
            <div className="relative flex w-9 shrink-0 flex-col items-center" aria-hidden="true">
              <span
                className={cn(
                  "relative z-10 mt-3 flex size-9 items-center justify-center rounded-full border text-sm font-semibold tabular-nums transition-colors duration-200",
                  done && "border-success bg-success-soft text-success",
                  !done && unlocked && isCurrent && "border-accent bg-accent text-accent-fg shadow-sm",
                  !done && unlocked && !isCurrent && "border-line-strong bg-surface-raised text-fg",
                  !done && !unlocked && "border-line border-dashed bg-surface-sunken text-subtle",
                )}
              >
                {done ? <Check className="size-4" /> : !unlocked ? <Lock className="size-3.5" /> : module.sequence}
              </span>
              {index < last ? (
                <span className="absolute bottom-[-0.75rem] top-12 w-px overflow-hidden bg-line">
                  <motion.span
                    className={cn("block h-full w-full origin-top", done ? "bg-success" : "bg-accent")}
                    initial={reduce ? false : { scaleY: 0 }}
                    animate={{ scaleY: Math.max(0, Math.min(1, progress)) }}
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { duration: TIMING.barFill, ease: EASE_OUT, delay: 0.15 + Math.min(index, 10) * TIMING.stagger }
                    }
                  />
                </span>
              ) : null}
            </div>

            <motion.div
              layout={reduce ? false : "position"}
              transition={expand}
              className={cn(
                "min-w-0 flex-1 overflow-hidden rounded-lg border bg-surface shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] transition-[border-color,box-shadow] duration-200",
                isOpen ? "border-line-strong shadow-sm" : "border-line hover:border-line-strong",
                !unlocked && !isOpen && "bg-surface-sunken",
              )}
            >
              <motion.button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`module-${module.id}`}
                onClick={() => setOpen(isOpen ? null : module.id)}
                whileTap={reduce ? undefined : { scale: 0.99 }}
                transition={spring.snappy}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5 sm:py-4"
              >
                <span className="sr-only">{module.sequence}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={cn("truncate text-base font-semibold", !unlocked && "text-muted")}>{module.title}</span>
                    {!unlocked ? <Lock className="sr-only" aria-label="Locked" /> : null}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-muted">{module.summary}</span>
                  <span className="mt-1 block text-xs text-subtle">
                    {module.skillIds.length} skill{module.skillIds.length === 1 ? "" : "s"}
                  </span>
                </span>
                <span className="hidden w-28 sm:block">
                  <Progress value={pct} tone={done ? "success" : "accent"} aria-label={`${module.title} progress`} />
                </span>
                <span className={cn("w-10 text-right font-mono text-xs tabular-nums", done ? "text-success" : "text-muted")}>
                  {pct}%
                </span>
                <ChevronDown
                  className={cn("size-4 shrink-0 text-subtle transition-transform duration-200", isOpen && "rotate-180")}
                  aria-hidden="true"
                />
              </motion.button>

              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    key="panel"
                    id={`module-${module.id}`}
                    initial={reduce ? false : { height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    transition={expand}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-line px-4 py-4 sm:px-5">
                      {!unlocked ? (
                        <p className="mb-3 flex items-start gap-2 rounded-md border border-line bg-surface-sunken px-3 py-2.5 text-xs leading-relaxed text-muted">
                          <Lock className="mt-0.5 size-3.5 shrink-0 text-subtle" aria-hidden="true" />
                          <span>
                            Unlocks after:{" "}
                            {module.prerequisiteModuleIds
                              .map((id) => path.modules.find((m) => m.module.id === id)?.module.title ?? id)
                              .join(", ")}
                            . You can read the lesson now; practice opens once the prerequisites are at practising level.
                          </span>
                        </p>
                      ) : null}
                      <ul className="space-y-1.5">
                        {module.skillIds.map((skillId) => {
                          const sp = bySkill.get(skillId);
                          if (!sp) return null;
                          const status = sp.mastery?.masteryStatus ?? "not-started";
                          const isNext = skillId === nextSkill;
                          const skillOpen = openSkill === skillId;
                          const prereqs = sp.skill.prerequisiteSkillIds
                            .map((id) => bySkill.get(id)?.skill.name ?? id)
                            .filter(Boolean);
                          return (
                            <motion.li
                              key={skillId}
                              layout={reduce ? false : "position"}
                              transition={expand}
                              className={cn(
                                "rounded-md border transition-colors duration-150",
                                isNext ? "border-accent/45 bg-accent-soft" : "border-transparent hover:bg-surface-raised",
                                skillOpen && !isNext && "border-line bg-surface-raised",
                              )}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-3 pt-2.5">
                                <div className="min-w-0">
                                  <p className="text-sm">
                                    <span className={cn(isNext && "font-medium", !sp.unlocked && "text-muted")}>{sp.skill.name}</span>
                                    {isNext ? <span className="ml-2 text-xs font-medium text-accent">next for you</span> : null}
                                    {!sp.unlocked ? <span className="ml-2 text-xs text-subtle">locked</span> : null}
                                  </p>
                                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{sp.skill.description}</p>
                                </div>
                                <MasteryIndicator status={status} score={sp.mastery?.masteryScore} size="sm" />
                              </div>
                              <button
                                type="button"
                                aria-expanded={skillOpen}
                                aria-controls={`skill-${skillId}`}
                                onClick={() => setOpenSkill(skillOpen ? null : skillId)}
                                className="mx-3 mb-2 mt-1 inline-flex items-center gap-1 rounded-sm text-xs text-muted outline-none transition-colors duration-150 hover:text-fg focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                Details
                                <ChevronDown
                                  className={cn("size-3 transition-transform duration-200", skillOpen && "rotate-180")}
                                  aria-hidden="true"
                                />
                              </button>
                              <AnimatePresence initial={false}>
                                {skillOpen ? (
                                  <motion.div
                                    key="details"
                                    id={`skill-${skillId}`}
                                    initial={reduce ? false : { height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                                    transition={expand}
                                    className="overflow-hidden"
                                  >
                                    <div className="space-y-2 px-3 pb-3 text-xs text-muted">
                                      <p>Needs first: {prereqs.length ? prereqs.join(", ") : "nothing"}</p>
                                      {sp.mastery ? (
                                        <p>
                                          {sp.mastery.evidenceCount} piece{sp.mastery.evidenceCount === 1 ? "" : "s"} of evidence
                                          {sp.mastery.lastAssessedAt ? ` · last assessed ${formatRelative(sp.mastery.lastAssessedAt)}` : ""}
                                          {sp.mastery.nextReviewAt ? ` · review ${formatRelative(sp.mastery.nextReviewAt)}` : ""}
                                        </p>
                                      ) : null}
                                      <p className="flex flex-wrap gap-2 pt-0.5">
                                        <Link
                                          href={`/app/learn/${encodeURIComponent(module.id)}?skill=${encodeURIComponent(skillId)}`}
                                          className={cn(ACTION_LINK, "border-accent/45 text-accent")}
                                        >
                                          Read lesson
                                          <ArrowUpRight className="size-3" aria-hidden="true" />
                                        </Link>
                                        <Link href={`/app/coach?skill=${encodeURIComponent(skillId)}`} className={ACTION_LINK}>
                                          Coach
                                        </Link>
                                        {sp.unlocked ? (
                                          <Link href={`/app/scenario-lab?skill=${encodeURIComponent(skillId)}`} className={ACTION_LINK}>
                                            Practise
                                          </Link>
                                        ) : null}
                                      </p>
                                    </div>
                                  </motion.div>
                                ) : null}
                              </AnimatePresence>
                            </motion.li>
                          );
                        })}
                      </ul>
                      <p className="mt-4 border-t border-line pt-3 text-xs text-muted">Suggested next: {module.recommendedNext}</p>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          </motion.li>
        );
      })}
    </ol>
  );
}
