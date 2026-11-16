"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { DiagnosticAnswer, DiagnosticQuestion, ExperienceLevel, LearningGoal, LearningStyle, Profile } from "@/lib/types/learning";
import type { DiagnosticSubmitResponse, ProfileUpsertRequest } from "@/lib/types/api";
import { Button, ErrorState, Input, Label, RadioCard, RadioGroup, Skeleton, Textarea } from "@/components/ui";
import { CATEGORIES, EXPERIENCE, GOALS, STYLES } from "@/lib/client/labels";
import { apiGet, apiPost, apiPut, describeError } from "@/lib/client/api";
import { humanise } from "@/lib/client/format";
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
    <div className="mx-auto max-w-xl">
      <ol className="flex items-center gap-2 text-xs text-muted" aria-label="Steps">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full border font-mono tabular-nums transition-colors duration-200",
                i < step && "border-accent bg-accent text-accent-fg",
                i === step && "border-accent text-accent",
                i > step && "border-line",
              )}
              aria-current={i === step ? "step" : undefined}
            >
              {i + 1}
            </span>
            <span className={cn("hidden sm:inline", i === step && "text-fg")}>{label}</span>
            {i < STEPS.length - 1 ? <span className="h-px w-4 bg-line sm:w-6" aria-hidden="true" /> : null}
          </li>
        ))}
      </ol>

      <div key={step} className="step-panel mt-8">
        {step === 0 ? (
          <section className="space-y-5">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">What do you want to get better at?</h1>
              <p className="mt-1 text-sm text-muted">This shapes which module you start with and which examples you see.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={nameId}>Your name</Label>
              <Input id={nameId} value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="given-name" placeholder="How the coach addresses you" />
            </div>
            <RadioGroup value={goal ?? ""} onValueChange={(v) => setGoal(v as LearningGoal)} aria-label="Goal" className="grid gap-2">
              {GOALS.map((g) => (
                <RadioCard key={g.id} value={g.id} title={g.label} description={g.hint} />
              ))}
            </RadioGroup>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="space-y-5">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">How much have you done before?</h1>
              <p className="mt-1 text-sm text-muted">Honest answers mean fewer boring exercises. The diagnostic will check anyway.</p>
            </div>
            <RadioGroup value={experience ?? ""} onValueChange={(v) => setExperience(v as ExperienceLevel)} aria-label="Experience" className="grid gap-2">
              {EXPERIENCE.map((x) => (
                <RadioCard key={x.id} value={x.id} title={x.label} description={x.hint} />
              ))}
            </RadioGroup>
            <div>
              <p className="text-sm font-medium">How should explanations read?</p>
              <RadioGroup value={style} onValueChange={(v) => setStyle(v as LearningStyle)} aria-label="Explanation style" className="mt-2 grid gap-2 sm:grid-cols-3">
                {STYLES.map((s) => (
                  <RadioCard key={s.id} value={s.id} title={s.label} description={s.hint} />
                ))}
              </RadioGroup>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-5">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Which areas interest you?</h1>
              <p className="mt-1 text-sm text-muted">Pick at least one. You can still learn everything else.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Interests">
              {CATEGORIES.map((c) => {
                const on = interests.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setInterests((cur) => (on ? cur.filter((x) => x !== c.id) : [...cur, c.id]))}
                    className={cn(
                      "rounded-md border px-3 py-2.5 text-left transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      on ? "border-accent bg-accent-soft" : "border-line hover:bg-surface-raised",
                    )}
                  >
                    <span className="block text-sm font-medium">{c.label}</span>
                    <span className="block text-xs text-muted">{c.hint}</span>
                  </button>
                );
              })}
            </div>
            {saveError ? (
              <p role="alert" className="rounded-md border border-danger bg-danger-soft p-3 text-sm">
                {saveError}
              </p>
            ) : null}
          </section>
        ) : null}

        {step === 3 ? (
          <section className="space-y-5">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">A quick diagnostic</h1>
              <p className="mt-1 text-sm text-muted">
                {questions ? `${questions.length} questions, one at a time. There is no pass mark; it only sets your starting point.` : "Loading questions."}
              </p>
            </div>
            {qLoading ? (
              <div className="space-y-3" aria-busy="true">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-11" />
                <Skeleton className="h-11" />
                <Skeleton className="h-11" />
              </div>
            ) : qError ? (
              <ErrorState title="Could not load the diagnostic" description={describeError(qError)} retry={loadQuestions} />
            ) : questions && questions.length === 0 ? (
              <ErrorState title="No diagnostic questions" description="The question bank came back empty." retry={loadQuestions} />
            ) : current ? (
              <div key={current.id} className="step-panel space-y-4">
                <p className="text-xs text-muted">
                  Question {qIndex + 1} of {questions!.length} · {humanise(current.skillId)}
                </p>
                <p className="text-base font-medium leading-snug">{current.prompt}</p>
                {current.kind === "choice" && current.options ? (
                  <RadioGroup
                    value={currentAnswer}
                    onValueChange={(v) => setAnswers((a) => ({ ...a, [current.id]: v }))}
                    aria-label="Answer"
                    className="grid gap-2"
                  >
                    {current.options.map((o) => (
                      <RadioCard key={o.id} value={o.id} title={o.text} />
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
                {submitError ? (
                  <p role="alert" className="rounded-md border border-danger bg-danger-soft p-3 text-sm">
                    {submitError}
                  </p>
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <Button type="button" variant="ghost" onClick={() => setQIndex((i) => Math.max(0, i - 1))} disabled={qIndex === 0 || submitting}>
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Back
                  </Button>
                  {qIndex < questions!.length - 1 ? (
                    <Button type="button" onClick={() => setQIndex((i) => i + 1)} disabled={!answered}>
                      Next
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Button>
                  ) : (
                    <Button type="button" onClick={submitDiagnostic} disabled={!answered || submitting}>
                      {submitting ? "Working out your start…" : "Finish"}
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {step === 4 && result ? (
          <section className="space-y-5">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Your starting point</h1>
              <p className="mt-1 text-sm leading-relaxed text-muted">{result.summary}</p>
            </div>
            <div className="rounded-md border border-accent bg-accent-soft p-4">
              <p className="text-xs text-muted">Start with</p>
              <p className="mt-0.5 text-base font-medium">{result.nextMission.title}</p>
              <p className="mt-1 text-sm text-muted">{result.nextMission.reason}</p>
              <p className="mt-2 text-xs text-muted">
                Module: {humanise(result.recommendedStartModuleId)} · Skill: {humanise(result.recommendedStartSkillId)}
              </p>
            </div>
            {result.estimates.length > 0 ? (
              <div>
                <p className="text-sm font-medium">What the diagnostic saw</p>
                <ul className="mt-2 divide-y divide-line rounded-md border border-line">
                  {result.estimates.map((e) => (
                    <li key={e.skillId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span>{humanise(e.skillId)}</span>
                      <span className="flex items-center gap-2">
                        <span className="flex gap-0.5" aria-hidden="true">
                          {[1, 2, 3, 4].map((n) => (
                            <span key={n} className={cn("h-2 w-3 rounded-sm", n <= e.estimatedLevel ? "bg-accent" : "bg-line")} />
                          ))}
                        </span>
                        <span className="font-mono text-xs tabular-nums text-muted">{LEVEL_LABEL[e.estimatedLevel]}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <Button asChild size="lg">
              <Link href={result.nextMission.href}>
                Start
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </section>
        ) : null}
      </div>

      {step < 3 ? (
        <div className="mt-8 flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || saving}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </Button>
          <Button type="button" onClick={next} disabled={!canContinue || saving}>
            {saving ? "Saving…" : "Continue"}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

const LEVEL_LABEL: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "unknown",
  1: "starting",
  2: "developing",
  3: "solid",
  4: "strong",
};
