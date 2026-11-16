import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, FlaskConical, MessageSquare } from "lucide-react";
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

  return (
    <div className="space-y-8">
      <PageHeader
        title={module.title}
        description={module.summary}
        meta={
          <>
            <Link href="/app/learn" className="text-xs text-muted underline-offset-4 hover:underline">
              My learning
            </Link>
            <span className="text-xs text-subtle">/ Module {module.sequence}</span>
            {!unlocked ? <Badge tone="warning">Practice locked until prerequisites are at practising level</Badge> : null}
          </>
        }
        actions={
          <>
            <Button asChild variant="secondary" size="sm">
              <Link href={`/app/coach?skill=${encodeURIComponent(practiceSkill)}`}>
                <MessageSquare className="size-4" aria-hidden="true" />
                Open the coach on this skill
              </Link>
            </Button>
            <Button asChild size="sm" disabled={!unlocked}>
              <Link href={`/app/scenario-lab?skill=${encodeURIComponent(practiceSkill)}`} aria-disabled={!unlocked}>
                <FlaskConical className="size-4" aria-hidden="true" />
                Practise this in the Scenario lab
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <article className="max-w-[var(--prose-max)] space-y-8">
          <section>
            <h2 className="text-base font-semibold">What you will be able to do</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">
              {module.learningObjectives.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </section>

          {module.concepts.map((c, i) => (
            <details key={i} open={i < 2} className="group rounded-lg border border-line bg-surface">
              <summary className="cursor-pointer list-none px-4 py-3 text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="mr-2 font-mono text-xs text-subtle">{i + 1}</span>
                {c.heading}
                <span className="float-right text-xs font-normal text-muted group-open:hidden">Show</span>
              </summary>
              <div className="border-t border-line px-4 py-4">
                <LessonText text={c.body} />
                {c.example ? (
                  <div className="mt-4 rounded-md border border-evidence-line bg-evidence p-3">
                    <p className="text-xs text-evidence-fg">Example</p>
                    <LessonText text={c.example} className="mt-1" />
                  </div>
                ) : null}
              </div>
            </details>
          ))}

          {checksToShow.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-base font-semibold">Check yourself</h2>
              {checksToShow.map((check) => (
                <KnowledgeCheck key={check.id} check={check} title={skills.find((s) => s.skill.id === check.skillId)?.skill.name ?? "Quick check"} />
              ))}
            </section>
          ) : null}

          {module.rubricNotes ? (
            <section>
              <h2 className="text-base font-semibold">How answers are graded here</h2>
              <LessonText text={module.rubricNotes} className="mt-2 text-muted" />
            </section>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button asChild disabled={!unlocked}>
              <Link href={`/app/scenario-lab?skill=${encodeURIComponent(practiceSkill)}`}>
                Practise this in the Scenario lab
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/app/coach?skill=${encodeURIComponent(practiceSkill)}`}>Open the coach on this skill</Link>
            </Button>
          </div>
          <p className="text-sm text-muted">After this: {module.recommendedNext}</p>
        </article>

        <aside className="space-y-3 lg:sticky lg:top-8 lg:self-start">
          <h2 className="text-sm font-semibold">Skills in this module</h2>
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {skills.map((s) => (
              <li key={s.skill.id} className="px-3 py-2.5">
                <Link
                  href={`/app/learn/${encodeURIComponent(module.id)}?skill=${encodeURIComponent(s.skill.id)}`}
                  className={s.skill.id === focusSkill ? "text-sm font-medium" : "text-sm"}
                  aria-current={s.skill.id === focusSkill ? "true" : undefined}
                >
                  {s.skill.name}
                </Link>
                <div className="mt-1">
                  <MasteryIndicator status={s.mastery?.masteryStatus ?? "not-started"} score={s.mastery?.masteryScore} size="sm" />
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
