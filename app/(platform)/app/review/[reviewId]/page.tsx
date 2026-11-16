import type { Metadata } from "next";
import Link from "next/link";
import type { LearningPathResponse, ProgressReviewsResponse } from "@/lib/types/api";
import { EmptyState, PageHeader } from "@/components/ui";
import { ReviewFlow } from "@/components/review/review-flow";
import { RetryError } from "@/components/shared/retry-error";
import { load } from "@/lib/client/server-api";
import { describeError } from "@/lib/client/api";

export const metadata: Metadata = { title: "Review" };

/** Retention review: one knowledge check for the review's skill, graded via /api/learning/review. */
export default async function ReviewPage(props: PageProps<"/app/review/[reviewId]">) {
  const { reviewId } = await props.params;
  const [reviews, path] = await Promise.all([
    load<ProgressReviewsResponse>("/api/progress/reviews"),
    load<LearningPathResponse>("/api/learning/path"),
  ]);

  if (!reviews.ok || !path.ok) {
    return (
      <div className="space-y-6">
        <PageHeader title="Review" />
        <RetryError title="Could not load this review" description={describeError(reviews.ok ? path.ok ? null : path.error : reviews.error)} />
      </div>
    );
  }

  const review = reviews.data.find((r) => r.id === reviewId);
  if (!review) {
    return (
      <div className="space-y-6">
        <PageHeader title="Review" />
        <EmptyState
          title="This review is not on your list"
          description="It may have been completed already, or the link is old."
          action={
            <Link href="/app/progress" className="text-sm text-accent underline-offset-4 hover:underline">
              See your review schedule
            </Link>
          }
        />
      </div>
    );
  }

  const skillProgress = path.data.skills.find((s) => s.skill.id === review.skillId);
  const skill = skillProgress?.skill ?? path.data.curriculum.skills.find((s) => s.id === review.skillId);
  const checks = path.data.curriculum.modules
    .flatMap((m) => m.knowledgeChecks)
    .filter((c) => c.skillId === review.skillId);

  if (!skill || checks.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Review" />
        <EmptyState
          title="No check available for this skill"
          description={`The curriculum has no knowledge check for "${review.skillId}" yet.`}
          action={
            <Link href={`/app/coach?skill=${encodeURIComponent(review.skillId)}`} className="text-sm text-accent underline-offset-4 hover:underline">
              Review it with the coach instead
            </Link>
          }
        />
      </div>
    );
  }

  // Deterministic pick so a refresh shows the same question for the same review.
  const index = hash(review.id) % checks.length;
  const check = checks[index];

  if (review.completedAt) {
    return (
      <div className="space-y-6">
        <PageHeader title="Review" />
        <EmptyState
          title="Already completed"
          description={`You ${review.result === "passed" ? "passed" : "did not pass"} this review.`}
          action={
            <Link href="/app" className="text-sm text-accent underline-offset-4 hover:underline">
              Back to overview
            </Link>
          }
        />
      </div>
    );
  }

  return <ReviewFlow review={review} skill={skill} check={check} previousMastery={skillProgress?.mastery ?? null} />;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
