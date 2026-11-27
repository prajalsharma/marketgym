"use client";

import Link from "next/link";
import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, MotionConfig, motion, useIsPresent, type Variants } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { DiagnosticAnswer, DiagnosticQuestion, ExperienceLevel, LearningGoal, LearningStyle, Profile } from "@/lib/types/learning";
import type { DiagnosticSubmitResponse, ProfileUpsertRequest } from "@/lib/types/api";
import { Button, ErrorState, Input, Label, RadioCard, RadioGroup, Skeleton, Textarea } from "@/components/ui";
import { CATEGORIES, EXPERIENCE, GOALS, STYLES } from "@/lib/client/labels";
import { apiGet, apiPost, apiPut, describeError } from "@/lib/client/api";
import { humanise } from "@/lib/client/format";
import { EASE_OUT, TIMING, spring } from "@/lib/client/motion";
import { cn } from "@/lib/utils";

const STEPS = ["Goal", "Experience", "Interests", "Diagnostic", "Result"] as const;

interface Props {
  profile: Profile | null;
}

/**
 * Five steps in one component. Profile is saved after step 3 (PUT /api/profile),
 * the diagnostic runs one question at a time, and the result shows where to start.
 */
export function OnboardingFlow({ profile }: Props) {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [goal, setGoal] = useState<LearningGoal | null>(profile?.learningGoal ?? null);
  const [experience, setExperience] = useState<ExperienceLevel | null>(profile?.experienceLevel ?? null);
  const [style, setStyle] = useState<LearningStyle>(profile?.preferredLearningStyle ?? "concise");
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // diagnostic
  const [questions, setQuestions] = useState<DiagnosticQuestion[] | null>(null);
  const [qError, setQError] = useState<unknown>(null);
  const [qLoading, setQLoading] = useState(false);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnosticSubmitResponse | null>(null);

  // direction of travel, for the slide between steps and between questions (visual only)
  const [stepDir, setStepDir] = useState(1);
  const [qDir, setQDir] = useState(1);

  const nameId = useId();

  async function saveProfile(): Promise<boolean> {
    if (!goal || !experience) return false;
    setSaving(true);
    setSaveError(null);
    const body: ProfileUpsertRequest = {
      displayName: displayName.trim() || "Learner",
      experienceLevel: experience,
      learningGoal: goal,
      preferredLearningStyle: style,
      interests,
    };
    try {
      await apiPut<Profile>("/api/profile", body);
      return true;
    } catch (err) {
      setSaveError(describeError(err));
      return false;
    } finally {
      setSaving(false);
    }
  }

  function loadQuestions() {
    setQLoading(true);
    setQError(null);
    apiGet<DiagnosticQuestion[]>("/api/diagnostic/questions")
      .then((qs) => {
        setQuestions(qs);
        setQIndex(0);
      })
      .catch((e: unknown) => setQError(e))
      .finally(() => setQLoading(false));
  }

  async function next() {
    if (step === 2) {
      const ok = await saveProfile();
      if (!ok) return;
      if (questions === null && !qLoading) loadQuestions();
    }
    setStepDir(1);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  async function submitDiagnostic() {
    if (!questions) return;
    setSubmitting(true);
    setSubmitError(null);
    const payload: DiagnosticAnswer[] = questions.map((q) => ({ questionId: q.id, value: answers[q.id] ?? "" }));
    try {
      const res = await apiPost<DiagnosticSubmitResponse>("/api/diagnostic", { answers: payload });
      setResult(res);
      setStepDir(1);
      setStep(4);
    } catch (err) {
      setSubmitError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const canContinue =
    step === 0 ? goal !== null : step === 1 ? experience !== null : step === 2 ? interests.length > 0 : true;

  const current = questions?.[qIndex] ?? null;
  const currentAnswer = current ? (answers[current.id] ?? "") : "";
  const answered = current ? currentAnswer.trim().length > 0 : false;

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto max-w-xl">
        <ol className="flex items-center pb-7 text-xs text-muted" aria-label="Steps">
          {STEPS.map((label, i) => (
            <li key={label} className={cn("flex items-center", i < STEPS.length - 1 && "flex-1")}>
              <span className="relative flex flex-col items-center">
                <span
                  className={cn(
                    "relative flex size-8 items-center justify-center rounded-full border font-mono tabular-nums transition-colors duration-300",
                    i < step && "border-accent bg-accent text-accent-fg",
                    i === step && "border-accent bg-accent-soft text-accent",
                    i > step && "border-line bg-surface text-subtle",
                  )}
                  aria-current={i === step ? "step" : undefined}
                >
                  {i === step ? (
                    <motion.span
                      layoutId="onboarding-step-ring"
                      className="absolute -inset-[5px] rounded-full border border-accent/45"
                      transition={spring.morph}
                      aria-hidden="true"
                    />
                  ) : null}
                  {i < step ? (
                    <>
                      <Check className="size-4 animate-fade-in" strokeWidth={2.5} aria-hidden="true" />
                      <span className="sr-only">{i + 1}</span>
                    </>
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={cn(
                    "absolute top-full mt-2.5 whitespace-nowrap transition-colors duration-300",
                    i === step ? "block font-medium text-fg" : "hidden sm:block",
                    i < step && "text-muted",
                  )}
                >
                  {label}
                </span>
              </span>
              {i < STEPS.length - 1 ? (
                <span className="relative mx-2 h-0.5 flex-1 overflow-hidden rounded-full bg-line sm:mx-3" aria-hidden="true">
                  <motion.span
                    className="absolute inset-0 origin-left rounded-full bg-accent"
                    initial={false}
                    animate={{ scaleX: i < step ? 1 : 0 }}
                    transition={spring.gentle}
                  />
                </span>
              ) : null}
            </li>
          ))}
        </ol>

        <div className="mt-6 rounded-lg border border-line bg-surface p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.04),var(--shadow-md)] sm:p-8">
          <AnimatePresence mode="wait" initial={false} custom={stepDir}>
            <Pane key={step} dir={stepDir}>
              {step === 0 ? (
                <section className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">What do you want to get better at?</h1>
                    <p className="mt-2 text-sm leading-relaxed text-muted">This shapes which module you start with and which examples you see.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={nameId}>Your name</Label>
                    <Input id={nameId} value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="given-name" placeholder="How the coach addresses you" />
                  </div>
                  <RadioGroup value={goal ?? ""} onValueChange={(v) => setGoal(v as LearningGoal)} aria-label="Goal" className="stagger-in grid gap-2.5">
                    {GOALS.map((g, i) => (
                      <RadioCard key={g.id} value={g.id} title={g.label} description={g.hint} className={OPTION} style={order(i)} />
                    ))}
                  </RadioGroup>
                </section>
              ) : null}

              {step === 1 ? (
                <section className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">How much have you done before?</h1>
                    <p className="mt-2 text-sm leading-relaxed text-muted">Honest answers mean fewer boring exercises. The diagnostic will check anyway.</p>
                  </div>
                  <RadioGroup value={experience ?? ""} onValueChange={(v) => setExperience(v as ExperienceLevel)} aria-label="Experience" className="stagger-in grid gap-2.5">
                    {EXPERIENCE.map((x, i) => (
                      <RadioCard key={x.id} value={x.id} title={x.label} description={x.hint} className={OPTION} style={order(i)} />
                    ))}
                  </RadioGroup>
                  <div className="border-t border-line pt-5">
                    <p className="text-sm font-medium">How should explanations read?</p>
                    <RadioGroup value={style} onValueChange={(v) => setStyle(v as LearningStyle)} aria-label="Explanation style" className="mt-3 grid gap-2.5 sm:grid-cols-3">
                      {STYLES.map((s) => (
                        <RadioCard key={s.id} value={s.id} title={s.label} description={s.hint} className={OPTION} />
                      ))}
                    </RadioGroup>
                  </div>
                </section>
              ) : null}

              {step === 2 ? (
                <section className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">Which areas interest you?</h1>
                    <p className="mt-2 text-sm leading-relaxed text-muted">Pick at least one. You can still learn everything else.</p>
                  </div>
                  <div className="stagger-in grid gap-2.5 sm:grid-cols-2" role="group" aria-label="Interests">
                    {CATEGORIES.map((c, i) => {
                      const on = interests.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setInterests((cur) => (on ? cur.filter((x) => x !== c.id) : [...cur, c.id]))}
                          style={order(i)}
                          className={cn(
                            "group flex items-start gap-3 rounded-lg border px-3.5 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            LIFT,
                            on
                              ? "border-accent bg-accent-soft shadow-[inset_0_0_0_1px_var(--accent)]"
                              : "border-line bg-surface hover:border-line-strong hover:bg-surface-raised",
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-200",
                              on ? "border-accent bg-accent text-accent-fg" : "border-line-strong bg-surface-sunken text-transparent",
                            )}
                          >
                            <Check
                              className={cn("size-3 transition-[scale,opacity] duration-200 ease-(--ease-out)", on ? "scale-100 opacity-100" : "scale-50 opacity-0")}
                              strokeWidth={3}
                            />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium">{c.label}</span>
                            <span className="block text-xs leading-relaxed text-muted">{c.hint}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {saveError ? (
                    <p role="alert" className="animate-rise-in rounded-lg border border-danger bg-danger-soft p-3 text-sm">
                      {saveError}
                    </p>
                  ) : null}
                </section>
              ) : null}

              {step === 3 ? (
                <section className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">A quick diagnostic</h1>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {questions ? `${questions.length} questions, one at a time. There is no pass mark; it only sets your starting point.` : "Loading questions."}
                    </p>
                  </div>
                  {qLoading ? (
                    <div className="space-y-3" aria-busy="true">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-12" />
                      <Skeleton className="h-12" />
                      <Skeleton className="h-12" />
                    </div>
                  ) : qError ? (
                    <ErrorState title="Could not load the diagnostic" description={describeError(qError)} retry={loadQuestions} />
                  ) : questions && questions.length === 0 ? (
                    <ErrorState title="No diagnostic questions" description="The question bank came back empty." retry={loadQuestions} />
                  ) : current ? (
                    <div className="space-y-5">
                      <div className="space-y-2.5">
                        <p className="text-xs tabular-nums text-muted">
                          Question {qIndex + 1} of {questions!.length} · {humanise(current.skillId)}
                        </p>
                        <div className="h-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
                          <motion.div
                            className="h-full origin-left rounded-full bg-accent"
                            initial={false}
                            animate={{ scaleX: (qIndex + 1) / questions!.length }}
                            transition={spring.gentle}
                          />
                        </div>
                      </div>
                      <AnimatePresence mode="wait" initial={false} custom={qDir}>
                        <Pane key={current.id} dir={qDir} className="space-y-4">
                          <p className="text-lg font-medium leading-snug text-balance">{current.prompt}</p>
                          {current.kind === "choice" && current.options ? (
                            <RadioGroup
                              value={currentAnswer}
                              onValueChange={(v) => setAnswers((a) => ({ ...a, [current.id]: v }))}
                              aria-label="Answer"
                              className="stagger-in grid gap-2.5"
                            >
                              {current.options.map((o, i) => (
                                <RadioCard key={o.id} value={o.id} title={o.text} className={OPTION} style={order(i)} />
                              ))}
                            </RadioGroup>
                          ) : (
                            <Textarea
                              value={currentAnswer}
                              onChange={(e) => setAnswers((a) => ({ ...a, [current.id]: e.target.value }))}
                              rows={4}
                              placeholder="A sentence or two is enough."
                              aria-label="Your answer"
                            />
                          )}
                        </Pane>
                      </AnimatePresence>
                      {submitError ? (
                        <p role="alert" className="animate-rise-in rounded-lg border border-danger bg-danger-soft p-3 text-sm">
                          {submitError}
                        </p>
                      ) : null}
                      <div className="flex items-center justify-between gap-3 border-t border-line pt-5">
                        <Button
                          type="button"
                          variant="ghost"
                          className={PRESS}
                          onClick={() => {
                            setQDir(-1);
                            setQIndex((i) => Math.max(0, i - 1));
                          }}
                          disabled={qIndex === 0 || submitting}
                        >
                          <ArrowLeft className="size-4" aria-hidden="true" />
                          Back
                        </Button>
                        {qIndex < questions!.length - 1 ? (
                          <Button
                            type="button"
                            className={PRESS}
                            onClick={() => {
                              setQDir(1);
                              setQIndex((i) => i + 1);
                            }}
                            disabled={!answered}
                          >
                            Next
                            <ArrowRight className="size-4" aria-hidden="true" />
                          </Button>
                        ) : (
                          <Button type="button" className={PRESS} onClick={submitDiagnostic} disabled={!answered || submitting}>
                            {submitting ? "Working out your start…" : "Finish"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {step === 4 && result ? (
                <section className="space-y-7">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">Your starting point</h1>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{result.summary}</p>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: TIMING.pageRise, ease: EASE_OUT, delay: 0.12 }}
                    className="rounded-lg border border-accent bg-accent-soft p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] sm:p-6"
                  >
                    <p className="text-sm text-muted">Start with</p>
                    <p className="mt-1 text-xl font-semibold leading-snug tracking-tight text-balance">{result.nextMission.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{result.nextMission.reason}</p>
                    <p className="mt-3 text-xs text-muted">
                      Module: {humanise(result.recommendedStartModuleId)} · Skill: {humanise(result.recommendedStartSkillId)}
                    </p>
                    <Button asChild size="lg" className={cn("mt-5 w-full sm:w-auto", PRESS)}>
                      <Link href={result.nextMission.href}>
                        Start
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  </motion.div>
                  {result.estimates.length > 0 ? (
                    <div>
                      <p className="text-sm font-medium">What the diagnostic saw</p>
                      <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface-raised">
                        {result.estimates.map((e, row) => (
                          <motion.li
                            key={e.skillId}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.36, ease: EASE_OUT, delay: 0.28 + Math.min(row, 10) * TIMING.stagger }}
                            className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                          >
                            <span className="min-w-0">{humanise(e.skillId)}</span>
                            <span className="flex shrink-0 items-center gap-3">
                              <span className="flex gap-1" aria-hidden="true">
                                {[1, 2, 3, 4].map((n) => (
                                  <span key={n} className="relative h-2 w-4 overflow-hidden rounded-sm bg-line">
                                    {n <= e.estimatedLevel ? (
                                      <motion.span
                                        className="absolute inset-0 origin-left bg-accent"
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: 1 }}
                                        transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.45 + Math.min(row, 10) * TIMING.stagger + n * 0.08 }}
                                      />
                                    ) : null}
                                  </span>
                                ))}
                              </span>
                              <span className="w-20 text-right font-mono text-xs tabular-nums text-muted">{LEVEL_LABEL[e.estimatedLevel]}</span>
                            </span>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </section>
              ) : null}
            </Pane>
          </AnimatePresence>

          {step < 3 ? (
            <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
              <Button
                type="button"
                variant="ghost"
                className={PRESS}
                onClick={() => {
                  setStepDir(-1);
                  setStep((s) => Math.max(0, s - 1));
                }}
                disabled={step === 0 || saving}
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back
              </Button>
              <Button type="button" className={PRESS} onClick={next} disabled={!canContinue || saving}>
                {saving ? "Saving…" : "Continue"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </MotionConfig>
  );
}

/** Press feedback for buttons (the shared Button only transitions colour). */
const PRESS = "transition-[background-color,border-color,color,opacity,scale] active:scale-[0.98] motion-reduce:active:scale-100";

/** Hover lift + press for selectable rows. */
const LIFT =
  "transition-[border-color,background-color,box-shadow,translate,scale] duration-200 ease-(--ease-out) hover:-translate-y-0.5 active:scale-[0.98] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100";

/** Selectable answer row: lifts on hover, presses in, and gains a second accent edge when chosen. */
const OPTION = cn("rounded-lg p-3.5 data-[state=checked]:shadow-[inset_0_0_0_1px_var(--accent)]", LIFT);

/** Position in a `stagger-in` list. */
function order(i: number): CSSProperties {
  return { "--i": i } as CSSProperties;
}

const paneVariants: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 28 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.34, ease: EASE_OUT } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -18, transition: { duration: 0.14, ease: EASE_OUT } }),
};

/**
 * One step or one question. Slides in from the direction of travel. While it is
 * leaving it is inert and hidden from assistive tech, so only the incoming
 * panel can be read or clicked.
 */
function Pane({ dir, className, children }: { dir: number; className?: string; children: ReactNode }) {
  const present = useIsPresent();
  return (
    <motion.div
      custom={dir}
      variants={paneVariants}
      initial="enter"
      animate="center"
      exit="exit"
      inert={!present}
      aria-hidden={present ? undefined : true}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const LEVEL_LABEL: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "unknown",
  1: "starting",
  2: "developing",
  3: "solid",
  4: "strong",
};
