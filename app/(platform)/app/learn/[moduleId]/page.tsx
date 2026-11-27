import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, ChevronDown, FlaskConical, Lightbulb, MessageSquare } from "lucide-react";
import type { LearningPathResponse } from "@/lib/types/api";
import { Badge, Button, MasteryIndicator, PageHeader } from "@/components/ui";
import { LessonText } from "@/components/learn/lesson-text";
import { KnowledgeCheck } from "@/components/learn/knowledge-check";
import { RetryError } from "@/components/shared/retry-error";
import { load } from "@/lib/client/server-api";
import { describeError } from "@/lib/client/api";

export const metadata: Metadata = { title: "Lesson" };

export default async function LessonPage(props: PageProps<"/app/learn/[moduleId]">) {
  const { moduleId } = await props.params;
  const sp = await props.searchParams;
  const focusSkill = typeof sp.skill === "string" ? sp.skill : undefined;

  const res = await load<LearningPathResponse>("/api/learning/path");
  if (!res.ok) {
    return (
      <div className="space-y-6">
        <PageHeader title="Lesson" />
        <RetryError title="Could not load this lesson" description={describeError(res.error)} />
      </div>
    );
  }
  const path = res.data;
  const entry = path.modules.find((m) => m.module.id === moduleId);
  if (!entry) notFound();
  const { module, unlocked } = entry;
  const skills = module.skillIds
    .map((id) => path.skills.find((s) => s.skill.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  const practiceSkill = focusSkill && module.skillIds.includes(focusSkill) ? focusSkill : (module.skillIds[0] ?? module.id);
  const checks = focusSkill
    ? module.knowledgeChecks.filter((c) => c.skillId === focusSkill)
    : module.knowledgeChecks;
  const checksToShow = checks.length > 0 ? checks : module.knowledgeChecks;

  const coachHref = `/app/coach?skill=${encodeURIComponent(practiceSkill)}`;
  const labHref = `/app/scenario-lab?skill=${encodeURIComponent(practiceSkill)}`;

  return (
    <div className="space-y-10">
      <header className="animate-rise-in flex flex-col gap-5 border-b border-line pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/app/learn" className="text-xs text-muted underline-offset-4 hover:underline">
              My learning
            </Link>
            <span className="text-xs text-subtle">/ Module {module.sequence}</span>
            {!unlocked ? <Badge tone="warning">Practice locked until prerequisites are at practising level</Badge> : null}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-fg text-balance sm:text-4xl">{module.title}</h1>
          <p className="max-w-[var(--prose-max)] text-base leading-relaxed text-muted text-pretty sm:text-lg">{module.summary}</p>
          <p className="text-xs text-subtle">
            {module.concepts.length} concept{module.concepts.length === 1 ? "" : "s"} · {skills.length} skill
            {skills.length === 1 ? "" : "s"} · {checksToShow.length} check{checksToShow.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:hidden">
          <Button asChild variant="secondary" size="sm">
            <Link href={coachHref}>
              <MessageSquare className="size-4" aria-hidden="true" />
              Open the coach on this skill
            </Link>
          </Button>
          <Button asChild size="sm" disabled={!unlocked}>
            <Link href={labHref} aria-disabled={!unlocked}>
              <FlaskConical className="size-4" aria-hidden="true" />
              Practise this in the Scenario lab
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-12">
        <article className="stagger-in max-w-[var(--prose-max)] space-y-10">
          <section className="rounded-lg border border-learner-line bg-learner p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-fg">What you will be able to do</h2>
            <ul className="mt-3 space-y-2.5 text-[0.9375rem] leading-relaxed">
              {module.learningObjectives.map((o, i) => (
                <li key={i} className="flex gap-3">
                  <Check className="mt-1 size-4 shrink-0 text-learner-fg" aria-hidden="true" />
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="space-y-4" style={{ "--i": 1 } as React.CSSProperties}>
            {module.concepts.map((c, i) => (
              <details
                key={i}
                open={i < 2}
                className="group rounded-lg border border-line bg-surface shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] transition-colors duration-200 open:border-line-strong hover:border-line-strong"
              >
                <summary className="flex cursor-pointer list-none items-center gap-4 rounded-lg px-4 py-4 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-6 [&::-webkit-details-marker]:hidden">
                  <span className="tabular flex size-9 shrink-0 items-center justify-center rounded-md border border-line bg-surface-sunken font-mono text-sm font-semibold text-muted transition-colors duration-200 group-open:border-accent/45 group-open:bg-accent-soft group-open:text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 text-lg font-semibold leading-snug text-fg text-balance sm:text-xl">{c.heading}</span>
                  <span className="text-xs font-normal text-muted group-open:hidden">Show</span>
                  <ChevronDown
                    className="size-4 shrink-0 text-subtle transition-transform duration-200 group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <div className="animate-fade-in border-t border-line px-4 py-5 sm:px-6 sm:py-6">
                  <LessonText text={c.body} />
                  {c.example ? (
                    <div className="mt-6 rounded-lg border border-evidence-line bg-evidence p-4 sm:p-5">
                      <p className="flex items-center gap-2 text-sm font-semibold text-evidence-fg">
                        <Lightbulb className="size-4" aria-hidden="true" />
                        Example
                      </p>
                      <LessonText text={c.example} className="mt-2" />
                    </div>
                  ) : null}
                </div>
              </details>
            ))}
          </div>

          {checksToShow.length > 0 ? (
            <section className="space-y-4" style={{ "--i": 2 } as React.CSSProperties}>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-fg">Check yourself</h2>
                <p className="mt-1 text-sm text-muted">Pick one answer. The explanation shows straight away.</p>
              </div>
              {checksToShow.map((check) => (
                <KnowledgeCheck key={check.id} check={check} title={skills.find((s) => s.skill.id === check.skillId)?.skill.name ?? "Quick check"} />
              ))}
            </section>
          ) : null}

          {module.rubricNotes ? (
            <section className="rounded-lg border border-line bg-surface-sunken p-5" style={{ "--i": 3 } as React.CSSProperties}>
              <h2 className="text-base font-semibold text-fg">How answers are graded here</h2>
              <LessonText text={module.rubricNotes} className="mt-2 text-sm leading-relaxed text-muted sm:text-sm sm:leading-relaxed" />
            </section>
          ) : null}

          <div className="space-y-4 border-t border-line pt-8" style={{ "--i": 4 } as React.CSSProperties}>
            <div className="flex flex-wrap gap-3">
              <Button asChild disabled={!unlocked}>
                <Link href={labHref}>
                  Practise this in the Scenario lab
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href={coachHref}>Open the coach on this skill</Link>
              </Button>
            </div>
            <p className="text-sm text-muted">After this: {module.recommendedNext}</p>
          </div>
        </article>

        <aside className="animate-rise-in space-y-4 lg:sticky lg:top-8 lg:self-start">
          <div className="hidden space-y-2 rounded-lg border border-line bg-surface p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] lg:block">
            <Button asChild className="w-full justify-start" disabled={!unlocked}>
              <Link href={labHref} aria-disabled={!unlocked}>
                <FlaskConical className="size-4" aria-hidden="true" />
                Practise this in the Scenario lab
              </Link>
            </Button>
            <Button asChild variant="secondary" className="w-full justify-start">
              <Link href={coachHref}>
                <MessageSquare className="size-4" aria-hidden="true" />
                Open the coach on this skill
              </Link>
            </Button>
          </div>
          <div className="rounded-lg border border-line bg-surface shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]">
            <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-fg">Skills in this module</h2>
            <ul className="p-1.5">
              {skills.map((s) => {
                const active = s.skill.id === focusSkill;
                return (
                  <li key={s.skill.id} className={active ? "rounded-md bg-accent-soft px-2.5 py-2.5" : "rounded-md px-2.5 py-2.5 transition-colors duration-150 hover:bg-surface-raised"}>
                    <Link
                      href={`/app/learn/${encodeURIComponent(module.id)}?skill=${encodeURIComponent(s.skill.id)}`}
                      className={active ? "text-sm font-medium text-accent" : "text-sm"}
                      aria-current={active ? "true" : undefined}
                    >
                      {s.skill.name}
                    </Link>
                    <div className="mt-1.5">
                      <MasteryIndicator status={s.mastery?.masteryStatus ?? "not-started"} score={s.mastery?.masteryScore} size="sm" />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
